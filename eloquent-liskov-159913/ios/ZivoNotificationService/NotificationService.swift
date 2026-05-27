//
//  NotificationService.swift
//  ZivoNotificationService
//
//  Notification Service Extension for the Zivo iOS app.
//
//  Receives every APNs payload that has `mutable-content: 1` (which
//  send-push-notification sets unconditionally) and:
//    • Downloads the `image_url` from the data payload, if present, and
//      attaches it so the user sees a rich preview / banner image.
//    • Bumps the badge count if `badge_increment` is supplied.
//
//  IMPORTANT — Xcode setup (one-time, must be done manually):
//    1. In Xcode: File → New → Target → Notification Service Extension.
//       - Product Name: ZivoNotificationService
//       - Bundle Identifier: com.hizovo.app.ZivoNotificationService
//       - Embed in: App
//    2. Replace the auto-generated NotificationService.swift with THIS file.
//    3. Make sure the deployment target matches the host app (iOS 14+).
//    4. In the extension's Info.plist, the auto-generated NSExtension dict
//       (NSExtensionPointIdentifier = com.apple.usernotifications.service) is
//       correct — leave it.
//    5. Run `npx cap sync ios` after pulling, then archive in Xcode.
//
//  Sandbox/security notes:
//    • Image downloads use URLSession with a 25 s timeout (Apple gives the
//      extension ~30 s before serviceExtensionTimeWillExpire fires).
//    • The downloaded file is saved to NSTemporaryDirectory() with the
//      original extension preserved (UTType picks the right one).
//    • If anything fails we fall through to contentHandler(bestAttempt) so
//      the notification still lands, just without the image attachment.
//

import UserNotifications
import UniformTypeIdentifiers

final class NotificationService: UNNotificationServiceExtension {

    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        self.bestAttemptContent =
            request.content.mutableCopy() as? UNMutableNotificationContent

        guard let bestAttempt = bestAttemptContent else {
            contentHandler(request.content)
            return
        }

        // Optional badge increment from payload.
        if let inc = bestAttempt.userInfo["badge_increment"] as? Int,
           let current = bestAttempt.badge?.intValue
        {
            bestAttempt.badge = NSNumber(value: current + inc)
        }

        // Pull image URL from either top-level `image_url` or `data.image_url`.
        let raw = (bestAttempt.userInfo["image_url"] as? String)
            ?? ((bestAttempt.userInfo["data"] as? [String: Any])?["image_url"] as? String)

        guard let urlString = raw,
              let imageUrl = URL(string: urlString),
              imageUrl.scheme?.hasPrefix("http") == true
        else {
            contentHandler(bestAttempt)
            return
        }

        downloadAttachment(from: imageUrl) { [weak self] attachment in
            guard let self = self, let bestAttempt = self.bestAttemptContent else { return }
            if let attachment = attachment {
                bestAttempt.attachments = [attachment]
            }
            self.contentHandler?(bestAttempt)
        }
    }

    /// Apple gives the service extension ~30 s; if we run out we deliver
    /// whatever we have (image attempt may have failed).
    override func serviceExtensionTimeWillExpire() {
        if let handler = contentHandler, let best = bestAttemptContent {
            handler(best)
        }
    }

    // MARK: - Download

    private func downloadAttachment(
        from url: URL,
        completion: @escaping (UNNotificationAttachment?) -> Void
    ) {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 25
        config.timeoutIntervalForResource = 25
        let session = URLSession(configuration: config)

        let task = session.downloadTask(with: url) { tempUrl, response, error in
            guard error == nil, let tempUrl = tempUrl else {
                completion(nil); return
            }

            // Preserve a sensible file extension so iOS can determine UTType.
            let mime = response?.mimeType ?? "image/jpeg"
            let ext: String
            if let ut = UTType(mimeType: mime), let preferred = ut.preferredFilenameExtension {
                ext = preferred
            } else {
                ext = url.pathExtension.isEmpty ? "jpg" : url.pathExtension
            }

            let dest = URL(
                fileURLWithPath: NSTemporaryDirectory()
            ).appendingPathComponent(UUID().uuidString + "." + ext)

            do {
                try FileManager.default.moveItem(at: tempUrl, to: dest)
                let attachment = try UNNotificationAttachment(
                    identifier: "image",
                    url: dest,
                    options: nil
                )
                completion(attachment)
            } catch {
                completion(nil)
            }
        }

        task.resume()
    }
}
