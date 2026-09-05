package org.app.authservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "permissions")
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true,length = 50)
    private String code;

    @Column(nullable = false,length = 100)
    private String name;

    @Column(length = 100,nullable = false)
    private String module;

    @Column(columnDefinition = "NVARCHAR(MAX)",nullable = false)
    private String description;
}
