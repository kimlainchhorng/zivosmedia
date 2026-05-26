/**
 * SandboxModePage — Test transactions with Meta CAPI bridge
 * Allows admin to simulate Truck Sale / Ride and verify Meta Purchase events
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, TestTube, Truck, Car, CreditCard, CheckCircle,
  Loader2, Zap, ExternalLink, AlertTriangle, DollarSign
} from "lucide-react";
import { sendMetaConversionEvent } from "@/services/metaConversion";
import { motion, AnimatePresence } from "framer-motion";

type TestType = "truck_sale" | "ride";

interface TestResult {
  type: TestType;
  eventId: string;
  value: number;
  currency: string;
  timestamp: string;
  status: "pending" | "sent" | "error";
  error?: string;
}

export default function SandboxModePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [testType, setTestType] = useState<TestType>("truck_sale");
  const [amount, setAmount] = useState("25.00");
  const [currency, setCurrency] = useState("USD");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runTestTransaction = async () => {
    if (!user) {
      toast.error("Please sign in to run sandbox tests");
      return;
    }

    setRunning(true);
    const eventId = `sandbox-${testType}-${Date.now()}`;
    const value = parseFloat(amount) || 0;

    const newResult: TestResult = {
      type: testType,
      eventId,
      value,
      currency,
      timestamp: new Date().toISOString(),
      status: "pending",
    };

    setResults((prev) => [newResult, ...prev]);

    try {
      if (testType === "truck_sale") {
        toast.info("Inserting test truck sale → triggers Meta bridge...");
        // Insert a real truck_sales row with completed status — triggers notify_meta_capi_bridge
        const { data: saleRow, error: saleErr } = await (supabase as any)
          .from("truck_sales")
          .insert({
            store_id: "00000000-0000-0000-0000-000000000000",
            driver_user_id: user.id,
            truck_label: "Sandbox Truck",
            total_amount: value,
            subtotal: value,
            currency,
            status: "completed",
            is_offline_synced: false,
          })
          .select("id")
          .single();

        if (saleErr) throw new Error(saleErr.message);
        toast.info(`Truck sale inserted (${saleRow?.id}). DB trigger will fire Meta event.`);
      } else {
        toast.info("Simulating ride via direct Meta CAPI...");
        // For rides, fire directly since we may not have a trips table trigger
        await sendMetaConversionEvent({
          eventName: "Purchase",
          eventId,
          externalId: user.id,
          value,
          currency,
          sourceType: "trip",
          sourceTable: "trips",
          sourceId: eventId,
          payload: { sandbox: true, test_mode: true },
        });
      }

      setResults((prev) =>
        prev.map((r) => (r.eventId === eventId ? { ...r, status: "sent" as const } : r))
      );

      toast.success(
        `✅ ${testType === "truck_sale" ? "Truck sale inserted — DB trigger fires Meta Purchase" : "Ride Purchase event sent directly"}!\nEvent ID: ${eventId}\nValue: ${currency} ${value}`,
        { duration: 8000 }
      );
    } catch (err: any) {
      setResults((prev) =>
        prev.map((r) =>
          r.eventId === eventId ? { ...r, status: "error" as const, error: err.message } : r
        )
      );
      toast.error(`Failed: ${err.message}`);
    }

    setRunning(false);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/30 px-4 py-3 pt-safe">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <TestTube className="h-5 w-5 text-amber-500" />
            <h1 className="text-lg font-bold flex-1">Sandbox Mode</h1>
            <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-600">
              TEST
            </Badge>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Warning */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-3 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-600">Test Environment</p>
                <p className="text-[11px] text-muted-foreground">
                  These transactions fire real Meta CAPI events. Use Meta's Test Events tool to verify.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Type Selector */}
          <div>
            <Label className="text-sm font-bold mb-2 block">Transaction Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button"
                onClick={() => setTestType("truck_sale")}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  testType === "truck_sale"
                    ? "border-primary bg-primary/5"
                    : "border-border/40 hover:border-border"
                }`}
              >
                <Truck className={`h-8 w-8 mx-auto mb-2 ${testType === "truck_sale" ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm font-bold">Truck Sale</p>
                <p className="text-[10px] text-muted-foreground">Product sold from truck</p>
              </button>
              <button type="button"
                onClick={() => setTestType("ride")}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  testType === "ride"
                    ? "border-primary bg-primary/5"
                    : "border-border/40 hover:border-border"
                }`}
              >
                <Car className={`h-8 w-8 mx-auto mb-2 ${testType === "ride" ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm font-bold">Ride</p>
                <p className="text-[10px] text-muted-foreground">Completed trip</p>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  step="0.01"
                  className="pl-9 rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">Currency</Label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Run Test Button */}
          <Button
            onClick={runTestTransaction}
            disabled={running || !amount}
            className="w-full rounded-xl font-bold h-12"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running test...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Run {testType === "truck_sale" ? "Truck Sale" : "Ride"} Test
              </>
            )}
          </Button>

          {/* Meta Events Manager Link */}
          <Button
            variant="outline"
            className="w-full rounded-xl text-xs"
            onClick={() => window.open("https://business.facebook.com/events_manager", "_blank")}
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            Open Meta Events Manager
          </Button>

          {/* Results Log */}
          {results.length > 0 && (
            <div>
              <p className="text-sm font-bold mb-2">Test Results</p>
              <div className="space-y-2">
                <AnimatePresence>
                  {results.map((r) => (
                    <motion.div
                      key={r.eventId}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="border-border/30">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {r.type === "truck_sale" ? (
                                <Truck className="h-4 w-4 text-primary" />
                              ) : (
                                <Car className="h-4 w-4 text-primary" />
                              )}
                              <span className="text-sm font-semibold capitalize">
                                {r.type.replace("_", " ")}
                              </span>
                            </div>
                            <Badge
                              variant={r.status === "sent" ? "default" : r.status === "error" ? "destructive" : "secondary"}
                              className="text-[10px]"
                            >
                              {r.status === "sent" && <CheckCircle className="h-2.5 w-2.5 mr-1" />}
                              {r.status}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground space-y-0.5">
                            <p>Value: {r.currency} {r.value.toFixed(2)}</p>
                            <p className="truncate">Event ID: {r.eventId}</p>
                            <p>{new Date(r.timestamp).toLocaleTimeString()}</p>
                            {r.error && <p className="text-destructive">{r.error}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
