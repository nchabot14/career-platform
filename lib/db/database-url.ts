export const defaultDatabaseUrl = "file:./data/career_platform.db";

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || defaultDatabaseUrl;
}
