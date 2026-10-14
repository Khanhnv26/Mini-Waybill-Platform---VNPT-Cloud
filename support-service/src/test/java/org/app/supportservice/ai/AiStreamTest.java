package org.app.supportservice.ai;

import org.app.supportservice.ai.benchmark.OllamaBenchmarkService;
import org.app.supportservice.ai.service.AiAssistantService;
import org.app.supportservice.ai.tools.PostalAiTools;
import org.app.supportservice.controller.AiStreamController;
import org.app.supportservice.dto.request.AiChatRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.InMemoryChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.http.ResponseEntity;
import reactor.core.publisher.Flux;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiStreamTest {

    @Mock
    private AiAssistantService aiAssistantService;

    @Mock
    private OllamaBenchmarkService ollamaBenchmarkService;

    @Test
    void testResetSessionController() {
        AiStreamController controller = new AiStreamController(aiAssistantService, ollamaBenchmarkService);
        ResponseEntity<Map<String, Object>> response = controller.resetSession("test-session-123");

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("SUCCESS", response.getBody().get("status"));
        assertEquals("test-session-123", response.getBody().get("sessionId"));
        verify(aiAssistantService).clearSession("test-session-123");
    }

    @Test
    void testBenchmarkController() {
        OllamaBenchmarkService.BenchmarkResult mockResult = new OllamaBenchmarkService.BenchmarkResult(
                "Test prompt", 120, 850, 45, 52.94, "Sample response", "SUCCESS"
        );
        when(ollamaBenchmarkService.runBenchmark("Test prompt")).thenReturn(mockResult);

        AiStreamController controller = new AiStreamController(aiAssistantService, ollamaBenchmarkService);
        ResponseEntity<OllamaBenchmarkService.BenchmarkResult> response = controller.benchmark("Test prompt");

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(120, response.getBody().timeToFirstTokenMs());
        assertEquals(45, response.getBody().tokenCount());
        assertEquals(52.94, response.getBody().tokensPerSecond());
        assertEquals("SUCCESS", response.getBody().status());
    }

    @Test
    void testStreamControllerDelegation() {
        when(aiAssistantService.streamChat("Xin chào", "sid-1")).thenReturn(Flux.just("Xin ", "chào!"));

        AiStreamController controller = new AiStreamController(aiAssistantService, ollamaBenchmarkService);
        Flux<String> streamGet = controller.streamGet("Xin chào", "sid-1");
        assertEquals("Xin chào!", streamGet.reduce(String::concat).block());

        AiChatRequest request = new AiChatRequest("Xin chào", "sid-1");
        Flux<String> streamPost = controller.streamPost(request);
        assertEquals("Xin chào!", streamPost.reduce(String::concat).block());
    }

    @Test
    void testChatMemorySlidingWindow() {
        ChatMemory memory = MessageWindowChatMemory.builder()
                .chatMemoryRepository(new InMemoryChatMemoryRepository())
                .maxMessages(4)
                .build();

        memory.add("s1", new org.springframework.ai.chat.messages.UserMessage("Msg 1"));
        memory.add("s1", new org.springframework.ai.chat.messages.AssistantMessage("Reply 1"));
        memory.add("s1", new org.springframework.ai.chat.messages.UserMessage("Msg 2"));
        memory.add("s1", new org.springframework.ai.chat.messages.AssistantMessage("Reply 2"));
        assertEquals(4, memory.get("s1").size());

        // Add 5th message -> window slides to max 4 messages
        memory.add("s1", new org.springframework.ai.chat.messages.UserMessage("Msg 3"));
        assertTrue(memory.get("s1").size() <= 4);
        assertFalse(memory.get("s1").isEmpty());

        // Clear session
        memory.clear("s1");
        assertEquals(0, memory.get("s1").size());
    }
}
