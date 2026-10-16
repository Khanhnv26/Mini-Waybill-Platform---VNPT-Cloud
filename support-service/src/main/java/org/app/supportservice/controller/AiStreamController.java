package org.app.supportservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.supportservice.ai.benchmark.OllamaBenchmarkService;
import org.app.supportservice.ai.service.AiAssistantService;
import org.app.supportservice.dto.request.AiChatRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/support/ai")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AiStreamController {

    private final AiAssistantService aiAssistantService;
    private final OllamaBenchmarkService ollamaBenchmarkService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamGet(
            @RequestParam("message") String message,
            @RequestParam(value = "sessionId", required = false) String sessionId) {
        return aiAssistantService.streamChat(message, sessionId);
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamPost(@Valid @RequestBody AiChatRequest request) {
        return aiAssistantService.streamChat(request.getMessage(), request.getSessionId());
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> resetSession(
            @RequestParam(value = "sessionId", required = false) String sessionId) {
        aiAssistantService.clearSession(sessionId);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Đã xóa lịch sử ngữ cảnh hội thoại",
                "sessionId", sessionId != null ? sessionId : "default-session"
        ));
    }

    @GetMapping("/benchmark")
    public ResponseEntity<OllamaBenchmarkService.BenchmarkResult> benchmark(
            @RequestParam(value = "prompt", required = false) String prompt) {
        OllamaBenchmarkService.BenchmarkResult result = ollamaBenchmarkService.runBenchmark(prompt);
        return ResponseEntity.ok(result);
    }
}
