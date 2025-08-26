-- Fix Production Database Schema based on actual entities
-- AWS RDS: trust-api-db.cxeiy4iykmgb.ap-northeast-2.rds.amazonaws.com

-- 1. Drop incorrectly created tables
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS email_verifications CASCADE;

-- 2. Create correct tables based on actual entities

-- Subscription Plans table
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

-- Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "userId" VARCHAR NOT NULL,
  action VARCHAR NOT NULL,
  details TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Email Verifications table
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "verificationId" VARCHAR NOT NULL UNIQUE,
  email VARCHAR NOT NULL,
  code VARCHAR NOT NULL,
  purpose VARCHAR NOT NULL DEFAULT 'register',
  "expiresAt" TIMESTAMP NOT NULL,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "isUsed" BOOLEAN NOT NULL DEFAULT false,
  "userId" UUID
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  name VARCHAR UNIQUE NOT NULL
);

-- Resume table
CREATE TABLE IF NOT EXISTS resume (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "sectionId" VARCHAR NOT NULL,
  "sectionType" VARCHAR NOT NULL,
  "sectionOrder" INTEGER NOT NULL,
  "sectionData" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- Resume Validations table
CREATE TABLE IF NOT EXISTS resume_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "resumeSectionId" UUID NOT NULL,
  "referrerId" VARCHAR NOT NULL,
  text TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- Job Requirements table
CREATE TABLE IF NOT EXISTS job_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  title VARCHAR NOT NULL,
  overview TEXT NOT NULL,
  skills TEXT[],
  "desiredSkills" TEXT[],
  location VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'open',
  "workStyle" VARCHAR[] DEFAULT ARRAY['remote'],
  "salaryCeiling" DECIMAL(10,2),
  "referrerId" VARCHAR NOT NULL,
  "closingDate" DATE,
  visibility VARCHAR NOT NULL DEFAULT 'public'
);

-- Job Requirement Responses table
CREATE TABLE IF NOT EXISTS job_requirement_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "requirementId" VARCHAR NOT NULL,
  "candidateId" VARCHAR NOT NULL,
  "referrerId" VARCHAR NOT NULL,
  "candidateOverview" VARCHAR(100) NOT NULL,
  "whyThisCandidate" VARCHAR(1000) NOT NULL,
  "purchasePrice" DECIMAL(10,2) NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending'
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "buyUserId" VARCHAR,
  "sellUserId" VARCHAR,
  type VARCHAR NOT NULL,
  "referrerAmount" DECIMAL(10,2) NOT NULL,
  "applicationFee" DECIMAL(10,2) NOT NULL,
  currency VARCHAR NOT NULL DEFAULT 'usd',
  "stripeObjectId" VARCHAR,
  "responseId" VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending',
  description TEXT
);

-- User Updates table
CREATE TABLE IF NOT EXISTS user_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "userId" UUID NOT NULL,
  type VARCHAR NOT NULL DEFAULT 'event',
  description TEXT
);

-- Deck table
CREATE TABLE IF NOT EXISTS deck (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "referrerId" VARCHAR NOT NULL,
  "candidateId" VARCHAR NOT NULL,
  source VARCHAR NOT NULL DEFAULT 'invite'
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS "IDX_activity_logs_userId" ON activity_logs ("userId");
CREATE INDEX IF NOT EXISTS "IDX_activity_logs_action" ON activity_logs (action);
CREATE INDEX IF NOT EXISTS "IDX_email_verifications_email" ON email_verifications (email);
CREATE INDEX IF NOT EXISTS "IDX_email_verifications_verificationId" ON email_verifications ("verificationId");
CREATE INDEX IF NOT EXISTS "IDX_skills_name" ON skills (name);
CREATE INDEX IF NOT EXISTS "IDX_resume_sectionId" ON resume ("sectionId");
CREATE INDEX IF NOT EXISTS "IDX_job_requirements_referrerId" ON job_requirements ("referrerId");
CREATE INDEX IF NOT EXISTS "IDX_job_requirements_status" ON job_requirements (status);
CREATE INDEX IF NOT EXISTS "IDX_deck_unique" ON deck ("referrerId", "candidateId");

-- 4. Verify tables
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
