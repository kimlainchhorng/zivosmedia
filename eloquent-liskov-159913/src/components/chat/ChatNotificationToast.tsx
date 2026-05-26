import NotificationToastCard from "@/components/notifications/NotificationToastCard";

type ChatNotificationToastProps = {
  senderId: string;
  senderName: string;
  messageText: string;
  senderAvatar?: string | null;
  onReply: (senderId: string) => void;
  onDismiss?: () => void;
};

export default function ChatNotificationToast({
  senderId,
  senderName,
  messageText,
  senderAvatar,
  onReply,
  onDismiss,
}: ChatNotificationToastProps) {
  return (
    <NotificationToastCard
      variant="chat"
      title={senderName}
      body={messageText || "Sent you a message"}
      meta="New message"
      avatarUrl={senderAvatar ?? null}
      avatarFallback={senderName}
      actionLabel="Reply"
      onAction={() => onReply(senderId)}
      onBodyClick={() => onReply(senderId)}
      onDismiss={onDismiss}
    />
  );
}
