package org.app.routingservice.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "trip_stops")
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@ToString(exclude = "trip")
@EqualsAndHashCode(exclude = "trip")
public class TripStop {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    @JsonBackReference
    private Trip trip;

    @Column(name = "stop_order", nullable = false)
    private Integer stopOrder;

    @Column(name = "hub_code", nullable = false, length = 50)
    private String hubCode;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "arrived_at")
    private LocalDateTime arrivedAt;

    @Column(name = "departed_at")
    private LocalDateTime departedAt;

    @PrePersist
    public void onCreate() {
        if (this.status == null) {
            this.status = "PENDING";
        }
    }
}
