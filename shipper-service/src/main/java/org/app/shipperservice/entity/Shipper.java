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
    }
}
