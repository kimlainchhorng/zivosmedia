import { ArrowLeft, CheckCircle2, Clock, Mail, Shield, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";

const AccountDeletionInfo = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Delete Your ZIVO Account"
        description="Request deletion of your ZIVO account and personal data from the web or inside the ZIVO app."
        canonical="https://zivollc.com/delete-account"
      />

      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-16">
        <Link to="/">
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <section className="space-y-5">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Trash2 className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-normal text-foreground md:text-5xl">
              Delete Your ZIVO Account
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              You can request deletion of your ZIVO account and personal data at any time. Deletion is scheduled with a
              30-day grace period so you can sign back in and cancel if the request was accidental.
            </p>
          </div>
        </section>

        <section className="mt-10 space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Delete from inside the app</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                Open ZIVO, sign in, then go to More or Settings and choose Delete Account. Review the warnings, confirm
                the checkboxes, and select Schedule deletion.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <Mail className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Request deletion from the web</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                If you cannot access the app, email us from the address connected to your ZIVO account. Include the
                subject line "Delete my ZIVO account" so we can verify and process the request.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild>
                  <a href="mailto:privacy@hizivo.com?subject=Delete%20my%20ZIVO%20account">
                    Email privacy@hizivo.com
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href="mailto:support@hizivo.com?subject=Delete%20my%20ZIVO%20account">
                    Email support
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">What is deleted</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Your profile, account credentials, uploaded profile content, saved preferences, and personal app data are
              removed or anonymized after the grace period.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">What may be retained</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Some records may be retained where required for legal, tax, fraud prevention, payment, dispute, or
              regulatory obligations, as described in our Privacy Policy.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-border bg-muted/30 p-6">
          <h2 className="text-lg font-semibold text-foreground">Cancel a pending deletion</h2>
          <p className="mt-2 leading-7 text-muted-foreground">
            Sign back in to ZIVO within 30 days of your deletion request and choose Cancel deletion to keep your account.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link to="/legal/privacy" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>
            <Link to="/legal/data-retention" className="font-medium text-primary hover:underline">
              Data Retention Policy
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AccountDeletionInfo;
