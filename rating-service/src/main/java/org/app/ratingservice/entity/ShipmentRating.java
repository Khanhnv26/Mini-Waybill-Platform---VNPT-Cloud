package org.app.ratingservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Table(name = "shipment_ratings")
public class ShipmentRating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_code", nullable = false, unique = true,length = 50)
    private String trackingCode;

    @Column(name = "courier_code", length = 50)
    private String courierCode;

    @Column(name = "service_rating", nullable = false)
    private Integer serviceRating;

    @Column(name = "shipper_rating", nullable = false)
    private Integer shipperRating;

    @Column(name = "tags", length = 500)
    private String tags;

    @Column(name = "comment", columnDefinition = "NVARCHAR(MAX)")
    private String comment;

    @Column(name = "attachment_urls", columnDefinition = "NVARCHAR(MAX)")
    private String attachmentUrls;

    @Column(name = "verified_phone", length = 10)
    private String verifiedPhone;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

}
