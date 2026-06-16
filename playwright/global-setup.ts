import { hasSupabaseAdminEnv, seedAuthFixtureUsers } from "../tests/utils/supabase-admin";

async function globalSetup() {
  const fixtures = await seedAuthFixtureUsers();

  if (hasSupabaseAdminEnv() && !fixtures) {
    throw new Error("Auth fixture seeding failed even though Supabase admin env is configured.");
  }
}

export default globalSetup;
