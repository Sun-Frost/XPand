package com.example.xpandbackend.controller;

import com.example.xpandbackend.dto.request.PurchaseItemRequest;
import com.example.xpandbackend.dto.response.*;
import com.example.xpandbackend.security.AuthenticatedUser;
import com.example.xpandbackend.service.StoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user/store")
@RequiredArgsConstructor
public class StoreController {

    private final StoreService storeService;

    @GetMapping("/items")
    public ResponseEntity<List<StoreItemResponse>> getStoreItems() {
        return ResponseEntity.ok(storeService.getAllItems());
    }

    @PostMapping("/purchase")
    public ResponseEntity<UserPurchaseResponse> purchase(@AuthenticationPrincipal AuthenticatedUser principal,
                                                         @RequestBody PurchaseItemRequest request) {
        return ResponseEntity.ok(storeService.purchaseItem(principal.getId(), request));
    }

    @GetMapping("/purchases")
    public ResponseEntity<List<UserPurchaseResponse>> getPurchases(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(storeService.getUserPurchases(principal.getId()));
    }

    @GetMapping("/purchases/unused")
    public ResponseEntity<List<UserPurchaseResponse>> getUnusedPurchases(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(storeService.getUserUnusedPurchases(principal.getId()));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<XPTransactionResponse>> getTransactions(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(storeService.getUserTransactions(principal.getId()));
    }
}
