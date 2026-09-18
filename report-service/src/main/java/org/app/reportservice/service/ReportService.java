package org.app.reportservice.service;

import org.app.reportservice.dto.event.CreateShipmentEvent;
import org.app.reportservice.dto.event.ShipmentStatusUpdatedEvent;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

public interface ReportService {

    void processShipmentCreated(CreateShipmentEvent event);
    void processStatusUpdated(ShipmentStatusUpdatedEvent event);

    Map<String, Object> getReportSummary(LocalDate from, LocalDate to, Long customerId,
                                         String status,int page,int size,String roles, String userId);

    byte[] exportReportToExcel(LocalDate from, LocalDate to, Long customerId,
                               String status, String roles, String userId) throws IOException;
}
