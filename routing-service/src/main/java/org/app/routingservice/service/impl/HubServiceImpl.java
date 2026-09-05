package org.app.routingservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.app.routingservice.entity.Hub;
import org.app.routingservice.repository.HubRepository;
import org.app.routingservice.service.HubService;
import org.springframework.stereotype.Service;

import java.util.List;

@RequiredArgsConstructor
@Service
public class HubServiceImpl implements HubService {

    private final HubRepository hubRepository;

    @Override
    public List<Hub> getAllHubs() {
        return hubRepository.findAll();
    }
}
