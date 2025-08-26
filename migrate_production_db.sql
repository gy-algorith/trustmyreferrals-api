-- Production Database Migration Script
-- AWS RDS: trust-api-db.cxeiy4iykmgb.ap-northeast-2.rds.amazonaws.com

-- 1. Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS "role" character varying;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "referrerPassword" character varying;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "candidatePassword" character varying;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "referrerSubscriptionPlanId" uuid;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "candidateSubscriptionPlanId" uuid;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "referrerSubscriptionStatus" character varying DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "candidateSubscriptionStatus" character varying DEFAULT 'free';

-- 2. Update existing records to set role based on roles array
-- First, let's see what's in the roles column
-- SELECT DISTINCT roles FROM users;

-- Update role based on existing roles (assuming roles is a JSON array or comma-separated string)
UPDATE users 
SET "role" = CASE 
  WHEN roles LIKE '%referrer%' THEN 'referrer'
  WHEN roles LIKE '%candidate%' THEN 'candidate'
  WHEN roles LIKE '%admin%' THEN 'admin'
  ELSE 'candidate'
END;

-- 3. Move existing password to appropriate role-based password field
UPDATE users 
SET "candidatePassword" = password
WHERE "role" = 'candidate';

UPDATE users 
SET "referrerPassword" = password
WHERE "role" = 'referrer';

-- 4. Set default role for users without role
UPDATE users 
SET "role" = 'candidate' 
WHERE "role" IS NULL;

-- 5. Make role column NOT NULL
ALTER TABLE users ALTER COLUMN "role" SET NOT NULL;

-- 6. Drop old unique constraint on email
ALTER TABLE users DROP CONSTRAINT IF EXISTS "UQ_97672ac88f789774dd47f7c8be3";

-- 7. Create new unique index for email + role combination
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email_role" ON users (email, "role");

-- 8. Create new email index (non-unique)
CREATE INDEX IF NOT EXISTS "IDX_users_email_new" ON users (email);

-- 9. Drop old columns (after ensuring data migration is complete)
-- ALTER TABLE users DROP COLUMN roles;
-- ALTER TABLE users DROP COLUMN password;
-- ALTER TABLE users DROP COLUMN "subscriptionStatus";

-- 10. Create new tables if they don't exist
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  "monthlyPrice" DECIMAL(10,2) NOT NULL,
  "yearlyPrice" DECIMAL(10,2),
  "targetRole" VARCHAR NOT NULL,
  features JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "userId" VARCHAR NOT NULL,
  action VARCHAR NOT NULL,
  details TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "verificationId" VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  code VARCHAR NOT NULL,
  purpose VARCHAR NOT NULL DEFAULT 'register',
  "expiresAt" TIMESTAMP NOT NULL,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "isUsed" BOOLEAN NOT NULL DEFAULT false
);

-- 11. Verify the migration
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN "role" IS NOT NULL THEN 1 END) as users_with_role,
  COUNT(CASE WHEN "referrerPassword" IS NOT NULL THEN 1 END) as users_with_referrer_password,
  COUNT(CASE WHEN "candidatePassword" IS NOT NULL THEN 1 END) as users_with_candidate_password
FROM users;
