package org.app.apigateway.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class TestController {

    @GetMapping("/api/test")
    public ResponseEntity<?> test() {
        return ResponseEntity.ok(Map.of("message", "Thành công 200 OK!", "status", 200));
    }

}
