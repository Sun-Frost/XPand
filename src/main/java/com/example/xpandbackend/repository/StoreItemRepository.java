package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.StoreItem;
import com.example.xpandbackend.models.Enums.ItemType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StoreItemRepository extends JpaRepository<StoreItem, Integer> {
    List<StoreItem> findByItemType(ItemType itemType);
    Optional<StoreItem> findFirstByItemType(ItemType itemType);
}
