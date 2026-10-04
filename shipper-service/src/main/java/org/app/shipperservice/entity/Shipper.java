package org.app.shipperservice.entity;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;


@Table(name = "shippers")
@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Shipper {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "courier_code", nullable = false, unique = true, length = 100)
    private String courierCode;

    @Column(name = "full_name", nullable = false, columnDefinition = "NVARCHAR(255)")
    private String fullName;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "telegram_chat_id", length = 100)
    private String telegramChatId;

    @Column(name = "station_code", length = 50)
    private String stationCode;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "shift_status", nullable = false, length = 20)
    private String shiftStatus;

    @Column(name = "max_orders_per_shift", nullable = false)
    private Integer maxOrdersPerShift;

    @Column(name = "current_orders_count", nullable = false)
    private Integer currentOrdersCount;

    @Column(name = "rating_avg")
    private Double ratingAvg;

    @Column(name = "rating_count")
    private Integer ratingCount;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }

        if(this.status == null) {
            this.status = "ACTIVE";
        }

        if(this.shiftStatus == null) {
            this.shiftStatus = "ON_DUTY";
        }

        if (this.maxOrdersPerShift == null) {
            this.maxOrdersPerShift = 40;
        }

        if (this.currentOrdersCount == null) {
            this.currentOrdersCount = 0;
        }

        if (this.ratingAvg == null) {
            this.ratingAvg = 5.0;
        }
        if (this.ratingCount == null) {
            this.ratingCount = 0;
        }
    }
}
