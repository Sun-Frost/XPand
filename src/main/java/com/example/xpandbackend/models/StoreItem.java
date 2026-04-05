package com.example.xpandbackend.models;

import com.example.xpandbackend.models.Enums.ItemType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "store_item")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private Integer id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Integer costXp;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false)
    private ItemType itemType;
}
