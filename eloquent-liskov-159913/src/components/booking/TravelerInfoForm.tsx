/**
 * Traveler Info Form Component
 * Collects traveler details before partner handoff
 * 
 * LOCKED COMPLIANCE: Uses flightCompliance.ts for all text
 */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { User, Mail, Phone, Shield, ExternalLink, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { 
  FLIGHT_CTA_TEXT, 
  FLIGHT_CONSENT, 
  FLIGHT_DISCLAIMERS 
} from "@/config/flightCompliance";

const travelerSchema = z.object({
  fullName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  email: z
    .string()
    .email("Please enter a valid email address"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number must be less than 20 characters")
    .regex(/^\+?[0-9\s\-()]+$/, "Please enter a valid phone number"),
  consentSharing: z
    .literal(true, {
      message: "You must consent to share your information",
    }),
});

export type TravelerFormData = z.infer<typeof travelerSchema>;

interface TravelerInfoFormProps {
  onSubmit: (data: TravelerFormData) => void;
  isLoading?: boolean;
  defaultValues?: Partial<TravelerFormData>;
}

export default function TravelerInfoForm({
  onSubmit,
  isLoading = false,
  defaultValues,
}: TravelerInfoFormProps) {
  const form = useForm<TravelerFormData>({
    resolver: zodResolver(travelerSchema),
    defaultValues: {
      fullName: defaultValues?.fullName || "",
      email: defaultValues?.email || "",
      phone: defaultValues?.phone || "",
      consentSharing: defaultValues?.consentSharing || false as never,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Full Name */}
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Full Name
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="John Doe"
                  {...field}
                  className="h-12"
                  autoComplete="name"
                />
              </FormControl>
              <FormDescription>
                Enter your name exactly as it appears on your ID
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email Address
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  {...field}
                  className="h-12"
                  autoComplete="email"
                />
              </FormControl>
              <FormDescription>
                Booking confirmation will be sent here
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Phone Number
              </FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  {...field}
                  className="h-12"
                  autoComplete="tel"
                />
              </FormControl>
              <FormDescription>
                For booking updates and emergencies
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Consent Checkbox - LOCKED TEXT */}
        <FormField
          control={form.control}
          name="consentSharing"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-border bg-muted/30 p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-medium">
                  {FLIGHT_CONSENT.checkboxLabel}
                </FormLabel>
                <FormDescription className="text-xs">
                  {FLIGHT_CONSENT.privacy}{" "}
                  <Link to="/partner-disclosure" className="text-primary hover:underline">
                    Learn more
                  </Link>
                </FormDescription>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        {/* Partner Disclosure - LOCKED TEXT */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Secure Partner Checkout</p>
            <p>{FLIGHT_DISCLAIMERS.ticketing}</p>
          </div>
        </div>

        {/* Submit Button - LOCKED CTA */}
        <Button
          type="submit"
          size="lg"
          className="w-full h-14 text-base font-semibold gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            "Confirming availability..."
          ) : (
            <>
              <Lock className="w-4 h-4" />
              {FLIGHT_CTA_TEXT.primary}
              <ExternalLink className="w-4 h-4" />
            </>
          )}
        </Button>

        {/* Compliance footer */}
        <p className="text-[10px] text-center text-muted-foreground">
          {FLIGHT_DISCLAIMERS.checkout}
        </p>

        {/* Footer note */}
        <p className="text-xs text-center text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link to="/terms" className="text-primary hover:underline">Terms</Link>,{" "}
          <Link to="/privacy" className="text-primary hover:underline">Privacy</Link>, and{" "}
          <Link to="/partner-disclosure" className="text-primary hover:underline">Partner Disclosure</Link>
        </p>
      </form>
    </Form>
  );
}
