/**
 * Support Center Page — Premium 2026
 * Unified support across all ZIVO services
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, MessageCircle, Clock, CheckCircle,
  AlertCircle, ChevronRight, Search, Headphones, LifeBuoy
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useSupportTickets,
  useCreateSupportTicket,
  SUPPORT_CATEGORIES,
  getCategoryLabel,
  type CreateTicketInput,
} from "@/hooks/useGlobalSupport";
import { getServiceMeta } from "@/hooks/useZivoWallet";
import MobileBottomNav from "@/components/shared/MobileBottomNav";
import { format } from "date-fns";

function NewTicketDialog() {
  const createTicket = useCreateSupportTicket();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateTicketInput>>({
    service_type: "", category: "", subject: "", description: "", priority: "normal",
  });

  const selectedService = formData.service_type ? SUPPORT_CATEGORIES[formData.service_type] : null;

  const handleSubmit = async () => {
    if (!formData.service_type || !formData.category || !formData.subject || !formData.description) return;
    await createTicket.mutateAsync(formData as CreateTicketInput);
    setIsOpen(false);
    setFormData({ service_type: "", category: "", subject: "", description: "", priority: "normal" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl font-bold gap-1.5 shadow-md shadow-primary/20">
          <Plus className="w-4 h-4" />
          New Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>Describe your issue and we'll get back to you.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Service</Label>
            <Select value={formData.service_type} onValueChange={(v) => setFormData({ ...formData, service_type: v, category: "" })}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
                {Object.entries(SUPPORT_CATEGORIES).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{getServiceMeta(key).icon} {val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedService && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {selectedService.categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{getCategoryLabel(cat)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input placeholder="Brief summary" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Details about your issue..." rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full rounded-xl h-12 font-bold" onClick={handleSubmit} disabled={createTicket.isPending || !formData.subject || !formData.description}>
            {createTicket.isPending ? "Creating..." : "Submit Ticket"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SupportCenterPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { data: tickets, isLoading } = useSupportTickets(statusFilter === "all" ? undefined : statusFilter);
  const filteredTickets = tickets?.filter((t) => search ? t.subject.toLowerCase().includes(search.toLowerCase()) : true);

  const statusStyles: Record<string, string> = {
    open: "bg-sky-500/10 text-sky-600 border-sky-500/20",
    in_progress: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    waiting_customer: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    closed: "bg-muted text-muted-foreground border-border/50",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    open: <AlertCircle className="w-4 h-4 text-foreground" />,
    in_progress: <Clock className="w-4 h-4 text-amber-500" />,
    resolved: <CheckCircle className="w-4 h-4 text-emerald-500" />,
    closed: <CheckCircle className="w-4 h-4 text-muted-foreground" />,
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-40 bg-background/95 backdrop-blur-xl border-b border-border/40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild className="rounded-xl -ml-1" aria-label="Go back">
                <Link to="/app"><ArrowLeft className="w-5 h-5" /></Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold">Support</h1>
                <p className="text-xs text-muted-foreground">Get help across all services</p>
              </div>
            </div>
            <NewTicketDialog />
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-12 rounded-xl bg-card border-border/40" />
        </div>

        {/* Status Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          {[{ id: "all", label: "All" }, { id: "open", label: "Open" }, { id: "in_progress", label: "Active" }, { id: "resolved", label: "Resolved" }].map((f) => (
            <button type="button"
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`flex-1 text-[11px] font-bold py-2.5 rounded-xl transition-all duration-200 touch-manipulation ${
                statusFilter === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tickets */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-2xl" />)}
          </div>
        ) : filteredTickets && filteredTickets.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredTickets.map((ticket, i) => {
                const meta = getServiceMeta(ticket.service_type);
                return (
                  <motion.div key={ticket.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Link to={`/support/${ticket.id}`}>
                      <Card className="hover:shadow-lg transition-all duration-300 border-border/40 hover:border-primary/15 group">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">{statusIcons[ticket.status] || <MessageCircle className="w-4 h-4 text-muted-foreground" />}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm">{ticket.subject}</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{ticket.description}</p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge variant="outline" className="text-[9px] font-bold">{meta.icon} {meta.label}</Badge>
                                <Badge variant="outline" className={`text-[9px] font-bold border ${statusStyles[ticket.status] || ''}`}>
                                  {ticket.status.replace("_", " ")}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">{ticket.ticket_number}</span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <Card className="border-border/30">
            <CardContent className="p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Headphones className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-bold text-lg mb-1">No tickets found</h3>
              <p className="text-sm text-muted-foreground mb-5">
                {search ? "Try a different search term" : "Create a ticket to get help"}
              </p>
              <NewTicketDialog />
            </CardContent>
          </Card>
        )}

        {/* Help Resources */}
        <div>
          <h3 className="font-bold text-sm mb-3">Help Resources</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" asChild className="justify-start h-auto py-3.5 rounded-2xl border-border/40 hover:border-primary/15">
              <Link to="/help">
                <div className="text-left">
                  <p className="font-bold text-xs">Help Center</p>
                  <p className="text-[10px] text-muted-foreground">Browse FAQs</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start h-auto py-3.5 rounded-2xl border-border/40 hover:border-primary/15">
              <Link to="/contact">
                <div className="text-left">
                  <p className="font-bold text-xs">Contact Us</p>
                  <p className="text-[10px] text-muted-foreground">Email & chat</p>
                </div>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
