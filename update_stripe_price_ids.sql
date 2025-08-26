-- Stripe Dashboard에서 생성된 Price ID들을 업데이트
-- 실제 Price ID로 교체해야 합니다

-- Referrer 플랜들 (실제 Stripe Price ID로 교체)
UPDATE subscription_plans 
SET "stripeMonthlyPriceId" = 'price_1Ryp18Poxmizjqv1nAPtzFU4' -- PRO 플랜 월간 Price ID
WHERE code = 'PRO';

-- 다른 플랜들도 Stripe Dashboard에서 생성된 Price ID로 교체 필요
-- UPDATE subscription_plans 
-- SET "stripeMonthlyPriceId" = 'price_xxx' -- BUSINESS 플랜 월간 Price ID
-- WHERE code = 'BUSINESS';

-- UPDATE subscription_plans 
-- SET "stripeMonthlyPriceId" = 'price_xxx' -- PREMIUM 플랜 월간 Price ID
-- WHERE code = 'PREMIUM';

-- 연간 플랜 Price ID들도 필요시 추가
-- UPDATE subscription_plans 
-- SET "stripeYearlyPriceId" = 'price_1ABC123MNO345' -- 실제 연간 Price ID로 교체
-- WHERE code = 'PRO';

-- FREE와 STANDARD 플랜은 무료이므로 Price ID 불필요
-- ENTERPRISE 플랜은 Contact Us이므로 Price ID 불필요
