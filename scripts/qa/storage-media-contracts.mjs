#!/usr/bin/env node
/**
 * Storage/media access contract check.
 *
 * Verifies the high-level Supabase Storage model used by the app:
 * public media stays owner-prefixed, protected media uses signed/unlock paths,
 * owner/store media keeps owner/admin policies, and client/staff cleanup/document
 * paths stay scoped.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function source(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  return readFileSync(file, "utf8");
}

function requireContains(id, text, needle, relativePath) {
  if (!text.includes(needle)) {
    failures.push(`${id}: ${relativePath} missing ${JSON.stringify(needle)}`);
  }
}

const contracts = [
  {
    id: "public-owner-prefixed-post-media",
    category: "public",
    check() {
      const migrationPath = "supabase/migrations/20260408205546_48a59ef3-3ccb-4275-bbeb-602b7561abb8.sql";
      const composerPath = "src/components/profile/ProfileContentTabs.tsx";
      const migration = source(migrationPath);
      const composer = source(composerPath);
      requireContains(this.id, migration, "VALUES ('user-posts', 'user-posts', true)", migrationPath);
      requireContains(this.id, migration, "auth.uid()::text = (storage.foldername(name))[1]", migrationPath);
      requireContains(this.id, migration, "Users can delete their own post media", migrationPath);
      requireContains(this.id, composer, 'supabase.storage.from("user-posts").upload(objectPath', composerPath);
      requireContains(this.id, composer, 'supabase.storage.from("user-posts").getPublicUrl(objectPath)', composerPath);
    },
  },
  {
    id: "public-owner-prefixed-story-media",
    category: "public",
    check() {
      const basePath = "supabase/migrations/20260330155158_6c027947-9436-48f9-a223-081590f34bfc.sql";
      const updatePath = "supabase/migrations/20260409043104_17790118-7ba0-431d-b70b-b6a8a6172d46.sql";
      const composerPath = "src/components/profile/CreateStorySheet.tsx";
      const base = source(basePath);
      const update = source(updatePath);
      const composer = source(composerPath);
      requireContains(this.id, base, "VALUES ('user-stories', 'user-stories', true)", basePath);
      requireContains(this.id, base, "expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')", basePath);
      requireContains(this.id, update, "(storage.foldername(name))[1] = auth.uid()::text", updatePath);
      requireContains(this.id, composer, 'supabase.storage.from("user-stories").getPublicUrl(path)', composerPath);
      requireContains(this.id, composer, 'supabase.storage.from("user-stories").remove([path])', composerPath);
    },
  },
  {
    id: "protected-chat-and-ppv-media",
    category: "protected",
    check() {
      const chatHardeningPath = "supabase/migrations/20260429230000_security_hardening.sql";
      const chatPolicyPath = "supabase/migrations/20260527163358_restore_chat_media_storage_policy.sql";
      const chatFilesPath = "supabase/migrations/20260426203907_087e023a-2011-42a8-8dc9-bae36950ca6c.sql";
      const ppvPath = "supabase/migrations/20260528000001_creator_type_and_ppv.sql";
      const signedMediaPath = "src/lib/security/signedMedia.ts";
      const chatHardening = source(chatHardeningPath);
      const chatPolicy = source(chatPolicyPath);
      const chatFiles = source(chatFilesPath);
      const ppv = source(ppvPath);
      const signedMedia = source(signedMediaPath);
      requireContains(this.id, chatHardening, "set public = false", chatHardeningPath);
      requireContains(this.id, chatHardening, "where id in ('chat-media-files', 'chat_uploads')", chatHardeningPath);
      requireContains(this.id, chatPolicy, "media_unlocks mu", chatPolicyPath);
      requireContains(this.id, chatFiles, "VALUES ('chat-files', 'chat-files', false)", chatFilesPath);
      requireContains(this.id, ppv, "VALUES ('ppv-media', 'ppv-media', false)", ppvPath);
      requireContains(this.id, ppv, "ppv_media_owner_or_unlocker_read", ppvPath);
      requireContains(this.id, signedMedia, "createSignedUrl(path, ttlSec)", signedMediaPath);
    },
  },
  {
    id: "owner-admin-store-media",
    category: "owner",
    check() {
      const migrationPath = "supabase/migrations/20260422040327_e43a342a-1e41-4def-ad26-9fbdde280970.sql";
      const rlsTestPath = "src/test/rls/storeAssetsRls.test.ts";
      const uploadHelperPath = "src/pages/admin/utils/uploadStoreAsset.ts";
      const migration = source(migrationPath);
      const rlsTest = source(rlsTestPath);
      const uploadHelper = source(uploadHelperPath);
      requireContains(this.id, migration, "Store owners can upload own store-assets", migrationPath);
      requireContains(this.id, migration, "owner_store.owner_id = auth.uid()", migrationPath);
      requireContains(this.id, migration, "WITH CHECK", migrationPath);
      requireContains(this.id, rlsTest, "Owner A CANNOT upload to Store B's folder", rlsTestPath);
      requireContains(this.id, rlsTest, "Admin can delete an object in another store's folder", rlsTestPath);
      requireContains(this.id, uploadHelper, 'supabase.storage.from("store-assets")', uploadHelperPath);
    },
  },
  {
    id: "client-staff-documents-and-cleanup",
    category: "client-staff",
    check() {
      const documentsHookPath = "src/hooks/store/useStoreDocuments.ts";
      const documentManagePath = "supabase/functions/store-document-manage/index.ts";
      const shopOpsManagePath = "supabase/functions/shop-ops-record-manage/index.ts";
      const documentsGatePath = "supabase/migrations/20260601214500_store_documents_server_gate.sql";
      const accountDeletePath = "supabase/functions/account-delete-self/index.ts";
      const employeeWorkflowPath = "src/test/workflows/client-staff-workflow.test.ts";
      const documentsHook = source(documentsHookPath);
      const documentManage = source(documentManagePath);
      const shopOpsManage = source(shopOpsManagePath);
      const documentsGate = source(documentsGatePath);
      const accountDelete = source(accountDeletePath);
      const employeeWorkflow = source(employeeWorkflowPath);
      requireContains(this.id, documentsHook, 'const BUCKET = "store-documents"', documentsHookPath);
      requireContains(this.id, documentsHook, "assertStoreDocumentPath", documentsHookPath);
      requireContains(this.id, documentsHook, "filePath.startsWith(`${storeId}/`)", documentsHookPath);
      requireContains(this.id, documentsHook, ".createSignedUrl(filePath, expiresInSec)", documentsHookPath);
      requireContains(this.id, documentsHook, 'functions.invoke("store-document-manage"', documentsHookPath);
      requireContains(this.id, documentManage, 'withSecurity("store-document-manage"', documentManagePath);
      requireContains(this.id, documentManage, 'allowedMethods: ["POST"]', documentManagePath);
      requireContains(this.id, documentManage, "admin.auth.getUser(token)", documentManagePath);
      requireContains(this.id, documentManage, "pathBelongsToDocument", documentManagePath);
      requireContains(this.id, documentManage, "admin.storage.from(BUCKET).remove", documentManagePath);
      requireContains(this.id, shopOpsManage, 'withSecurity(\n    "shop-ops-record-manage"', shopOpsManagePath);
      requireContains(this.id, shopOpsManage, 'allowedMethods: ["POST"]', shopOpsManagePath);
      requireContains(this.id, shopOpsManage, "storage.from(BUCKET).remove([storagePath])", shopOpsManagePath);
      requireContains(this.id, documentsGate, "Store document inserts require trusted server-side validation", documentsGatePath);
      requireContains(this.id, documentsGate, "REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_documents FROM anon, authenticated", documentsGatePath);
      for (const bucket of [
        '"chat-media-files"',
        '"chat_uploads"',
        '"chat-files"',
        '"voice-notes"',
        '"user-posts"',
        '"user-stories"',
        '"covers"',
        '"cv-photos"',
      ]) {
        requireContains(this.id, accountDelete, bucket, accountDeletePath);
      }
      requireContains(this.id, accountDelete, "await sb.storage.from(bucket).remove(paths)", accountDeletePath);
      requireContains(this.id, employeeWorkflow, "claim_employee_invite", employeeWorkflowPath);
    },
  },
  {
    id: "receipts-and-share-links",
    category: "protected",
    check() {
      const signedUrlPath = "supabase/functions/get-receipt-signed-url/index.ts";
      const shareReceiptPath = "supabase/functions/share-lodging-receipt/index.ts";
      const tripReceiptPath = "supabase/functions/generate-trip-receipt/index.ts";
      const signedUrl = source(signedUrlPath);
      const shareReceipt = source(shareReceiptPath);
      const tripReceipt = source(tripReceiptPath);
      requireContains(this.id, signedUrl, "createSignedUrl(receipt.pdf_path, 3600)", signedUrlPath);
      requireContains(this.id, signedUrl, "receipt.user_id === user.id", signedUrlPath);
      requireContains(this.id, shareReceipt, "token_hash", shareReceiptPath);
      requireContains(this.id, shareReceipt, "expires_at", shareReceiptPath);
      requireContains(this.id, tripReceipt, 'admin.storage.from("trip-receipts").upload(path, bytes', tripReceiptPath);
      requireContains(this.id, tripReceipt, "isServiceRoleRequest(req, serviceKey)", tripReceiptPath);
    },
  },
];

for (const contract of contracts) contract.check();

console.log(JSON.stringify({
  generated: new Date().toISOString(),
  counts: {
    contracts: contracts.length,
    failures: failures.length,
  },
  contracts: contracts.map(({ id, category }) => ({ id, category })),
  failures,
}, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
