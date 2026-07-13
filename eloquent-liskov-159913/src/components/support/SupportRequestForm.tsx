/**
 * User Support Request Form
 * Allows users to create support tickets from My Trips
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HelpCircle, Send, Loader2, CheckCircle } from "lucide-react";
import { useCreateTicket } from "@/hooks/useSupportTickets";
import { cn } from "@/lib/utils";
import { confirmContentSafe } from "@/lib/security/contentLinkValidation";

interface SupportRequestFormProps {
  orderId?: string;
  orderRef?: string;
  defaultCategory?: string;
  triggerButton?: React.ReactNode;
  className?: string;
}

const categories = [
  { value: 'booking_issue', label: 'Booking Issue', description: 'Problems with your booking details' },
  { value: 'payment_issue', label: 'Payment Issue', description: 'Charges, refunds, or billing questions' },
  { value: 'cancellation_refund', label: 'Cancellation / Refund', description: 'Request cancellation or refund' },
  { value: 'change_request', label: 'Change Request', description: 'Modify dates, travelers, or details' },
  { value: 'technical_issue', label: 'Technical Issue', description: 'Website or app problems' },
  { value: 'general_inquiry', label: 'General Inquiry', description: 'Other questions' },
];

export function SupportRequestForm({ 
  orderId, 
  orderRef, 
  defaultCategory,
  triggerButton,
  className 
}: SupportRequestFormProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(defaultCategory || '');
  const [subject, setSubject] = useState(orderRef ? `Help with booking ${orderRef}` : '');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const createTicket = useCreateTicket();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category || !subject.trim() || !description.trim()) return;
    if (!confirmContentSafe(`${subject}\n${description}`, "support request")) return;

    await createTicket.mutateAsync({
      subject,
      description,
      category,
      order_id: orderId,
      priority: category === 'payment_issue' ? 'high' : 'normal',
    });

    setSubmitted(true);
    setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
      setCategory(defaultCategory || '');
      setSubject(orderRef ? `Help with booking ${orderRef}` : '');
      setDescription('');
    }, 2000);
  };

  const trigger = triggerButton || (
    <Button variant="outline" className={cn("gap-2 rounded-xl touch-manipulation active:scale-[0.97] transition-all duration-200 min-h-[40px] shadow-sm", className)}>
      <HelpCircle className="w-4 h-4" />
      Get Help
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {submitted ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Request Submitted</h3>
            <p className="text-muted-foreground">
              We've received your support request. Our team will respond within 24 hours.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                Contact Support
              </DialogTitle>
              <DialogDescription>
                Tell us how we can help. We typically respond within 24 hours.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>What do you need help with?</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div>
                          <p>{cat.label}</p>
                          <p className="text-xs text-muted-foreground">{cat.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe your issue in detail. Include any relevant booking references, dates, or error messages."
                  rows={4}
                />
              </div>

              {/* Partner routing notice */}
              {(category === 'cancellation_refund' || category === 'change_request') && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm">
                  <p className="text-amber-600 dark:text-amber-400">
                    <strong>Note:</strong> For booking changes, cancellations, or refunds, 
                    you may need to contact the booking partner directly. We'll provide 
                    guidance in our response.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={!category || !subject.trim() || !description.trim() || createTicket.isPending}
                >
                  {createTicket.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SupportRequestForm;
