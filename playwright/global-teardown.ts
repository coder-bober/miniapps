import { cleanupAuthFixtureUsers } from "../tests/utils/supabase-admin";

async function globalTeardown() {
  await cleanupAuthFixtureUsers();
}

export default globalTeardown;
