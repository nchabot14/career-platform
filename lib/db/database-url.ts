export const defaultDatabaseUrl = "postgres://postgres:postgres@localhost:5432/career_platform";

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || defaultDatabaseUrl;
}
