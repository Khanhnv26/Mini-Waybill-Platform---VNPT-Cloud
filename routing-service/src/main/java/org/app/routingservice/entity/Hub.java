package org.app.routingservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "hubs")
@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Hub {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hub_code", nullable = false, unique = true, length = 50)
    private String hubCode;

    @Column(name = "hub_name", nullable = false, length = 150)
    private String hubName;

    @Column(name = "province", nullable = false, length = 100)
    private String province;

    @Column(name = "latitude", nullable = false)
    private Double latitude;

    @Column(name = "longitude", nullable = false)
    private Double longitude;
}
