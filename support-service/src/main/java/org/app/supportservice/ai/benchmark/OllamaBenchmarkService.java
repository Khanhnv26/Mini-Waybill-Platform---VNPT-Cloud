package org.app.supportservice.ai.benchmark;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

@Slf4j
@Service
public class OllamaBenchmarkService {

    public record BenchmarkResult(
            String prompt,
            long timeToFirstTokenMs,
            long totalLatencyMs,
            int tokenCount,
            double tokensPerSecond,
            String sampleResponse,
            String status
    ) {}

    private final ChatClient rawChatClient;

    public OllamaBenchmarkService(ChatClient.Builder chatClientBuilder) {
        // Build a lightweight raw chat client without complex system prompts or tools for pure inference benchmarking
        this.rawChatClient = chatClientBuilder.build();
    }

    public BenchmarkResult runBenchmark(String testPrompt) {
        String prompt = (testPrompt != null && !testPrompt.isBlank()) 
                ? testPrompt 
                : "Giới thiệu ngắn gọn 1 câu về dịch vụ bưu chính VNPT Post.";

        log.info("[Ollama Benchmark] Bắt đầu benchmark suy luận với prompt: '{}'", prompt);

        long startTime = System.currentTimeMillis();
        AtomicLong firstTokenTime = new AtomicLong(0);
        AtomicInteger tokenCount = new AtomicInteger(0);
        StringBuilder responseBuilder = new StringBuilder();
        AtomicReference<String> errorRef = new AtomicReference<>(null);

        try {
            Flux<String> stream = rawChatClient.prompt()
                    .user(prompt)
                    .stream()
                    .content();

            stream.doOnNext(chunk -> {
                if (firstTokenTime.compareAndSet(0, System.currentTimeMillis())) {
                    long ttft = firstTokenTime.get() - startTime;
                    log.info("[Ollama Benchmark] TTFT (Time to First Token): {} ms", ttft);
                }
                tokenCount.incrementAndGet();
                responseBuilder.append(chunk);
            }).doOnError(err -> {
                log.error("[Ollama Benchmark] Lỗi stream benchmark: {}", err.getMessage());
                errorRef.set(err.getMessage());
            }).blockLast();

            long totalLatency = System.currentTimeMillis() - startTime;
            long ttft = firstTokenTime.get() > 0 ? (firstTokenTime.get() - startTime) : totalLatency;
            int tokens = tokenCount.get();
            double seconds = totalLatency > 0 ? (totalLatency / 1000.0) : 0.001;
            double tps = tokens > 0 ? (tokens / seconds) : 0.0;

            String status = errorRef.get() == null ? "SUCCESS" : "ERROR: " + errorRef.get();

            log.info("[Ollama Benchmark] Hoàn tất: TTFT={}ms, Total={}ms, Tokens={}, Speed={:.2f} tok/s",
                    ttft, totalLatency, tokens, tps);

            return new BenchmarkResult(
                    prompt,
                    ttft,
                    totalLatency,
                    tokens,
                    Math.round(tps * 100.0) / 100.0,
                    responseBuilder.toString().trim(),
                    status
            );
        } catch (Exception e) {
            long totalLatency = System.currentTimeMillis() - startTime;
            log.error("[Ollama Benchmark] Ngoại lệ benchmark: {}", e.getMessage(), e);
            return new BenchmarkResult(
                    prompt,
                    0,
                    totalLatency,
                    0,
                    0.0,
                    "",
                    "FAILED: " + e.getMessage()
            );
        }
    }
}
