-- Create User table with new structure
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  email VARCHAR NOT NULL,
  "firstName" VARCHAR NOT NULL,
  "lastName" VARCHAR NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'candidate',
  status VARCHAR NOT NULL DEFAULT 'pending',
  "referrerPassword" VARCHAR,
  "candidatePassword" VARCHAR,
  "lastLoginAt" TIMESTAMP,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "passwordResetToken" VARCHAR,
  "passwordResetExpires" TIMESTAMP,
  "referrerSubscriptionPlanId" UUID,
  "candidateSubscriptionPlanId" UUID,
  "referrerSubscriptionStatus" VARCHAR NOT NULL DEFAULT 'free',
  "candidateSubscriptionStatus" VARCHAR NOT NULL DEFAULT 'free'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "IDX_users_email" ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email_role" ON users (email, role);

-- Create other tables
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

CREATE TABLE IF NOT EXISTS referrer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "stripeAccountId" VARCHAR,
  "stripeOnboardingStatus" VARCHAR NOT NULL DEFAULT 'not_started',
  "userId" UUID NOT NULL,
  CONSTRAINT "FK_referrer_user" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "referredBy" VARCHAR,
  "userId" UUID NOT NULL,
  CONSTRAINT "FK_candidate_user" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
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
