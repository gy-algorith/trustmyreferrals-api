-- 구독 플랜 데이터 입력
-- Referrer 플랜들
INSERT INTO subscription_plans (id, code, name, description, "monthlyPrice", "yearlyPrice", "targetRole", features, "isActive", "isDefault", "createdAt", "updatedAt") VALUES
(
  gen_random_uuid(),
  'FREE',
  'Free',
  'For getting started',
  0,
  0,
  'referrer',
  '{"acquired_candidate_cap": 5, "public_postings": true}',
  true,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'PRO',
  'Pro',
  'For the active referrer',
  2900,
  29000,
  'referrer',
  '{"acquired_candidate_cap": 25, "circle_only_postings": true, "advanced_analytics": true}',
  true,
  false,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'BUSINESS',
  'Business',
  'For power users & teams',
  7900,
  79000,
  'referrer',
  '{"acquired_candidate_cap": 100, "annual_nfc_card": true, "priority_support": true}',
  true,
  false,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'ENTERPRISE',
  'Enterprise',
  'For large organizations',
  0,
  0,
  'referrer',
  '{"unlimited_capacity": true, "custom_features": true, "dedified_support": true}',
  true,
  false,
  NOW(),
  NOW()
);

-- Candidate 플랜들
INSERT INTO subscription_plans (id, code, name, description, "monthlyPrice", "yearlyPrice", "targetRole", features, "isActive", "isDefault", "createdAt", "updatedAt") VALUES
(
  gen_random_uuid(),
  'STANDARD',
  'Standard',
  'Basic candidate features',
  0,
  0,
  'candidate',
  '{"build_community_resume": true, "receive_referrer_connections": true}',
  true,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'PREMIUM',
  'Premium',
  'Enhanced candidate features',
  1900,
  19000,
  'candidate',
  '{"all_standard_features": true, "fund_referrer_suggestions": true, "priority_placement": true, "advanced_profile_analytics": true}',
  true,
  false,
  NOW(),
  NOW()
);
