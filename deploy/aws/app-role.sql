-- Creates the login the site uses. Run once as career_platform_admin, after
-- the data is restored:
--   psql ... -v app_password="$(cat ~/app-pw)" -f deploy/aws/app-role.sql
-- The role reads and writes rows but can't change the schema; migrations run
-- as career_platform_admin, and the default privileges below cover the
-- tables they add later.
\set ON_ERROR_STOP on

CREATE ROLE career_platform_app LOGIN PASSWORD :'app_password';
GRANT CONNECT ON DATABASE career_platform TO career_platform_app;

GRANT USAGE ON SCHEMA public TO career_platform_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO career_platform_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO career_platform_app;
ALTER DEFAULT PRIVILEGES FOR ROLE career_platform_admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO career_platform_app;
ALTER DEFAULT PRIVILEGES FOR ROLE career_platform_admin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO career_platform_app;

GRANT USAGE ON SCHEMA drizzle TO career_platform_app;
GRANT SELECT ON ALL TABLES IN SCHEMA drizzle TO career_platform_app;
