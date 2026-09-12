package org.app.routingservice.dto.trip;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class ConsolidateRequest {
    List<ConsolidateItemRequest> items;
}
