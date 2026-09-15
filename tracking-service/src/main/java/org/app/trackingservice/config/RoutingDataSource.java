package org.app.trackingservice.config;


import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import javax.sql.DataSource;

@Slf4j
public class RoutingDataSource extends AbstractRoutingDataSource {
    @Override
    protected @Nullable Object determineCurrentLookupKey() {

        DBType manualType = DataSourceContextHolder.get();
        //Kiểm tra nếu luồng hiện tại được ép chỉ định (dùng choConsumer ngầm ghi sang Replica)
        if (manualType != null) {
            return manualType;
        }

        boolean isReadOnly = TransactionSynchronizationManager.isCurrentTransactionReadOnly();
        if (isReadOnly) {
            log.info(">>> [DATABASE ROUTING] SELECT (Read-only) ĐIỀU HƯỚNG TỚI REPLICA (Port 2433)");
            return DBType.REPLICA;
        } else {
            log.info(">>> [DATABASE ROUTING] WRITE (Read-Write) ĐIỀU HƯỚNG TỚI PRIMARY (Port 1433)");
            return DBType.PRIMARY;
        }
    }
}
