package org.app.supportservice.controller;


import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.app.supportservice.ai.service.AiAssistantService;
import org.app.supportservice.dto.request.AiChatRequest;
import org.app.supportservice.dto.response.AiChatResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/support/ai")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AiChatController {
    private final AiAssistantService aiAssistantService;

    @PostMapping("/chat")
    public ResponseEntity<AiChatResponse> chatWithAi(@Valid @RequestBody AiChatRequest request) {

        String reply = aiAssistantService.chat(request.getMessage());
        AiChatResponse response = new AiChatResponse(reply, LocalDateTime.now());
        return ResponseEntity.ok(response);
    }
}
