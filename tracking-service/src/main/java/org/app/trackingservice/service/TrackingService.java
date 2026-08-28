package org.app.trackingservice.service;


import org.app.trackingservice.entity.TrackingHistory;

import java.util.List;
import java.util.Map;

public interface TrackingService {

    Map<String,String> getCurrentStatus(String trackingCode);
    List<TrackingHistory> getTrackingHistory(String trackingCode);
}
