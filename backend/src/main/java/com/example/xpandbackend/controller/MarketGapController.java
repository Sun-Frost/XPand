package com.example.xpandbackend.controller;

import com.example.xpandbackend.dto.response.MarketGapResponse;
import com.example.xpandbackend.security.AuthenticatedUser;
import com.example.xpandbackend.service.MarketGapService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/market-gap")
@RequiredArgsConstructor
public class MarketGapController {

    private final MarketGapService marketGapService;

    @GetMapping
    public ResponseEntity<MarketGapResponse> getGlobalGap() {
        return ResponseEntity.ok(marketGapService.getGlobalMarketGap());
    }

    @GetMapping("/user")
    public ResponseEntity<MarketGapResponse> getUserGap(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(marketGapService.getMarketGapForUser(principal.getId()));
    }
}
