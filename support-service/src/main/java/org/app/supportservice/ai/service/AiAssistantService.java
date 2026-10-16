package org.app.supportservice.ai.service;

import lombok.extern.slf4j.Slf4j;
import org.app.supportservice.ai.tools.PostalAiTools;
import org.app.supportservice.exception.AiUnavailableException;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.InMemoryChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
public class AiAssistantService {

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;

    @Autowired
    public AiAssistantService(ChatClient.Builder chatClientBuilder, PostalAiTools postalTools, @Autowired(required = false) ChatMemory chatMemory) {
        this.chatMemory = chatMemory != null ? chatMemory : MessageWindowChatMemory.builder()
                .chatMemoryRepository(new InMemoryChatMemoryRepository())
                .maxMessages(10)
                .build();

        this.chatClient = chatClientBuilder.defaultSystem(
                """
                        Bạn là "Trợ lý ảo Waybill" – Trợ lý chăm sóc khách hàng bưu chính chuyên nghiệp.

                        Nhiệm vụ:
                        1. Hỗ trợ tra cứu mã vận đơn, hành trình bưu kiện.
                        2. Tra cứu tiến độ khiếu nại theo mã ticket.
                        3. Tư vấn và tính cước phí dịch vụ chuyển phát.

                        Quy tắc phản hồi:
                        - Luôn trả lời ngắn gọn, súc tích, đi thẳng vào trọng tâm, không viết dài dòng.
                        - Tuyệt đối KHÔNG dùng biểu tượng cảm xúc (emoji).
                        - Tuyệt đối KHÔNG nhắc đến tên hàm, tool gọi hay chi tiết kỹ thuật hệ thống.
                        - Tự động gọi tool khi khách hỏi về vận đơn, mã phiếu TKT- hoặc tính cước.
                        - Khi tool báo không tìm thấy hoặc hệ thống đang bận, nói đúng nội dung đó. Không bịa vị trí, giờ phát, tên bưu tá, số điện thoại hay số tiền.
                        - Cước chỉ lấy từ tool tính cước. Thiếu tỉnh gửi hoặc tỉnh nhận thì hỏi lại, không ước tính.
                        - Định dạng câu trả lời rõ ràng (in đậm, gạch đầu dòng ngắn).
                        """
        )
        .defaultTools(postalTools)
        .defaultAdvisors(MessageChatMemoryAdvisor.builder(this.chatMemory).build())
        .build();
    }

    public String chat(String userMessage) {
        return chat(userMessage, "default-session");
    }

    public String chat(String userMessage, String sessionId) {
        String session = resolveSessionId(sessionId);
        log.info("[AI Chat] Session: {}, Khách hàng: {}", session, userMessage);
        try {
            String content = this.chatClient.prompt()
                    .user(userMessage)
                    .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, session))
                    .call()
                    .content();
            if (content == null || content.isBlank()) {
                throw new AiUnavailableException("empty content", null);
            }
            return content;
        } catch (AiUnavailableException e) {
            throw e;
        } catch (Exception e) {
            log.error("[AI Chat] Lỗi khi xử lý qua AI: {}", e.getMessage(), e);
            throw new AiUnavailableException("AI call failed", e);
        }
    }

    public Flux<String> streamChat(String userMessage, String sessionId) {
        String session = resolveSessionId(sessionId);
        log.info("[AI Stream] Session: {}, Khách hàng: {}", session, userMessage);
        long start = System.currentTimeMillis();
        AtomicLong ttft = new AtomicLong(0);
        AtomicInteger tokens = new AtomicInteger(0);

        return this.chatClient.prompt()
                .user(userMessage)
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, session))
                .stream()
                .content()
                .doOnNext(chunk -> {
                    if (ttft.compareAndSet(0, System.currentTimeMillis() - start)) {
                        log.info("[AI Stream] TTFT session {}: {} ms", session, ttft.get());
                    }
                    tokens.incrementAndGet();
                })
                .doOnComplete(() -> {
                    long total = System.currentTimeMillis() - start;
                    double tps = total > 0 ? (tokens.get() / (total / 1000.0)) : 0;
                    log.info("[AI Stream] Hoàn tất session {}: TTFT={}ms, Total={}ms, Tokens={}, Speed={:.1f} tok/s",
                            session, ttft.get(), total, tokens.get(), tps);
                })
                .onErrorResume(e -> {
                    log.error("[AI Stream] Lỗi stream qua AI: {}", e.getMessage(), e);
                    return Flux.just("Trợ lý AI đang bận hoặc gián đoạn kết nối. Quý khách vui lòng thử lại sau.");
                });
    }

    public void clearSession(String sessionId) {
        String session = resolveSessionId(sessionId);
        this.chatMemory.clear(session);
        log.info("[AI Memory] Đã xóa ngữ cảnh hội thoại cho session: {}", session);
    }

    private static String resolveSessionId(String sessionId) {
        return (sessionId != null && !sessionId.isBlank()) ? sessionId.trim() : "default-session";
    }
}
