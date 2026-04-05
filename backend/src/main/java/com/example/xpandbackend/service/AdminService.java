package com.example.xpandbackend.service;

import com.example.xpandbackend.models.*;
import com.example.xpandbackend.dto.request.*;
import com.example.xpandbackend.dto.response.*;
import com.example.xpandbackend.exception.BadRequestException;
import com.example.xpandbackend.exception.ResourceNotFoundException;
import com.example.xpandbackend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final SkillRepository skillRepository;
    private final ChallengeRepository challengeRepository;
    private final StoreItemRepository storeItemRepository;
    private final QuestionRepository questionRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    // -------- Users --------
    public List<UserProfileResponse> getAllUsers() {
        return userRepository.findAll().stream().map(this::mapToUserResponse).collect(Collectors.toList());
    }

    @Transactional
    public void suspendUser(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        // We store suspension as a flag - here we delete password to suspend
        // In production, add an isActive/isSuspended field to User model
        emailService.sendUserSuspensionEmail(user.getEmail());
        // For now, invalidate by setting password to garbage value
        user.setPasswordHash("SUSPENDED_" + user.getPasswordHash());
        userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Integer userId) {
        if (!userRepository.existsById(userId)) throw new ResourceNotFoundException("User not found.");
        userRepository.deleteById(userId);
    }

    // -------- Companies --------
    public List<CompanyProfileResponse> getAllCompanies() {
        return companyRepository.findAll().stream().map(this::mapToCompanyResponse).collect(Collectors.toList());
    }

    public List<CompanyProfileResponse> getPendingCompanies() {
        return companyRepository.findByIsApproved(false).stream().map(this::mapToCompanyResponse).collect(Collectors.toList());
    }

    @Transactional
    public CompanyProfileResponse approveCompany(Integer companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found."));
        company.setIsApproved(true);
        companyRepository.save(company);
        emailService.sendCompanyApprovalEmail(company.getEmail(), company.getCompanyName());
        return mapToCompanyResponse(company);
    }

    @Transactional
    public void suspendCompany(Integer companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found."));
        company.setIsApproved(false);
        companyRepository.save(company);
        emailService.sendCompanySuspensionEmail(company.getEmail(), company.getCompanyName());
    }

    @Transactional
    public void deleteCompany(Integer companyId) {
        if (!companyRepository.existsById(companyId)) throw new ResourceNotFoundException("Company not found.");
        companyRepository.deleteById(companyId);
    }

    // -------- Skills --------
    public List<SkillResponse> getAllSkills() {
        return skillRepository.findAll().stream().map(this::mapToSkillResponse).collect(Collectors.toList());
    }

    @Transactional
    public SkillResponse createSkill(CreateSkillRequest request) {
        if (skillRepository.findByNameIgnoreCase(request.getName()).isPresent()) {
            throw new BadRequestException("Skill already exists.");
        }
        Skill skill = new Skill();
        skill.setName(request.getName());
        skill.setCategory(request.getCategory());
        skill.setIsActive(true);
        skillRepository.save(skill);
        return mapToSkillResponse(skill);
    }

    @Transactional
    public SkillResponse updateSkill(Integer skillId, CreateSkillRequest request) {
        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found."));
        if (request.getName() != null) skill.setName(request.getName());
        if (request.getCategory() != null) skill.setCategory(request.getCategory());
        skillRepository.save(skill);
        return mapToSkillResponse(skill);
    }

    @Transactional
    public void deactivateSkill(Integer skillId) {
        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found."));
        skill.setIsActive(false);
        skillRepository.save(skill);
    }

    @Transactional
    public void activateSkill(Integer skillId) {
        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found."));
        skill.setIsActive(true);
        skillRepository.save(skill);
    }

    // -------- Questions --------
    @Transactional
    public void createQuestion(CreateQuestionRequest request) {
        Skill skill = skillRepository.findById(request.getSkillId())
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found."));
        Question q = new Question();
        q.setSkill(skill);
        q.setDifficultyLevel(request.getDifficultyLevel());
        q.setQuestionText(request.getQuestionText());
        q.setOptionA(request.getOptionA());
        q.setOptionB(request.getOptionB());
        q.setOptionC(request.getOptionC());
        q.setOptionD(request.getOptionD());
        q.setCorrectAnswer(request.getCorrectAnswer());
        q.setPoints(request.getPoints());
        questionRepository.save(q);
    }

    @Transactional
    public void deleteQuestion(Integer questionId) {
        if (!questionRepository.existsById(questionId)) throw new ResourceNotFoundException("Question not found.");
        questionRepository.deleteById(questionId);
    }

    // -------- Challenges --------
    public List<ChallengeResponse> getAllChallenges() {
        return challengeRepository.findAll().stream().map(this::mapToChallengeResponse).collect(Collectors.toList());
    }

    @Transactional
    public ChallengeResponse createChallenge(CreateChallengeRequest request) {
        Challenge c = new Challenge();
        c.setTitle(request.getTitle());
        c.setDescription(request.getDescription());
        c.setType(request.getType());
        c.setConditionValue(request.getConditionValue());
        c.setXpReward(request.getXpReward());
        c.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        c.setIsRepeatable(request.getIsRepeatable() != null ? request.getIsRepeatable() : false);
        c.setStartDate(request.getStartDate());
        c.setEndDate(request.getEndDate());
        challengeRepository.save(c);
        return mapToChallengeResponse(c);
    }


    @Transactional
    public ChallengeResponse updateChallenge(Integer challengeId, CreateChallengeRequest request) {
        Challenge c = challengeRepository.findById(challengeId)
                .orElseThrow(() -> new ResourceNotFoundException("Challenge not found."));
        if (request.getTitle() != null) c.setTitle(request.getTitle());
        if (request.getDescription() != null) c.setDescription(request.getDescription());
        if (request.getType() != null) c.setType(request.getType());
        if (request.getConditionValue() != null) c.setConditionValue(request.getConditionValue());
        if (request.getXpReward() != null) c.setXpReward(request.getXpReward());
        if (request.getIsActive() != null) c.setIsActive(request.getIsActive());
        if (request.getIsRepeatable() != null) c.setIsRepeatable(request.getIsRepeatable());
        if (request.getStartDate() != null) c.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) c.setEndDate(request.getEndDate());
        challengeRepository.save(c);
        return mapToChallengeResponse(c);
    }

    @Transactional
    public void deleteChallenge(Integer challengeId) {
        if (!challengeRepository.existsById(challengeId)) throw new ResourceNotFoundException("Challenge not found.");
        challengeRepository.deleteById(challengeId);
    }

    // -------- Store Items --------
    public List<StoreItemResponse> getAllStoreItems() {
        return storeItemRepository.findAll().stream().map(this::mapToStoreItemResponse).collect(Collectors.toList());
    }

    @Transactional
    public StoreItemResponse createStoreItem(CreateStoreItemRequest request) {
        StoreItem item = new StoreItem();
        item.setName(request.getName());
        item.setDescription(request.getDescription());
        item.setCostXp(request.getCostXp());
        item.setItemType(request.getItemType());
        storeItemRepository.save(item);
        return mapToStoreItemResponse(item);
    }

    @Transactional
    public StoreItemResponse updateStoreItem(Integer itemId, CreateStoreItemRequest request) {
        StoreItem item = storeItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Store item not found."));
        if (request.getName() != null) item.setName(request.getName());
        if (request.getDescription() != null) item.setDescription(request.getDescription());
        if (request.getCostXp() != null) item.setCostXp(request.getCostXp());
        if (request.getItemType() != null) item.setItemType(request.getItemType());
        storeItemRepository.save(item);
        return mapToStoreItemResponse(item);
    }

    @Transactional
    public void deleteStoreItem(Integer itemId) {
        if (!storeItemRepository.existsById(itemId)) throw new ResourceNotFoundException("Store item not found.");
        storeItemRepository.deleteById(itemId);
    }

    // -------- Mappers --------

    private UserProfileResponse mapToUserResponse(User u) {
        UserProfileResponse r = new UserProfileResponse();
        r.setId(u.getId());
        r.setEmail(u.getEmail());
        r.setFirstName(u.getFirstName());
        r.setLastName(u.getLastName());
        r.setPhoneNumber(u.getPhoneNumber());
        r.setCountry(u.getCountry());
        r.setCity(u.getCity());
        r.setLinkedinUrl(u.getLinkedinUrl());
        r.setGithubUrl(u.getGithubUrl());
        r.setPortfolioUrl(u.getPortfolioUrl());
        r.setProfilePicture(u.getProfilePicture());
        r.setProfessionalTitle(u.getProfessionalTitle());
        r.setAboutMe(u.getAboutMe());
        r.setXpBalance(u.getXpBalance());
        r.setCreatedAt(u.getCreatedAt());
        return r;
    }
