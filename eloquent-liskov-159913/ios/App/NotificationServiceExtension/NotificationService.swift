import UserNotifications
import Intents

class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?
    private var downloadTask: URLSessionTask?

    private static let downloadSession: URLSession = {
        let cfg = URLSessionConfiguration.ephemeral
        cfg.timeoutIntervalForRequest = 6
        cfg.timeoutIntervalForResource = 8
        cfg.waitsForConnectivity = false
        return URLSession(configuration: cfg)
    }()

    override func didReceive(_ request: UNNotificationRequest,
                             withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let bestAttemptContent = bestAttemptContent else {
            contentHandler(request.content)
            return
        }
        
        // Extract sender info from push payload
        let userInfo = request.content.userInfo
        let senderName = userInfo["sender_name"] as? String ?? bestAttemptContent.title
        let senderId = userInfo["sender_id"] as? String ?? "unknown"
        let avatarUrlString = userInfo["sender_avatar_url"] as? String ?? userInfo["image_url"] as? String ?? ""
        let notificationType = userInfo["type"] as? String ?? ""
        
        // Only use communication style for chat messages
        let isChatMessage = notificationType == "chat_message" || notificationType == "incoming_call"
        
        if isChatMessage && !senderName.isEmpty {
            // Download avatar then create communication notification
            downloadAvatar(from: avatarUrlString) { avatarImage in
                self.createCommunicationNotification(
                    content: bestAttemptContent,
                    senderName: senderName,
                    senderId: senderId,
                    avatarImage: avatarImage,
                    contentHandler: contentHandler
                )
            }
        } else {
            // For non-chat notifications, just attach the image if available
            if !avatarUrlString.isEmpty, let url = URL(string: avatarUrlString) {
                downloadImage(from: url) { attachment in
                    if let attachment = attachment {
                        bestAttemptContent.attachments = [attachment]
                    }
                    contentHandler(bestAttemptContent)
                }
            } else {
                contentHandler(bestAttemptContent)
            }
        }
    }
    
    override func serviceExtensionTimeWillExpire() {
        downloadTask?.cancel()
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            // Deliver original content as-is — never surface attachment fetch errors to the user.
            bestAttemptContent.attachments = []
            contentHandler(bestAttemptContent)
        }
    }

    private func isAllowedImageURL(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased(), scheme == "https" else { return false }
        guard let host = url.host, !host.isEmpty else { return false }
        return true
    }
    
    // MARK: - Communication Notification
    
    private func createCommunicationNotification(
        content: UNMutableNotificationContent,
        senderName: String,
        senderId: String,
        avatarImage: INImage?,
        contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        // Build name components so iOS can render initials when no avatar is available
        var nameComponents = PersonNameComponents()
        let parts = senderName.split(separator: " ", maxSplits: 1).map(String.init)
        nameComponents.givenName = parts.first ?? senderName
        if parts.count > 1 { nameComponents.familyName = parts.last }
        
        // Create the sender as an INPerson with a neutral handle so iOS doesn't surface email text
        let handle = INPersonHandle(value: "zivo-user-\(senderId)", type: .unknown)
        let sender = INPerson(
            personHandle: handle,
            nameComponents: nameComponents,
            displayName: senderName,
            image: avatarImage,
            contactIdentifier: nil,
            customIdentifier: "zivo-user-\(senderId)"
        )
        
        let intent = INSendMessageIntent(
            recipients: nil,
            outgoingMessageType: .outgoingMessageText,
            content: content.body,
            speakableGroupName: nil,
            conversationIdentifier: "zivo-direct-message-\(senderId)",
            serviceName: "ZIVO",
            sender: sender,
            attachments: nil
        )
        
        // Set the sender's avatar on the intent so it shows in the notification
        if let avatarImage = avatarImage {
            intent.setImage(avatarImage, forParameterNamed: \.sender)
        }
        
        // Donate the interaction so iOS recognizes the sender
        let interaction = INInteraction(intent: intent, response: nil)
        interaction.direction = .incoming
        interaction.donate(completion: { error in
            if let error = error {
                NSLog("[NotificationService] Donation error: \(error.localizedDescription)")
            }
        })
        
        // Update the notification content with the communication style
        do {
            let updatedContent = try content.updating(from: intent)
            contentHandler(updatedContent)
        } catch {
            NSLog("[NotificationService] updating(from:) failed: \(error.localizedDescription)")
            contentHandler(content)
        }
    }
    
    // MARK: - Avatar Download
    
    private func downloadAvatar(from urlString: String, completion: @escaping (INImage?) -> Void) {
        guard !urlString.isEmpty,
              let url = URL(string: urlString),
              isAllowedImageURL(url) else {
            completion(nil)
            return
        }

        let task = NotificationService.downloadSession.dataTask(with: url) { data, _, _ in
            guard let data = data, !data.isEmpty else {
                completion(nil)
                return
            }
            completion(INImage(imageData: data))
        }
        downloadTask = task
        task.resume()
    }
    
    // MARK: - Image Attachment (for non-chat notifications)
    
    private func downloadImage(from url: URL, completion: @escaping (UNNotificationAttachment?) -> Void) {
        guard isAllowedImageURL(url) else {
            completion(nil)
            return
        }
        let task = NotificationService.downloadSession.downloadTask(with: url) { localURL, response, error in
            guard let localURL = localURL, error == nil else {
                completion(nil)
                return
            }
            
            let ext: String
            if let mimeType = (response as? HTTPURLResponse)?.mimeType {
                switch mimeType {
                case "image/png": ext = "png"
                case "image/gif": ext = "gif"
                case "image/webp": ext = "webp"
                default: ext = "jpg"
                }
            } else {
                ext = "jpg"
            }
            
            let tmpFile = FileManager.default.temporaryDirectory
                .appendingPathComponent(UUID().uuidString)
                .appendingPathExtension(ext)
            
            do {
                try FileManager.default.moveItem(at: localURL, to: tmpFile)
                let attachment = try UNNotificationAttachment(identifier: "avatar", url: tmpFile, options: nil)
                completion(attachment)
            } catch {
                completion(nil)
            }
        }
        downloadTask = task
        task.resume()
    }
}
