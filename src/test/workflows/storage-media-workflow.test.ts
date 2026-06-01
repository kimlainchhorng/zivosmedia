import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("storage, media, CDN, and downloads workflow", () => {
  it("keeps public feed and story media scoped to owner-prefixed upload paths", () => {
    const userPosts = read("supabase/migrations/20260408205546_48a59ef3-3ccb-4275-bbeb-602b7561abb8.sql");
    const storiesTable = read("supabase/migrations/20260330155158_6c027947-9436-48f9-a223-081590f34bfc.sql");
    const storyUpdates = read("supabase/migrations/20260409043104_17790118-7ba0-431d-b70b-b6a8a6172d46.sql");
    const postComposer = read("src/components/profile/ProfileContentTabs.tsx");
    const storyComposer = read("src/components/profile/CreateStorySheet.tsx");

    expect(userPosts).toContain("VALUES ('user-posts', 'user-posts', true)");
    expect(userPosts).toContain("Anyone can view user post media");
    expect(userPosts).toContain("Authenticated users can upload their own post media");
    expect(userPosts).toContain("auth.uid()::text = (storage.foldername(name))[1]");
    expect(userPosts).toContain("Users can update their own post media");
    expect(userPosts).toContain("Users can delete their own post media");

    expect(storiesTable).toContain("expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')");
    expect(storiesTable).toContain("Anyone can view active stories");
    expect(storiesTable).toContain("Users can delete own stories");
    expect(storiesTable).toContain("INSERT INTO storage.buckets (id, name, public) VALUES ('user-stories', 'user-stories', true)");
    expect(storyUpdates).toContain("Users can update own story media");
    expect(storyUpdates).toContain("(storage.foldername(name))[1] = auth.uid()::text");

    expect(postComposer).toContain('supabase.storage.from("user-posts").upload(objectPath');
    expect(postComposer).toContain('supabase.storage.from("user-posts").getPublicUrl(objectPath)');
    expect(storyComposer).toContain('supabase.storage.from("user-stories").getPublicUrl(path)');
    expect(storyComposer).toContain('supabase.storage.from("user-stories").remove([path])');
  });

  it("keeps private chat, file, and PPV media behind signed URLs and unlock rules", () => {
    const chatHardening = read("supabase/migrations/20260429230000_security_hardening.sql");
    const chatPolicyRestore = read("supabase/migrations/20260527163358_restore_chat_media_storage_policy.sql");
    const chatFiles = read("supabase/migrations/20260426203907_087e023a-2011-42a8-8dc9-bae36950ca6c.sql");
    const ppv = read("supabase/migrations/20260528000001_creator_type_and_ppv.sql");
    const signedMedia = read("src/lib/security/signedMedia.ts");
    const useChatFiles = read("src/hooks/useChatFiles.ts");
    const personalChat = read("src/components/chat/PersonalChat.tsx");
    const ppvDetail = read("src/components/ppv/PPVPostDetail.tsx");

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
    expect(useChatFiles).toContain(".createSignedUrl(path, 60 * 60)");
    expect(useChatFiles).toContain("url: path");
    expect(useChatFiles).toContain("thumbnail_url: thumbPath");

    expect(ppv).toContain("VALUES ('ppv-media', 'ppv-media', false)");
    expect(ppv).toContain("ppv_media_owner_upload");
    expect(ppv).toContain("ppv_media_owner_or_unlocker_read");
    expect(ppv).toContain("JOIN public.ppv_posts p ON p.id = u.ppv_id");
    expect(ppv).toContain("u.unlocker_id = auth.uid()");

    expect(signedMedia).toContain("createSignedUrl(path, ttlSec)");
    expect(signedMedia).toContain("display:   60 * 60");
    expect(signedMedia).toContain("download:  60 * 60 * 24");
    expect(signedMedia).toContain("thumbnail: 60 * 60 * 6");
    expect(personalChat).toContain("signedUrlFor(CHAT_MEDIA_BUCKET");
    expect(ppvDetail).toContain('signedUrlsFor("ppv-media"');
  });

  it("keeps receipt downloads and signed receipt URLs behind strict wrapper security", () => {
    const receiptRoutes = [
      "eats-order-receipt",
      "grocery-order-receipt",
      "lodging-reservation-receipt",
      "share-lodging-receipt",
      "get-receipt-signed-url",
    ];

    for (const route of receiptRoutes) {
      const source = read(`supabase/functions/${route}/index.ts`);
      expect(source).toContain(`withSecurity("${route}"`);
      expect(source).toContain("const corsHeaders = ctx.corsHeaders");
      expect(source).toContain("strictCors: true");
      expect(source).toContain('trackNetwork: "suspicious"');
      expect(source).toContain("blockNetworkRiskAt: 80");
      expect(source).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    const signedUrl = read("supabase/functions/get-receipt-signed-url/index.ts");
    expect(signedUrl).toContain('createSignedUrl(receipt.pdf_path, 3600)');
    expect(signedUrl).toContain("receipt.user_id === user.id");

    const sharedReceipt = read("supabase/functions/share-lodging-receipt/index.ts");
    expect(sharedReceipt).toContain("token_hash");
    expect(sharedReceipt).toContain("expires_at");
    expect(sharedReceipt).toContain("access_count");
  });

  it("keeps trip receipts and trip share links behind strict wrapper security", () => {
    const tripRoutes = [
      "generate-trip-receipt",
      "create-trip-share",
      "get-shared-trip",
    ];

    for (const route of tripRoutes) {
      const source = read(`supabase/functions/${route}/index.ts`);
      expect(source).toContain(`withSecurity("${route}"`);
      expect(source).toContain("const corsHeaders = ctx.corsHeaders");
      expect(source).toContain("strictCors: true");
      expect(source).toContain('trackNetwork: "suspicious"');
      expect(source).toContain("blockNetworkRiskAt: 80");
      expect(source).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    const generator = read("supabase/functions/generate-trip-receipt/index.ts");
    expect(generator).toContain("isServiceRoleRequest(req, serviceKey)");
    expect(generator).toContain("skipBotDetection: true");
    expect(generator).toContain('admin.storage.from("trip-receipts").upload(path, bytes');

    const createShare = read("supabase/functions/create-trip-share/index.ts");
    expect(createShare).toContain('allowedMethods: ["POST"]');
    expect(createShare).toContain('admin.from("ride_requests").select("id, user_id")');
    expect(createShare).toContain("ride.user_id !== userId");
    expect(createShare).toContain("trip_shares");

    const sharedTrip = read("supabase/functions/get-shared-trip/index.ts");
    expect(sharedTrip).toContain("expires_at");
    expect(sharedTrip).toContain("revoked");
    expect(sharedTrip).toContain("Link expired or invalid");
  });

  it("keeps store, business, and owner media covered by owner/admin storage rules", () => {
    const storeAssets = read("supabase/migrations/20260422040327_e43a342a-1e41-4def-ad26-9fbdde280970.sql");
    const storeDocumentsGate = read("supabase/migrations/20260601214500_store_documents_server_gate.sql");
    const storeDocumentManage = read("supabase/functions/store-document-manage/index.ts");
    const storeAssetsRls = read("src/test/rls/storeAssetsRls.test.ts");
    const storeDocuments = read("src/hooks/store/useStoreDocuments.ts");
    const storeSetup = read("src/pages/store/StoreSetup.tsx");
    const businessWizard = read("src/pages/business/BusinessPageWizard.tsx");
    const uploadStoreAsset = read("src/pages/admin/utils/uploadStoreAsset.ts");

    expect(storeAssets).toContain("Store owners can upload own store-assets");
    expect(storeAssets).toContain("Store owners can update own store-assets");
    expect(storeAssets).toContain("Store owners can delete own store-assets");
    expect(storeAssets).toContain("owner_store.owner_id = auth.uid()");
    expect(storeAssets).toContain("owner_store.id::text = (storage.foldername((storage.objects.name)::text))[1]");
    expect(storeAssets).toContain("WITH CHECK");

    expect(storeAssetsRls).toContain("Owner A can upload gallery image");
    expect(storeAssetsRls).toContain("Owner A CANNOT upload to Store B's folder");
    expect(storeAssetsRls).toContain("Owner A CANNOT delete an object owned by Store B");
    expect(storeAssetsRls).toContain("Admin can write to an arbitrary store folder");
    expect(storeAssetsRls).toContain("Admin can delete an object in another store's folder");

    expect(storeDocuments).toContain("const BUCKET = \"store-documents\"");
    expect(storeDocuments).toContain("assertStoreDocumentPath");
    expect(storeDocuments).toContain("filePath.startsWith(`${storeId}/`)");
    expect(storeDocuments).toContain(".createSignedUrl(filePath, expiresInSec)");
    expect(storeDocuments).toContain('functions.invoke("store-document-manage"');
    expect(storeDocuments).not.toMatch(/from\("store_documents"\)[\s\S]{0,320}\.(insert|update|delete|upsert)/);
    expect(storeDocumentManage).toContain('withSecurity("store-document-manage"');
    expect(storeDocumentManage).toContain("strictCors: true");
    expect(storeDocumentManage).toContain('allowedMethods: ["POST"]');
    expect(storeDocumentManage).toContain("admin.auth.getUser(token)");
    expect(storeDocumentManage).toContain('.from("store_documents")');
    expect(storeDocumentManage).toContain('.from("store_profiles")');
    expect(storeDocumentManage).toContain('rpc("has_role"');
    expect(storeDocumentManage).toContain(`admin.storage.from(BUCKET).remove`);
    expect(storeDocumentsGate).toContain("Store document inserts require trusted server-side validation");
    expect(storeDocumentsGate).toContain("Store document updates require trusted server-side validation");
    expect(storeDocumentsGate).toContain("Store document deletes require trusted server-side validation");
    expect(storeDocumentsGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_documents FROM anon, authenticated");

    for (const source of [storeSetup, businessWizard, uploadStoreAsset]) {
      expect(source).toContain('supabase.storage.from("store-assets")');
      expect(source).toMatch(/upload\(/);
      expect(source).toContain("getPublicUrl");
    }
  });

  it("keeps upload fallback, cleanup, CDN cache, and media performance checks wired", () => {
    const uploadWithProgress = read("src/utils/uploadWithProgress.ts");
    const serverUploadSecurity = read("supabase/functions/_shared/fileUpload.ts");
    const clientUploadSecurity = read("src/lib/security/fileUploadSecurity.ts");
    const serviceWorker = read("src/sw.js");
    const mediaCheck = read("scripts/performance/media-readiness-check.mjs");
    const smartImage = read("src/components/shared/SmartImage.tsx");
    const lazyVideo = read("src/components/shared/LazyVideo.tsx");
    const platformWorkflow = read("docs/platform-upgrade-workflow.md");
    const endToEnd = read("docs/end-to-end-platform-readiness.md");

    expect(uploadWithProgress).toContain("xhr.upload.onprogress");
    expect(uploadWithProgress).toContain("x-upsert");
    expect(uploadWithProgress).toContain("schema is invalid or incompatible");
    expect(uploadWithProgress).toContain("Capacitor's WKWebView");
    expect(uploadWithProgress).toContain(".upload(filePath, file, { upsert: false");

    for (const source of [serverUploadSecurity, clientUploadSecurity]) {
      expect(source).toContain("File name contains an unsafe path sequence");
      expect(source).toContain(".svg");
      expect(source).toContain("File is empty");
    }
    expect(serverUploadSecurity).toContain("File contains potentially dangerous embedded content");
    expect(serverUploadSecurity).toContain("<svg\\b");

    expect(serviceWorker).toContain("supabase-storage-cache");
    expect(serviceWorker).toContain("/storage/v1/object/public/");
    expect(serviceWorker).toContain("StaleWhileRevalidate");
    expect(serviceWorker).toContain("maxEntries: 300");
    expect(serviceWorker).toContain("maxAgeSeconds: 60 * 60 * 24 * 7");

    expect(mediaCheck).toContain("img missing loading");
    expect(mediaCheck).toContain("video missing preload policy/LazyVideo");
    expect(smartImage).toContain('loading={eager ? "eager" : "lazy"}');
    expect(smartImage).toContain('decoding="async"');
    expect(lazyVideo).toContain('preload = "metadata"');
    expect(lazyVideo).toContain("IntersectionObserver");

    expect(platformWorkflow).toContain("npm run perf:media-report");
    expect(endToEnd).toContain("Media upload, preview, protected download, retention, and deletion flows are documented.");
    expect(endToEnd).toContain("Storage upsert works only where intended.");
  });

  it("keeps the generated workflow plan pointed at this storage-media guard", () => {
    const planScript = read("scripts/qa/workflow-test-plan.mjs");
    const coverageScript = read("scripts/qa/workflow-coverage.mjs");
    const contractScript = read("scripts/qa/storage-media-contracts.mjs");
    const plan = read("docs/workflow-test-plan.md");
    const roadmap = read("docs/zivo-full-platform-update-roadmap.md");
    const packageJson = read("package.json");

    expect(planScript).toContain("storage-media-cdn");
    expect(planScript).toContain("src/test/fileUploadSecurity.test.ts");
    expect(planScript).toContain("npm run platform:test:storage-media");
    expect(coverageScript).toContain("qa:storage-media-contracts");
    expect(contractScript).toContain("public-owner-prefixed-post-media");
    expect(contractScript).toContain("protected-chat-and-ppv-media");
    expect(contractScript).toContain("owner-admin-store-media");
    expect(contractScript).toContain("client-staff-documents-and-cleanup");
    expect(plan).toContain("Storage, Media, CDN, Downloads");
    expect(plan).toContain("npm run platform:test:storage-media");
    expect(roadmap).toContain("Add storage/media tests for public, owner-only, client-only, and protected media.");
    expect(packageJson).toContain('"platform:test:storage-media"');
    expect(packageJson).toContain('"qa:storage-media-contracts"');
    expect(packageJson).toContain("npm run qa:storage-media-contracts");
  });
});
