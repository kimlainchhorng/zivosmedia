# MiMo run — 2026-06-14T11:56:21.555Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility only, no visual or logic change. Customer ResolutionCaseDetail page, English only, not bilingual. There is NO framer-motion so no useReducedMotion. The Skeleton components are shadcn primitives so do not touch them. Changes: One: the header back button is a shadcn Button variant ghost size icon, icon only with an ArrowLeft and no visible text, add aria-label Back to the Button and aria-hidden true to the ArrowLeft icon. Two: the Evidence thumbnails are anchor links each wrapping only an ImageIcon with no visible text, add aria-label View evidence to each anchor and aria-hidden true to the ImageIcon. Three: inside the message timeline the View attachment link already has visible text next to a decorative FileImage icon, add aria-hidden true to the FileImage. Four: the file-upload button is a shadcn Button variant ghost size icon, icon only, it shows a raw CSS animate-spin Loader2 while pending else an Upload icon, add aria-label Attach file to the Button, append motion-reduce colon animate-none to the Loader2 className, and add aria-hidden true to both the Loader2 and the Upload icon. Five: the send button is a shadcn Button size icon, icon only, it shows a raw CSS animate-spin Loader2 while pending else a Send icon, add aria-label Send message to the Button, append motion-reduce colon animate-none to the Loader2 className, and add aria-hidden true to both the Loader2 and the Send icon. Six: the message text Input has only a placeholder and no associated label, add aria-label Type a message to the Input. The only raw heading is the h1 case subject so leave headings alone. Do not touch shadcn Button Input Skeleton Badge internals beyond adding aria props, and do not touch the resolution hooks.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/customer/ResolutionCaseDetail.tsx

---

## 1. Plan

Six purely additive accessibility edits in `src/pages/customer/ResolutionCaseDetail.tsx`. No logic, no visual, no hook changes. All changes are `aria-*` attributes on existing JSX and one `motion-reduce:animate-none` className addition on spinning Loader2 icons.

| # | Control | What to add |
|---|---------|-------------|
| 1 | Header back `<Button>` | `aria-label="Back"` on Button, `aria-hidden="true"` on ArrowLeft |
| 2 | Evidence `<a>` thumbnails | `aria-label="View evidence"` on each `<a>`, `aria-hidden="true"` on ImageIcon |
| 3 | "View attachment" `<a>` | `aria-hidden="true"` on FileImage (link already has visible text) |
| 4 | File-upload `<Button>` | `aria-label="Attach file"` on Button, `aria-hidden="true"` on both Loader2 + Upload, `motion-reduce:animate-none` on Loader2 |
| 5 | Send `<Button>` | `aria-label="Send message"` on Button, `aria-hidden="true"` on both Loader2 + Send, `motion-reduce:animate-none` on Loader2 |
| 6 | Message `<Input>` | `aria-label="Type a message"` on Input |

---

## 2. Diff

```diff
--- a/src/pages/customer/ResolutionCaseDetail.tsx
+++ b/src/pages/customer/ResolutionCaseDetail.tsx
@@ HEADER BACK BUTTON @@
-        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10">
-          <ArrowLeft className="h-5 w-5" />
+        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10" aria-label="Back">
+          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
         </Button>

@@ EVIDENCE THUMBNAILS @@
-              <a key={e.id} href={e.file_url} target="_blank" rel="noopener noreferrer"
+              <a key={e.id} href={e.file_url} target="_blank" rel="noopener noreferrer" aria-label="View evidence"
                 className="shrink-0 w-16 h-16 rounded-lg bg-muted flex items-center justify-center border border-border hover:border-primary transition-colors"
               >
-                <ImageIcon className="w-6 h-6 text-muted-foreground" />
+                <ImageIcon className="w-6 h-6 text-muted-foreground" aria-hidden="true" />

@@ VIEW ATTACHMENT LINK (icon only — text stays) @@
-                    <FileImage className="w-3 h-3" /> View attachment
+                    <FileImage className="w-3 h-3" aria-hidden="true" /> View attachment

@@ FILE UPLOAD BUTTON @@
           <Button
             variant="ghost"
             size="icon"
             onClick={() => fileRef.current?.click()}
             disabled={uploadEvidence.isPending}
+            aria-label="Attach file"
           >
             {uploadEvidence.isPending ? (
-              <Loader2 className="w-4 h-4 animate-spin" />
+              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
             ) : (
-              <Upload className="w-4 h-4" />
+              <Upload className="w-4 h-4" aria-hidden="true" />
             )}
           </Button>

@@ SEND BUTTON @@
-          <Button size="icon" onClick={handleSend} disabled={!newMsg.trim() || sendMessage.isPending}>
+          <Button size="icon" onClick={handleSend} disabled={!newMsg.trim() || sendMessage.isPending} aria-label="Send message">
             {sendMessage.isPending ? (
-              <Loader2 className="w-4 h-4 animate-spin" />
+              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
             ) : (
-              <Send className="w-4 h-4" />
+              <Send className="w-4 h-4" aria-hidden="true" />
             )}
           </Button>

@@ MESSAGE INPUT @@
           <Input
             placeholder="Type a message..."
+            aria-label="Type a message"
             value={newMsg}
```

---

## 3. Owner verification

- **File path**: confirm the file lives at `src/pages/customer/ResolutionCaseDetail.tsx` in the repo (the context path showed `../zivodriver/` — it may be under a domain-specific subfolder; adjust the path if needed).
- **Run `npm run update`** (type-check + worker type-check + production build) — must be 0 errors. All edits are JSX attribute additions on existing elements, so no new imports or type issues expected.
- **No logic/visual change**: the `aria-label`, `aria-hidden`, and `motion-reduce:animate-none` additions are purely additive for screen readers and `prefers-reduced-motion`. No layout, color, or interaction behavior is altered.
