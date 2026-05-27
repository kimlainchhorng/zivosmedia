import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CreditCard,
  Plus,
  Trash2,
  Star,
  Shield,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalPaymentMethods } from "@/hooks/useLocalPaymentMethods";
import type { LocalPaymentMethod } from "@/hooks/useLocalPaymentMethods";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import AddCardForm from "@/components/wallet/AddCardForm";

const PaymentMethodsPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const { methods, deleteCard, setDefault, isEmpty, isLoading } = useLocalPaymentMethods();
  const [showAddForm, setShowAddForm] = useState(false);

  const handleDelete = (card: LocalPaymentMethod) => {
    deleteCard(card.id);
    toast.success(`${card.brand} •••• ${card.last4} removed`);
  };

  const handleSetDefault = (card: LocalPaymentMethod) => {
    if (card.isDefault) return;
    setDefault(card.id);
    toast.success(`${card.brand} •••• ${card.last4} set as default`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-8">
      {/* Header */}
      <header className="sticky top-0 safe-area-top z-50 flex items-center gap-3 px-4 py-4 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <button type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-muted transition-colors touch-manipulation"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{t("payment.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("payment.subtitle")}</p>
          </div>
        </div>
      </header>

      {/* Security Trust Bar */}
      <div className="mx-4 mt-4 flex items-center justify-center gap-4 py-2.5 px-4 rounded-xl bg-muted/30 border border-border/50">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>Stripe secured</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span>{t("payment.pci")}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="w-3.5 h-3.5 text-foreground" />
          <span>{t("payment.secure")}</span>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Saved Cards */}
        {!user ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Sign in required</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Sign in to view and manage saved payment methods.
            </p>
            <Button onClick={() => navigate("/login?redirect=/payment-methods")}>
              Sign in
            </Button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Loading payment methods...
          </div>
        ) : isEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t("payment.no_methods")}</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {t("payment.no_methods_desc")}
            </p>
            <Button
              onClick={() => setShowAddForm(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("payment.add_card")}
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {methods.map((card) => (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className={cn(
                    "relative p-4 rounded-xl border transition-all",
                    card.isDefault
                      ? "bg-primary/10 border-primary/50"
                      : "bg-card border-border/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        card.isDefault ? "bg-primary/20" : "bg-muted/50"
                      )}
                    >
                      <CreditCard
                        className={cn(
                          "w-5 h-5",
                          card.isDefault ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {card.brand} •••• {card.last4}
                        </span>
                        {card.isDefault && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Expires {String(card.expMonth).padStart(2, "0")}/
                        {String(card.expYear).slice(-2)}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                        {card.cardholderName}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button"
                        onClick={() => handleSetDefault(card)}
                        disabled={card.isDefault}
                        className={cn(
                          "p-2 rounded-lg transition-colors touch-manipulation",
                          card.isDefault
                            ? "text-primary cursor-default"
                            : "text-muted-foreground hover:text-amber-400 hover:bg-muted/50"
                        )}
                        aria-label="Set as default"
                      >
                        <Star
                          className={cn(
                            "w-4 h-4",
                            card.isDefault && "fill-primary"
                          )}
                        />
                      </button>
                      <button type="button"
                        onClick={() => handleDelete(card)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation"
                        aria-label="Delete card"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add New Card Button */}
            {!showAddForm && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowAddForm(true)}
                className="w-full p-4 rounded-xl border border-dashed border-border flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors touch-manipulation"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add New Card</span>
              </motion.button>
            )}
          </div>
        )}

        {/* Add Card Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <AddCardForm onClose={() => setShowAddForm(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PaymentMethodsPage;
