package org.app.supportservice.service;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.internal.parser.ParsingContext;
import org.flywaydb.core.internal.resource.StringResource;
import org.flywaydb.database.sqlserver.SQLServerParser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class ChatSqlServerMigrationTest {
    private String migration() throws Exception {
        return Files.readString(Path.of("src/main/resources/db/migration/V4__chat_delivery_and_read_state.sql"));
    }

    private List<String> batches(String sql) {
        var parser = new SQLServerParser(Flyway.configure(), new ParsingContext());
        List<String> batches = new ArrayList<>();
        try (var statements = parser.parse(new StringResource(sql))) {
            while (statements.hasNext()) batches.add(statements.next().getSql());
        }
        return batches;
    }

    @Test void flywayMustFinishAddingColumnsBeforeCompilingTheirIndexes() throws Exception {
        List<String> batches = batches(migration());
        assertTrue(batches.size() >= 2, "SQL Server compiles a whole batch at once: ALTER ADD and indexes using the new columns need a GO boundary");
        assertTrue(batches.getFirst().contains("ALTER TABLE ticket_messages ADD"));
        assertFalse(batches.getFirst().contains("CREATE UNIQUE INDEX"));
        assertTrue(batches.stream().skip(1).anyMatch(sql -> sql.contains("CREATE UNIQUE INDEX UX_chat_client_message")));
    }

    @Test @EnabledIfSystemProperty(named = "chat.sqlserver.migration-test", matches = "true")
    void migrationExecutesOnSqlServerUsingOnlyConnectionScopedTemporaryTables() throws Exception {
        Properties config = new Properties();
        try (var input = Files.newInputStream(Path.of("src/main/resources/application.properties"))) { config.load(input); }
        String url = System.getenv().getOrDefault("CHAT_SQLSERVER_TEST_URL", config.getProperty("spring.datasource.url"));
        String user = System.getenv().getOrDefault("CHAT_SQLSERVER_TEST_USER", config.getProperty("spring.datasource.username"));
        String password = System.getenv().getOrDefault("CHAT_SQLSERVER_TEST_PASSWORD", config.getProperty("spring.datasource.password"));
        String sql = migration().replaceAll("\\bticket_messages\\b", "#ticket_messages")
                .replaceAll("\\bsupport_chat_read_state\\b", "#support_chat_read_state")
                .replaceAll("\\bsupport_tickets\\b", "#support_tickets");
        // A single session owns all #tables; closing it removes them. Never run Flyway migrate/repair on the user's database here.
        try (Connection connection = DriverManager.getConnection(url, user, password);
             Statement statement = connection.createStatement()) {
            statement.setQueryTimeout(10);
            statement.execute("CREATE TABLE #support_tickets (id BIGINT NOT NULL PRIMARY KEY)");
            statement.execute("CREATE TABLE #ticket_messages (id BIGINT NOT NULL PRIMARY KEY, ticket_id BIGINT NOT NULL)");
            for (String batch : batches(sql)) statement.execute(batch);
            statement.executeQuery("SELECT client_message_id, sender_key, audience_key FROM #ticket_messages").close();
            statement.executeQuery("SELECT reader_key, last_read_message_id, notification_read_message_id FROM #support_chat_read_state").close();
            statement.execute("INSERT INTO #ticket_messages (id,ticket_id,client_message_id) VALUES (1,7,'client_duplicate_test')");
            SQLException duplicate = assertThrows(SQLException.class, () -> statement.execute(
                    "INSERT INTO #ticket_messages (id,ticket_id,client_message_id) VALUES (2,7,'client_duplicate_test')"));
            assertTrue(duplicate.getErrorCode() == 2601 || duplicate.getErrorCode() == 2627);
            statement.execute("INSERT INTO #ticket_messages (id,ticket_id) VALUES (3,7),(4,7)");
        }
    }
}
