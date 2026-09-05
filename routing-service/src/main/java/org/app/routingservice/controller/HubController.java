package org.app.routingservice.controller;

import lombok.RequiredArgsConstructor;
import org.app.routingservice.entity.Hub;
import org.app.routingservice.repository.HubRepository;
import org.app.routingservice.service.HubService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/routing/hubs")
@RequiredArgsConstructor
public class HubController {

    private final HubService hubService;

    @RequestMapping
    ResponseEntity<List<Hub>> getAllHubs() {
        return ResponseEntity.ok(hubService.getAllHubs());
    }

}
