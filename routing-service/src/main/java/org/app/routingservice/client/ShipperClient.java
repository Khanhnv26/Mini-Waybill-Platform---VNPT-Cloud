package org.app.routingservice.client;


import org.app.routingservice.dto.operation.StationCapacityDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "shipper-service")
public interface ShipperClient {

    @GetMapping("/api/shippers/stations/{stationCode}/capacity")
    StationCapacityDto getStationCapacity(@PathVariable("stationCode") String stationCode);
}
