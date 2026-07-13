import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import Inbox from "lucide-react/dist/esm/icons/inbox";
import Phone from "lucide-react/dist/esm/icons/phone";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import Send from "lucide-react/dist/esm/icons/send";
import { toast } from "sonner";

interface Props { storeId: string }

export default function AutoRepairInboxSection({ storeId }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["ar-inbox", storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("store_messages")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("store_messages")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-inbox", storeId] }),
  });

  const sendReply = useMutation({
    mutationFn: async ({ id, reply, existing }: { id: string; reply: string; existing: any[] }) => {
      const updated = [
        ...(existing ?? []),
        { text: reply, sent_at: new Date().toISOString(), from: "shop" },
      ];
      const { error } = await (supabase as any)
        .from("store_messages")
        .update({ replies: updated })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success("Reply sent");
      setReplyTexts((prev) => ({ ...prev, [vars.id]: "" }));
      qc.invalidateQueries({ queryKey: ["ar-inbox", storeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to send reply"),
  });

  const toggle = (msg: any) => {
    if (expanded === msg.id) {
      setExpanded(null);
    } else {
      setExpanded(msg.id);
      if (!msg.is_read) markRead.mutate(msg.id);
    }
  };

  const unreadCount = messages.filter((m: any) => !m.is_read).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="w-4 h-4" /> Customer Inbox
            {unreadCount > 0 && (
              <Badge className="ml-auto text-xs">{unreadCount} unread</Badge>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading messages…</CardContent></Card>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No messages yet. Customer inquiries will appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {messages.map((msg: any) => {
            const isOpen = expanded === msg.id;
            const replies: any[] = msg.replies ?? [];
            return (
              <Card
                key={msg.id}
                className={!msg.is_read ? "border-primary/40 bg-primary/5" : ""}
              >
                <CardContent className="p-0">
                  <button type="button"
                    className="w-full text-left p-4 flex items-start gap-3"
                    onClick={() => toggle(msg)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-sm">{msg.customer_name ?? "Unknown"}</p>
                        {!msg.is_read && (
                          <Badge className="text-[10px] h-4 px-1.5">New</Badge>
                        )}
                        {replies.length > 0 && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                            {replies.length} repl{replies.length === 1 ? "y" : "ies"}
                          </Badge>
                        )}
                      </div>
                      {msg.customer_phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                          <Phone className="w-3 h-3" /> {msg.customer_phone}
                        </p>
                      )}
                      <p className={`text-sm text-muted-foreground ${isOpen ? "" : "line-clamp-1"}`}>
                        {msg.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <p className="text-[11px] text-muted-foreground">
                        {msg.created_at ? new Date(msg.created_at).toLocaleDateString() : ""}
                      </p>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3 border-t pt-3">
                          {replies.length > 0 && (
                            <div className="space-y-2">
                              {replies.map((rep: any, i: number) => (
                                <div
                                  key={i}
                                  className={`rounded-md px-3 py-2 text-xs ${
                                    rep.from === "shop"
                                      ? "bg-primary/10 border-l-2 border-primary ml-6"
                                      : "bg-muted/50 border-l-2 border-muted-foreground/30"
                                  }`}
                                >
                                  <p className="font-semibold mb-0.5">{rep.from === "shop" ? "You" : msg.customer_name}</p>
                                  <p>{rep.text}</p>
                                  {rep.sent_at && (
                                    <p className="text-muted-foreground mt-0.5">
                                      {new Date(rep.sent_at).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Input
                              className="text-sm h-8 flex-1"
                              placeholder="Type a reply…"
                              value={replyTexts[msg.id] ?? ""}
                              onChange={(e) =>
                                setReplyTexts((prev) => ({ ...prev, [msg.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                const text = (replyTexts[msg.id] ?? "").trim();
                                if (e.key === "Enter" && text) {
                                  sendReply.mutate({ id: msg.id, reply: text, existing: replies });
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              className="h-8 gap-1.5"
                              disabled={!(replyTexts[msg.id] ?? "").trim() || sendReply.isPending}
                              onClick={() => {
                                const text = (replyTexts[msg.id] ?? "").trim();
                                if (text) sendReply.mutate({ id: msg.id, reply: text, existing: replies });
                              }}
                            >
                              <Send className="w-3.5 h-3.5" /> Send
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
