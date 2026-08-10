import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260809170500_lock_down_ar_job_photo_storage.sql"),
  "utf8",
);

describe("auto-repair photo storage boundary", () => {
  it("removes legacy bucket-only grants before adding owner-scoped policies", () => {
    expect(migration).toContain('drop policy if exists "ar_job_photos_authenticated_write"');
    expect(migration).toContain('drop policy if exists "ar_job_photos_authenticated_delete"');
    expect(migration).toContain('bucket_id = \'ar-job-photos\'');
    expect(migration).toContain("restaurant.owner_id = (select auth.uid())");
    expect(migration).toContain("public.has_role((select auth.uid()), 'admin')");
    expect(migration).not.toContain("with check (bucket_id = 'ar-job-photos')");
    expect(migration).not.toContain("using (bucket_id = 'ar-job-photos')");
  });
});
