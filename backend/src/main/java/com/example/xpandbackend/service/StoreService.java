package com.example.xpandbackend.service;

import com.example.xpandbackend.models.*;
import com.example.xpandbackend.models.Enums.ItemType;
import com.example.xpandbackend.models.Enums.TransactionType;
import com.example.xpandbackend.dto.request.PurchaseItemRequest;
import com.example.xpandbackend.dto.response.StoreItemResponse;
import com.example.xpandbackend.dto.response.UserPurchaseResponse;
import com.example.xpandbackend.dto.response.XPTransactionResponse;
import com.example.xpandbackend.exception.*;
import com.example.xpandbackend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StoreService {

    private final StoreItemRepository storeItemRepository;
    private final UserPurchaseRepository userPurchaseRepository;
    private final UserRepository userRepository;
    private final JobPostingRepository jobPostingRepository;
    private final XPTransactionRepository xpTransactionRepository;
    private final ChallengeEvaluationService challengeEvaluationService;

    public List<StoreItemResponse> getAllItems() {
        return storeItemRepository.findAll().stream()
                .map(this::mapToStoreItemResponse).collect(Collectors.toList());
    }

    @Transactional
    public UserPurchaseResponse purchaseItem(Integer userId, PurchaseItemRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        StoreItem item = storeItemRepository.findById(request.getItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Store item not found."));

        JobPosting associatedJob = null;
        // MOCK_INTERVIEW: job must be associated at purchase time (questions are tailored to it).
        // PRIORITY_SLOT: purchased as a voucher and redeemed later during apply — no job needed here.
        if (item.getItemType() == ItemType.MOCK_INTERVIEW) {
            if (request.getAssociatedJobId() == null) {
                throw new BadRequestException("A job must be associated for a Mock Interview purchase.");
            }
            associatedJob = jobPostingRepository.findById(request.getAssociatedJobId())
                    .orElseThrow(() -> new ResourceNotFoundException("Job not found."));
        }

        // ── Determine the actual XP cost ──────────────────────────────────────
        // Priority slots have rank-tiered pricing: 3rd=100 XP, 2nd=120 XP, 1st=150 XP.
        // The DB item stores the base price; the actual deduction uses the rank.
        int costXp;
        if (item.getItemType() == ItemType.PRIORITY_SLOT) {
            int rank = request.getSlotRank() != null ? request.getSlotRank() : 3;
            costXp = switch (rank) {
                case 1 -> 150;
                case 2 -> 120;
                default -> 100; // rank 3
            };
        } else {
            costXp = item.getCostXp();
        }

        // Deduct XP (throws InsufficientXpException if balance is too low)
        challengeEvaluationService.deductXp(user, costXp, TransactionType.STORE_PURCHASE, item.getId());

        UserPurchase purchase = new UserPurchase();
        purchase.setUser(user);
        purchase.setItem(item);
        purchase.setAssociatedJob(associatedJob);
        purchase.setIsUsed(false);
        userPurchaseRepository.save(purchase);

        // ── Evaluate store challenges after successful purchase ───────────────
        // Calculate cumulative XP spent across all store purchases
        int totalXpSpent = xpTransactionRepository
                .findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .filter(tx -> tx.getSourceType() == TransactionType.STORE_PURCHASE && tx.getAmount() < 0)
                .mapToInt(tx -> Math.abs(tx.getAmount()))
                .sum();
        challengeEvaluationService.evaluateStorePurchase(userId, totalXpSpent);  // USE_XP_STORE + SPEND_XP

        return mapToPurchaseResponse(purchase);
    }

    public List<UserPurchaseResponse> getUserPurchases(Integer userId) {
        return userPurchaseRepository.findByUserId(userId).stream()
                .map(this::mapToPurchaseResponse).collect(Collectors.toList());
    }

    public List<UserPurchaseResponse> getUserUnusedPurchases(Integer userId) {
        return userPurchaseRepository.findByUserIdAndIsUsed(userId, false).stream()
                .map(this::mapToPurchaseResponse).collect(Collectors.toList());
    }

    public List<XPTransactionResponse> getUserTransactions(Integer userId) {
        return xpTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToTransactionResponse).collect(Collectors.toList());
    }

    private StoreItemResponse mapToStoreItemResponse(StoreItem item) {
        StoreItemResponse r = new StoreItemResponse();
        r.setId(item.getId());
        r.setName(item.getName());
        r.setDescription(item.getDescription());
        r.setCostXp(item.getCostXp());
        r.setItemType(item.getItemType());
        return r;
    }

    private UserPurchaseResponse mapToPurchaseResponse(UserPurchase p) {
        UserPurchaseResponse r = new UserPurchaseResponse();
        r.setId(p.getId());
        r.setItemId(p.getItem().getId());
        r.setItemName(p.getItem().getName());
        r.setItemType(p.getItem().getItemType());
        r.setIsUsed(p.getIsUsed());
        r.setPurchasedAt(p.getPurchasedAt());
        if (p.getAssociatedJob() != null) {
            r.setAssociatedJobId(p.getAssociatedJob().getId());
            r.setAssociatedJobTitle(p.getAssociatedJob().getTitle());
        }
        return r;
    }

    private XPTransactionResponse mapToTransactionResponse(XPTransaction tx) {
        XPTransactionResponse r = new XPTransactionResponse();
        r.setId(tx.getId());
        r.setAmount(tx.getAmount());
        r.setSourceType(tx.getSourceType());
        r.setReferenceId(tx.getReferenceId());
        r.setCreatedAt(tx.getCreatedAt());
        return r;
    }
}