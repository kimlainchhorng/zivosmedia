import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test.describe("media upload, delete, and retention contracts", () => {
  test("profile post uploads strip metadata, use owner-prefixed storage, and delete owned objects", async () => {
    const profileTabs = read("src/components/profile/ProfileContentTabs.tsx");
    const stripMetadata = read("src/utils/stripImageMetadata.ts");
    const userPostsPolicy = read("supabase/migrations/20260408205546_48a59ef3-3ccb-4275-bbeb-602b7561abb8.sql");

    expect(profileTabs).toContain("stripImageMetadata(file)");
    expect(profileTabs).toContain('supabase.storage.from("user-posts").upload(objectPath');
    expect(profileTabs).toContain("upsert: false");
    expect(profileTabs).toContain('supabase.storage.from("user-posts").getPublicUrl(objectPath)');
    expect(profileTabs).toContain('parseUserPostStorageKey');
    expect(profileTabs).toContain('supabase.storage.from("user-posts").remove([storageKey])');
    expect(profileTabs).toContain("storageKey?.startsWith(`${user.id}/`)");

    expect(stripMetadata).toContain("canvas.toBlob");
    expect(stripMetadata).toContain("image/jpeg");

    expect(userPostsPolicy).toContain("Authenticated users can upload their own post media");
    expect(userPostsPolicy).toContain("Users can delete their own post media");
    expect(userPostsPolicy).toContain("auth.uid()::text = (storage.foldername(name))[1]");
  });

  test("story uploads roll back storage on database failure and expire after 24 hours", async () => {
    const storySheet = read("src/components/profile/CreateStorySheet.tsx");
    const storyBase = read("supabase/migrations/20260330155158_6c027947-9436-48f9-a223-081590f34bfc.sql");
    const storyCleanup = read("supabase/migrations/20260425125623_b8a44e76-05d3-48ec-ad20-106b386734c7.sql");
    const storyQa = read("docs/qa/stories-e2e-2026-04-25.md");

    expect(storySheet).toContain('createSignedUploadUrl(path, { upsert: true })');
    expect(storySheet).toContain("xhrUpload(signed.signedUrl");
    expect(storySheet).toContain('supabase.storage.from("user-stories").getPublicUrl(path)');
    expect(storySheet).toContain('.from("stories" as any).insert');
    expect(storySheet).toContain('supabase.storage.from("user-stories").remove([path])');
    expect(storySheet).toContain("Story saved to storage but database insert failed");

    expect(storyBase).toContain("expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')");
    expect(storyBase).toContain("Anyone can view active stories");
    expect(storyCleanup).toContain("CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()");
    expect(storyCleanup).toContain("SECURITY DEFINER");
    expect(storyCleanup).toContain("WHERE expires_at < now()");
    expect(storyCleanup).toContain("name LIKE expired_rows.user_id::text || '/' || expired_rows.id::text || '/%'");
    expect(storyCleanup).toContain("DELETE FROM public.stories WHERE id = ANY(expired_ids)");

    expect(storyQa).toContain("stories-cleanup-hourly");
    expect(storyQa).toContain("Storage cleanup on failed insert");
    expect(storyQa).toContain("24h auto-expiry");
  });

  test("private media downloads use signed URLs and account deletion cleans owned media buckets", async () => {
    const signedMedia = read("src/lib/security/signedMedia.ts");
    const chatFiles = read("src/hooks/useChatFiles.ts");
    const storeDocuments = read("src/hooks/store/useStoreDocuments.ts");
    const accountDelete = read("supabase/functions/account-delete-self/index.ts");
    const receiptSignedUrl = read("supabase/functions/get-receipt-signed-url/index.ts");

    expect(signedMedia).toContain("createSignedUrl(path, ttlSec)");
    expect(signedMedia).toContain("download:  60 * 60 * 24");
    expect(chatFiles).toContain(".createSignedUrl(path, 60 * 60)");
    expect(storeDocuments).toContain(".createSignedUrl(filePath, expiresInSec)");
    expect(receiptSignedUrl).toContain("createSignedUrl(receipt.pdf_path, 3600)");
    expect(receiptSignedUrl).toContain("receipt.user_id === user.id");

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

    expect(accountDelete).toContain("requireAal2(claims)");
    expect(accountDelete).toContain('confirm !== "DELETE MY ACCOUNT"');
    expect(accountDelete).toContain("await sb.storage.from(bucket).list(userId");
    expect(accountDelete).toContain("await sb.storage.from(bucket).remove(paths)");
  });

  test("readiness and storage policy suites track this E2E media retention guard", async () => {
    const matrix = read("scripts/qa/platform-readiness-matrix.mjs");
    const storagePolicyTest = read("src/test/storageBucketPolicies.test.ts");
    const storageWorkflow = read("src/test/workflows/storage-media-workflow.test.ts");
    const contractScript = read("scripts/qa/storage-media-contracts.mjs");

    expect(matrix).toContain("tests/e2e/media-upload-delete-retention.spec.ts");
    expect(matrix).toContain("npm run qa:database-storage-contracts");
    expect(matrix).toContain("npm run qa:storage-media-contracts");
    expect(matrix).toContain("npm run platform:test:storage-media");
    expect(matrix).toContain("signed media, upload validation");
    expect(storagePolicyTest).toContain("keeps account deletion cleanup aligned with user media buckets");
    expect(storageWorkflow).toContain("keeps upload fallback, cleanup, CDN cache, and media performance checks wired");
    expect(contractScript).toContain("client-staff-documents-and-cleanup");
    expect(contractScript).toContain("receipts-and-share-links");
  });
});
