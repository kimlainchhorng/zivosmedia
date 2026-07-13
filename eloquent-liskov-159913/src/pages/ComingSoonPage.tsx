import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Sparkles, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface ComingSoonPageProps {
  title?: string;
  description?: string;
}

export default function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const inferredTitle = title ?? location.pathname
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) ?? "This feature";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={`${inferredTitle} · Coming Soon · ZIVO`} description="This feature is coming soon to ZIVO." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{inferredTitle}</h1>
        </div>
      </div>

      <main className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-6"
        >
          <Sparkles className="w-10 h-10 text-primary" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-2xl font-bold mb-2"
        >
          Coming Soon
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="text-sm text-muted-foreground max-w-md mb-8"
        >
          {description ?? `${inferredTitle} is in active development. We'll notify you the moment it ships.`}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Button
            onClick={() => {
              toast.success("We'll notify you when it's ready!");
            }}
            className="rounded-xl"
          >
            <Bell className="w-4 h-4 mr-2" />
            Notify me
          </Button>
          <Button variant="outline" onClick={() => navigate("/account/settings")} className="rounded-xl">
            Back to settings
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
