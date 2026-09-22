package org.app.routingservice.service;

import org.app.routingservice.dto.trip.SchedulerConfigRequest;
import org.app.routingservice.dto.trip.SchedulerConfigResponse;

public interface TripScheduleManager {

    void initScheduler();
    SchedulerConfigResponse getConfig();
    SchedulerConfigResponse updateConfig(SchedulerConfigRequest request);
}

