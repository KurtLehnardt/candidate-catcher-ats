// No auth wave yet — every job/applicant created through the app hangs off this single
// seeded dev org (see supabase/migrations/0003_frontend_dev_additions.sql). Replace
// getCurrentOrgId() with a real session lookup once auth lands.

export const DEV_ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function getCurrentOrgId(): Promise<string> {
  return DEV_ORG_ID;
}
