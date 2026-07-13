import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * RLS test suite for the `store-assets` storage bucket.
 *
 * These tests sign in as two real store-owner accounts and assert that:
 *  - Owner A can upload gallery/logo/cover/product files under `<storeIdA>/...`
 *  - Owner A CANNOT upload, update, or delete objects under `<storeIdB>/...`
 *  - Admin (when ADMIN env vars are set) can read/write any path
 *
 * Configure via env vars (skipped automatically when missing):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY
 *   VITE_TEST_OWNER_A_EMAIL / VITE_TEST_OWNER_A_PASSWORD / VITE_TEST_OWNER_A_STORE_ID
 *   VITE_TEST_OWNER_B_EMAIL / VITE_TEST_OWNER_B_PASSWORD / VITE_TEST_OWNER_B_STORE_ID
 *   (optional) VITE_TEST_ADMIN_EMAIL / VITE_TEST_ADMIN_PASSWORD
 */

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const A = {
  email: process.env.VITE_TEST_OWNER_A_EMAIL,
  password: process.env.VITE_TEST_OWNER_A_PASSWORD,
  storeId: process.env.VITE_TEST_OWNER_A_STORE_ID,
};
const B = {
  email: process.env.VITE_TEST_OWNER_B_EMAIL,
  password: process.env.VITE_TEST_OWNER_B_PASSWORD,
  storeId: process.env.VITE_TEST_OWNER_B_STORE_ID,
};
const ADMIN = {
  email: process.env.VITE_TEST_ADMIN_EMAIL,
  password: process.env.VITE_TEST_ADMIN_PASSWORD,
};

const haveOwners = !!(url && anon && A.email && A.password && A.storeId && B.email && B.password && B.storeId);
const haveAdmin = !!(url && anon && ADMIN.email && ADMIN.password);

const BUCKET = "store-assets";
const tinyPng = () =>
  new Blob(
    [Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="), (c) => c.charCodeAt(0))],
    { type: "image/png" },
  );

async function signIn(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(url!, anon!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

const describeOwners = haveOwners ? describe : describe.skip;
const describeAdmin = haveAdmin ? describe : describe.skip;

describeOwners("store-assets RLS — store owners", () => {
  let clientA: SupabaseClient;
  const uploadedAPaths: string[] = [];

  beforeAll(async () => {
    clientA = await signIn(A.email!, A.password!);
  });

  afterAll(async () => {
    // Cleanup uploads owned by A
    if (clientA && uploadedAPaths.length) {
      await clientA.storage.from(BUCKET).remove(uploadedAPaths);
    }
    await clientA?.auth.signOut();
  });

  it("Owner A can upload gallery image", async () => {
    const path = `${A.storeId}/gallery-rls-${Date.now()}.png`;
    const { error } = await clientA.storage.from(BUCKET).upload(path, tinyPng(), { upsert: true });
    expect(error).toBeNull();
    uploadedAPaths.push(path);
  });

  it("Owner A can upload logo image", async () => {
    const path = `${A.storeId}/logo-rls-${Date.now()}.png`;
    const { error } = await clientA.storage.from(BUCKET).upload(path, tinyPng(), { upsert: true });
    expect(error).toBeNull();
    uploadedAPaths.push(path);
  });

  it("Owner A can upload cover image", async () => {
    const path = `${A.storeId}/cover-rls-${Date.now()}.png`;
    const { error } = await clientA.storage.from(BUCKET).upload(path, tinyPng(), { upsert: true });
    expect(error).toBeNull();
    uploadedAPaths.push(path);
  });

  it("Owner A can upload product (room) image under storeId/products/", async () => {
    const path = `${A.storeId}/products/rls-${Date.now()}.png`;
    const { error } = await clientA.storage.from(BUCKET).upload(path, tinyPng(), { upsert: true });
    expect(error).toBeNull();
    uploadedAPaths.push(path);
  });

  it("Owner A CANNOT upload to Store B's folder", async () => {
    const path = `${B.storeId}/gallery-rls-${Date.now()}.png`;
    const { error } = await clientA.storage.from(BUCKET).upload(path, tinyPng(), { upsert: true });
    expect(error).not.toBeNull();
  });

  it("Owner A CANNOT upload to Store B's products folder", async () => {
    const path = `${B.storeId}/products/rls-${Date.now()}.png`;
    const { error } = await clientA.storage.from(BUCKET).upload(path, tinyPng(), { upsert: true });
    expect(error).not.toBeNull();
  });

  it("Owner A CANNOT delete an object owned by Store B", async () => {
    // First, owner B uploads a file we can attempt to delete as A
    const clientB = await signIn(B.email!, B.password!);
    const targetPath = `${B.storeId}/rls-target-${Date.now()}.png`;
    const upRes = await clientB.storage.from(BUCKET).upload(targetPath, tinyPng(), { upsert: true });
    expect(upRes.error).toBeNull();
    await clientB.auth.signOut();

    const { error: delErr, data: delData } = await clientA.storage.from(BUCKET).remove([targetPath]);
    // Storage remove returns no error but an empty data array when blocked by RLS
    const blocked = !!delErr || !delData || delData.length === 0;
    expect(blocked).toBe(true);

    // cleanup
    const cleanup = await signIn(B.email!, B.password!);
    await cleanup.storage.from(BUCKET).remove([targetPath]);
    await cleanup.auth.signOut();
  });

  it("Owner A CANNOT update (overwrite without upsert) an object in Store B's folder", async () => {
    const path = `${B.storeId}/cover-rls-update-${Date.now()}.png`;
    const { error } = await clientA.storage.from(BUCKET).update(path, tinyPng());
    expect(error).not.toBeNull();
  });
});

describeAdmin("store-assets RLS — admin", () => {
  let admin: SupabaseClient;
  const cleanup: string[] = [];

  beforeAll(async () => {
    admin = await signIn(ADMIN.email!, ADMIN.password!);
  });

  afterAll(async () => {
    if (admin && cleanup.length) {
      await admin.storage.from(BUCKET).remove(cleanup);
    }
    await admin?.auth.signOut();
  });

  it("Admin can write to an arbitrary store folder", async () => {
    const target = A.storeId || B.storeId || "admin-test";
    const path = `${target}/admin-rls-${Date.now()}.png`;
    const { error } = await admin.storage.from(BUCKET).upload(path, tinyPng(), { upsert: true });
    expect(error).toBeNull();
    cleanup.push(path);
  });

  it("Admin can update (overwrite) an object in another store's folder", async () => {
    const target = A.storeId || B.storeId || "admin-test";
    const path = `${target}/admin-update-${Date.now()}.png`;
    const upRes = await admin.storage.from(BUCKET).upload(path, tinyPng(), { upsert: true });
    expect(upRes.error).toBeNull();
    cleanup.push(path);

    const { error: updErr } = await admin.storage.from(BUCKET).update(path, tinyPng());
    expect(updErr).toBeNull();
  });

  it("Admin can delete an object in another store's folder", async () => {
    const target = A.storeId || B.storeId || "admin-test";
    const path = `${target}/admin-delete-${Date.now()}.png`;
    const upRes = await admin.storage.from(BUCKET).upload(path, tinyPng(), { upsert: true });
    expect(upRes.error).toBeNull();

    const { error: delErr, data: delData } = await admin.storage.from(BUCKET).remove([path]);
    expect(delErr).toBeNull();
    expect(delData && delData.length > 0).toBe(true);
  });
});