//    private UserProfileResponse mapToUserResponse(User u) {
//        UserProfileResponse r = new UserProfileResponse();
//        r.setId(u.getId()); r.setEmail(u.getEmail());
//        r.setFirstName(u.getFirstName()); r.setLastName(u.getLastName());
//        r.setXpBalance(u.getXpBalance()); r.setCreatedAt(u.getCreatedAt());
//        return r;
//    }

    private CompanyProfileResponse mapToCompanyResponse(Company c) {
        CompanyProfileResponse r = new CompanyProfileResponse();
        r.setId(c.getId()); r.setEmail(c.getEmail());
        r.setCompanyName(c.getCompanyName()); r.setDescription(c.getDescription());
        r.setWebsiteUrl(c.getWebsiteUrl()); r.setIndustry(c.getIndustry());
        r.setLocation(c.getLocation()); r.setIsApproved(c.getIsApproved());
        r.setCreatedAt(c.getCreatedAt());
        return r;
    }

    private SkillResponse mapToSkillResponse(Skill s) {
        SkillResponse r = new SkillResponse();
        r.setId(s.getId()); r.setName(s.getName());
        r.setCategory(s.getCategory()); r.setIsActive(s.getIsActive());
        return r;
    }

    private ChallengeResponse mapToChallengeResponse(Challenge c) {
        ChallengeResponse r = new ChallengeResponse();
        r.setId(c.getId());
        r.setTitle(c.getTitle());
        r.setDescription(c.getDescription());
        r.setType(c.getType());
        r.setConditionValue(c.getConditionValue());
        r.setXpReward(c.getXpReward());
        r.setIsActive(c.getIsActive());
        r.setIsRepeatable(c.getIsRepeatable());
        r.setStartDate(c.getStartDate());
        r.setEndDate(c.getEndDate());
        return r;
    }

    private StoreItemResponse mapToStoreItemResponse(StoreItem item) {
        StoreItemResponse r = new StoreItemResponse();
        r.setId(item.getId()); r.setName(item.getName());
        r.setDescription(item.getDescription()); r.setCostXp(item.getCostXp());
        r.setItemType(item.getItemType());
        return r;
    }
}
