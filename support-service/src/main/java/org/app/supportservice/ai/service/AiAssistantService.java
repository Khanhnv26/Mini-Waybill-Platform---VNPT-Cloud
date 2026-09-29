package org.app.supportservice.ai.service;

import lombok.extern.slf4j.Slf4j;
import org.app.supportservice.ai.tools.PostalAiTools;
import org.app.supportservice.exception.AiUnavailableException;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Slf4j
@Service

public class AiAssistantService {

    private final ChatClient chatClient;

    public AiAssistantService (ChatClient.Builder chatClientBuilder, PostalAiTools postalTools) {
        this.chatClient = chatClientBuilder.defaultSystem(
                """
                        Bạn là "Trợ lý ảo VNPT Post" – Trợ lý chăm sóc khách hàng bưu chính chuyên nghiệp.
                        
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
        ).defaultTools(postalTools).build();
    }

    public String chat(String userMessage) {
        log.info("[AI Chat] Khách hàng: {}", userMessage);
        try {
            String content = this.chatClient.prompt()
                    .user(userMessage)
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
}
