package org.app.shipmentservice.dto.response;

import org.app.shipmentservice.entity.Shipment;
import java.util.List;
import java.util.Map;

public record ShipmentPageResponse(List<Shipment> content, int page, int size, int totalPages,
                                   long totalElements, Map<String, Object> stats) {}
