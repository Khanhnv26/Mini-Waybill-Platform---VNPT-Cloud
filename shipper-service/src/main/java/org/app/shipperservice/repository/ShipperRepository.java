package org.app.shipperservice.repository;


import org.app.shipperservice.entity.Shipper;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShipperRepository extends JpaRepository<Shipper, Long> {
    Optional<Shipper> findByCourierCode(String courierCode);

    Optional<Shipper> findByTelegramChatId(String telegramChatId);

    List<Shipper> findByStationCode(String stationCode);
    long countByStationCode(String stationCode);
    long countByStationCodeAndStatusAndShiftStatus(String stationCode, String status, String shiftStatus);


}
