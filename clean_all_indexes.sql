-- Clean all problematic indexes and recreate clean schema
-- This will resolve the primaryRole index issue

-- 1. Drop all indexes on users table (except primary key)
DROP INDEX IF EXISTS "IDX_97672ac88f789774dd47f7c8be" CASCADE;
DROP INDEX IF EXISTS "IDX_b7f8278f4e89249bb75c9a1589" CASCADE;
DROP INDEX IF EXISTS "IDX_d3998945517e0cac384f573b3c" CASCADE;
DROP INDEX IF EXISTS "IDX_users_email_role" CASCADE;
DROP INDEX IF EXISTS "IDX_users_email_new" CASCADE;

-- 2. Drop any other potentially problematic indexes
DROP INDEX IF EXISTS "IDX_users_primaryRole" CASCADE;
DROP INDEX IF EXISTS "IDX_users_roles" CASCADE;
DROP INDEX IF EXISTS "IDX_users_email" CASCADE;

-- 3. Recreate only the necessary indexes
CREATE INDEX IF NOT EXISTS "IDX_users_email" ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email_role" ON users (email, role);
CREATE INDEX IF NOT EXISTS "IDX_users_referralCode" ON users ("referralCode");
CREATE INDEX IF NOT EXISTS "IDX_users_referredBy" ON users ("referredBy");

-- 4. Verify the cleanup
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'users';

-- 5. Show final table structure
\d+ users
