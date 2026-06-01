import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("storage bucket policy guard", () => {
  it("keeps public user media owner-prefixed for write, update, and delete", () => {
    const userPosts = read("supabase/migrations/20260408205546_48a59ef3-3ccb-4275-bbeb-602b7561abb8.sql");
    const storiesBase = read("supabase/migrations/20260330155158_6c027947-9436-48f9-a223-081590f34bfc.sql");
    const storiesUpdate = read("supabase/migrations/20260409043104_17790118-7ba0-431d-b70b-b6a8a6172d46.sql");
    const covers = read("supabase/migrations/20260402024346_a4e21110-fd88-4764-ac57-2487fbc9a7ec.sql");
    const cvPhotos = read("supabase/migrations/20260404214754_9ba86922-f9e2-4284-a05c-c6a6581abb84.sql");

    expect(userPosts).toContain("VALUES ('user-posts', 'user-posts', true)");
    expect(userPosts).toContain("Anyone can view user post media");
    expect(userPosts).toContain("auth.uid()::text = (storage.foldername(name))[1]");
    expect(userPosts).toContain("Users can update their own post media");
    expect(userPosts).toContain("Users can delete their own post media");

    expect(storiesBase).toContain("VALUES ('user-stories', 'user-stories', true)");
    expect(storiesBase).toContain("expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')");
    expect(storiesBase).toContain("Anyone can view active stories");
    expect(storiesBase).toContain("Users can delete own stories");
    expect(storiesUpdate).toContain("(storage.foldername(name))[1] = auth.uid()::text");
    expect(storiesUpdate).toContain("Users can update own story media");

    for (const profileMedia of [covers, cvPhotos]) {
      expect(profileMedia).toContain("INSERT INTO storage.buckets");
      expect(profileMedia).toContain("auth.uid()::text = (storage.foldername(name))[1]");
      expect(profileMedia).toContain("FOR INSERT");
      expect(profileMedia).toContain("FOR UPDATE");
      expect(profileMedia).toContain("FOR DELETE");
    }
  });

  it("keeps private chat, paid, document, and receipt media private or signed", () => {
    const chatHardening = read("supabase/migrations/20260429230000_security_hardening.sql");
    const chatPolicyRestore = read("supabase/migrations/20260527163358_restore_chat_media_storage_policy.sql");
    const chatFiles = read("supabase/migrations/20260426203907_087e023a-2011-42a8-8dc9-bae36950ca6c.sql");
    const paidMedia = read("supabase/migrations/20260528000001_creator_type_and_ppv.sql");
    const signedMedia = read("src/lib/security/signedMedia.ts");
    const documentsHook = read("src/hooks/store/useStoreDocuments.ts");
    const documentManage = read("supabase/functions/store-document-manage/index.ts");
    const documentsGate = read("supabase/migrations/20260601214500_store_documents_server_gate.sql");
    const receiptSignedUrl = read("supabase/functions/get-receipt-signed-url/index.ts");

    expect(chatHardening).toContain("set public = false");
    expect(chatHardening).toContain("where id in ('chat-media-files', 'chat_uploads')");
    expect(chatHardening).toContain("chat_media_insert_authenticated");
    expect(chatHardening).toContain("auth.uid()::text = split_part(name, '/', 1)");
    expect(chatPolicyRestore).toContain("direct_messages dm");
    expect(chatPolicyRestore).toContain("group_messages gm");
    expect(chatPolicyRestore).toContain("media_unlocks mu");

    expect(chatFiles).toContain("VALUES ('chat-files', 'chat-files', false)");
    expect(chatFiles).toContain("Users can read their own chat files");
    expect(chatFiles).toContain("Users can upload their own chat files");
    expect(chatFiles).toContain("Users can delete their own chat files");

    expect(paidMedia).toContain("VALUES ('ppv-media', 'ppv-media', false)");
    expect(paidMedia).toContain("ppv_media_owner_upload");
    expect(paidMedia).toContain("ppv_media_owner_or_unlocker_read");
    expect(paidMedia).toContain("u.unlocker_id = auth.uid()");

    expect(signedMedia).toContain("createSignedUrl(path, ttlSec)");
    expect(documentsHook).toContain('const BUCKET = "store-documents"');
    expect(documentsHook).toContain("assertStoreDocumentPath");
    expect(documentsHook).toContain(".createSignedUrl(filePath, expiresInSec)");
    expect(documentsHook).toContain('functions.invoke("store-document-manage"');
    expect(documentManage).toContain('allowedMethods: ["POST"]');
    expect(documentManage).toContain("admin.auth.getUser(token)");
    expect(documentManage).toContain("pathBelongsToDocument");
    expect(documentManage).toContain(`admin.storage.from(BUCKET).remove`);
    expect(documentsGate).toContain("Store document inserts require trusted server-side validation");
    expect(documentsGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_documents FROM anon, authenticated");
    expect(receiptSignedUrl).toContain("createSignedUrl(receipt.pdf_path, 3600)");
    expect(receiptSignedUrl).toContain("receipt.user_id === user.id");
  });

  it("keeps owner and admin store media policies tested against cross-store writes", () => {
    const storeAssets = read("supabase/migrations/20260422040327_e43a342a-1e41-4def-ad26-9fbdde280970.sql");
    const repairStoreAssets = read("supabase/migrations/20260521020631_repair_store_product_storage_paths.sql");
    const storeAssetsRls = read("src/test/rls/storeAssetsRls.test.ts");
    const uploadHelper = read("src/pages/admin/utils/uploadStoreAsset.ts");

    for (const migration of [storeAssets, repairStoreAssets]) {
      expect(migration).toContain("Store owners can upload own store-assets");
      expect(migration).toContain("Store owners can update own store-assets");
      expect(migration).toContain("Store owners can delete own store-assets");
      expect(migration).toContain("owner_store.owner_id = auth.uid()");
      expect(migration).toContain("WITH CHECK");
    }

    expect(storeAssetsRls).toContain("Owner A CANNOT upload to Store B's folder");
    expect(storeAssetsRls).toContain("Owner A CANNOT delete an object owned by Store B");
    expect(storeAssetsRls).toContain("Admin can write to an arbitrary store folder");
    expect(storeAssetsRls).toContain("Admin can delete an object in another store's folder");
    expect(uploadHelper).toContain('supabase.storage.from("store-assets")');
  });

  it("keeps account deletion cleanup aligned with user media buckets", () => {
    const accountDelete = read("supabase/functions/account-delete-self/index.ts");

    for (const bucket of [
      "chat-media-files",
      "chat_uploads",
      "chat-files",
      "voice-notes",
      "user-posts",
      "user-stories",
      "covers",
      "cv-photos",
    ]) {
      expect(accountDelete).toContain(`"${bucket}"`);
    }

    expect(accountDelete).toContain("await sb.storage.from(bucket).list(userId");
    expect(accountDelete).toContain("await sb.storage.from(bucket).remove(paths)");
    expect(accountDelete).toContain("requireAal2(claims)");
    expect(accountDelete).toContain('confirm !== "DELETE MY ACCOUNT"');
    expect(accountDelete).toContain("recordAudit");
    expect(accountDelete).toContain("recordSecurityEvent");
  });

  it("keeps the readiness matrix pointed at this storage policy guard", () => {
    const matrix = read("scripts/qa/platform-readiness-matrix.mjs");
    const workflow = read("src/test/workflows/storage-media-workflow.test.ts");
    const contractScript = read("scripts/qa/storage-media-contracts.mjs");

    expect(matrix).toContain("src/test/storageBucketPolicies.test.ts");
    expect(matrix).toContain("npm run qa:storage-media-contracts");
    expect(matrix).toContain("npm run platform:test:storage-media");
    expect(workflow).toContain("keeps public feed and story media scoped to owner-prefixed upload paths");

    for (const contractId of [
      "public-owner-prefixed-post-media",
      "public-owner-prefixed-story-media",
      "protected-chat-and-ppv-media",
      "owner-admin-store-media",
      "client-staff-documents-and-cleanup",
      "receipts-and-share-links",
    ]) {
      expect(contractScript).toContain(contractId);
    }
  });
});
