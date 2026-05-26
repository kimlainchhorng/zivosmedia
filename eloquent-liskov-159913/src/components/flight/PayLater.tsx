import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Calendar,
  CheckCircle,
  Shield,
  Clock,
  DollarSign,
  ChevronRight,
  Info,
  Wallet,
  Percent
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentPlan {
  id: string;
  installments: number;
  interval: string;
  interestRate: number;
  monthlyPayment: number;
  totalAmount: number;
  provider: string;
  providerLogo: string;
  popular?: boolean;
}

interface PayLaterProps {
  className?: string;
  totalAmount?: number;
}

export const PayLater = ({ className, totalAmount = 1299 }: PayLaterProps) => {
  const [selectedPlan, setSelectedPlan] = useState<string>('4-weekly');

  const paymentPlans: PaymentPlan[] = [
    {
      id: '4-weekly',
      installments: 4,
      interval: 'bi-weekly',
      interestRate: 0,
      monthlyPayment: Math.round(totalAmount / 4 * 100) / 100,
      totalAmount: totalAmount,
      provider: 'ZIVO Pay',
      providerLogo: 'ZP',
      popular: true
    },
    {
      id: '3-monthly',
      installments: 3,
      interval: 'monthly',
      interestRate: 0,
      monthlyPayment: Math.round(totalAmount / 3 * 100) / 100,
      totalAmount: totalAmount,
      provider: 'Klarna',
      providerLogo: 'K'
    },
    {
      id: '6-monthly',
      installments: 6,
      interval: 'monthly',
      interestRate: 9.99,
      monthlyPayment: Math.round((totalAmount * 1.0499) / 6 * 100) / 100,
      totalAmount: Math.round(totalAmount * 1.0499),
      provider: 'Affirm',
      providerLogo: 'A'
    },
    {
      id: '12-monthly',
      installments: 12,
      interval: 'monthly',
      interestRate: 14.99,
      monthlyPayment: Math.round((totalAmount * 1.0749) / 12 * 100) / 100,
      totalAmount: Math.round(totalAmount * 1.0749),
      provider: 'Affirm',
      providerLogo: 'A'
    },
  ];

  const selectedPlanData = paymentPlans.find(p => p.id === selectedPlan);
  const firstPaymentDate = new Date();
  firstPaymentDate.setDate(firstPaymentDate.getDate() + 14);

  return (
    <Card className={cn("overflow-hidden border-border/50 bg-card/50 backdrop-blur", className)}>
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl border border-border flex items-center justify-center bg-secondary">
              <Wallet className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">Pay Later</CardTitle>
              <p className="text-sm text-muted-foreground">
                Split your payment into easy installments
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            0% APR Available
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Total Amount */}
        <div className="p-4 bg-muted/20 border-b border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Trip Total</span>
            <span className="text-2xl font-bold">${totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Plans */}
        <div className="p-4">
          <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="space-y-3">
            {paymentPlans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Label
                  htmlFor={plan.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                    selectedPlan === plan.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border/50 hover:border-border bg-muted/30"
                  )}
                >
                  <RadioGroupItem value={plan.id} id={plan.id} />
                  
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">{plan.providerLogo}</div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {plan.installments} {plan.interval} payments
                      </span>
                      {plan.popular && (
                        <Badge className="bg-amber-500/20 text-amber-400 text-xs">Popular</Badge>
                      )}
                      {plan.interestRate === 0 && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">0% Interest</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      via {plan.provider}
                      {plan.interestRate > 0 && ` • ${plan.interestRate}% APR`}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold">${plan.monthlyPayment}</p>
                    <p className="text-xs text-muted-foreground">per payment</p>
                  </div>
                </Label>
              </motion.div>
            ))}
          </RadioGroup>
        </div>

        {/* Selected Plan Details */}
        {selectedPlanData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 border-t border-border/50 bg-muted/20"
          >
            <h4 className="font-medium mb-3">Payment Schedule</h4>
            <div className="space-y-2">
              {Array.from({ length: selectedPlanData.installments }).map((_, i) => {
                const paymentDate = new Date(firstPaymentDate);
                if (selectedPlanData.interval === 'bi-weekly') {
                  paymentDate.setDate(paymentDate.getDate() + (i * 14));
                } else {
                  paymentDate.setMonth(paymentDate.getMonth() + i);
                }
                
                return (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-card/50 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                        i === 0 ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {i === 0 ? 'Due today' : paymentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        {i === 0 && <p className="text-xs text-muted-foreground">First payment</p>}
                      </div>
                    </div>
                    <span className="font-bold">${selectedPlanData.monthlyPayment}</span>
                  </div>
                );
              })}
            </div>

            {/* Total Summary */}
            <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/30">
              <div className="flex items-center justify-between">
                <span>Total to pay</span>
                <span className="font-bold text-lg">${selectedPlanData.totalAmount}</span>
              </div>
              {selectedPlanData.interestRate > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Includes ${selectedPlanData.totalAmount - totalAmount} in interest
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Trust Badges */}
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4 text-emerald-400" />
              No hidden fees
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-foreground" />
              Instant approval
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-foreground" />
              No credit impact
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="p-4 border-t border-border/50">
          <Button className="w-full" size="lg">
            <CreditCard className="w-4 h-4 mr-2" />
            Continue with {selectedPlanData?.provider}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            By continuing, you agree to {selectedPlanData?.provider}'s Terms of Service
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayLater;
