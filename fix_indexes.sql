-- Fix index issues in production database
-- Remove problematic indexes that reference non-existent columns

-- 1. Check what indexes exist on users table
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'users';

-- 2. Drop problematic indexes that might reference 'primaryRole'
DROP INDEX IF EXISTS "IDX_users_primaryRole" CASCADE;
DROP INDEX IF EXISTS "IDX_users_roles" CASCADE;

-- 3. Check if there are any other problematic indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'users' 
  AND indexdef LIKE '%primaryRole%';

-- 4. Verify current users table structure
\d+ users

-- 5. Show all indexes on users table after cleanup
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'users';
