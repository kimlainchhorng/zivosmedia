/**
 * BusinessDashboard - B2B Dashboard for Corporate Accounts
 */

import { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Users, Plane, Building2, Car, TrendingUp, DollarSign, Calendar,
  FileText, Settings, PlusCircle, Download, Filter, Search,
  MoreHorizontal, CheckCircle2, Clock, AlertCircle, Loader2, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function BusinessDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Load the company's business account
  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: ["biz-account", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await (supabase as any)
        .from("business_accounts")
        .select("id, company_name, total_spent, credit_limit, status")
        .eq("owner_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Count active travelers
  const { data: travelerCount = 0 } = useQuery({
    queryKey: ["biz-traveler-count", account?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("business_account_users")
        .select("id", { count: "exact", head: true })
        .eq("business_id", account!.id)
        .eq("is_active", true);
      return count ?? 0;
    },
    enabled: !!account?.id,
  });

  // Load team members with profile info
  const { data: travelers = [], isLoading: loadingTravelers } = useQuery({
    queryKey: ["biz-travelers", account?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("business_account_users")
        .select("id, user_id, role, spending_limit_monthly, profiles:user_id(full_name, email, avatar_url)")
        .eq("business_id", account!.id)
        .eq("is_active", true)
        .limit(20);
      return (data || []).map((r: any) => ({
        id: r.id,
        name: r.profiles?.full_name || "Unknown",
        email: r.profiles?.email || "",
        role: r.role || "traveler",
        limit: r.spending_limit_monthly,
      }));
    },
    enabled: !!account?.id,
  });

  // Load recent invoices as "bookings"
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["biz-invoices", account?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("business_invoices")
        .select("id, invoice_number, billing_period_start, billing_period_end, total_cents, subtotal_cents, discount_cents, status, issued_at, currency")
        .eq("business_id", account!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!account?.id,
  });

  // Load travel policy
  const { data: policy } = useQuery({
    queryKey: ["biz-policy", account?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("business_policies")
        .select("*")
        .eq("business_id", account!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!account?.id,
  });

  // Derived stats
  const totalSpent = account?.total_spent ?? 0;
  const totalBookings = invoices.length;
  const totalSavings = invoices.reduce((s: number, inv: any) => s + (inv.discount_cents ?? 0), 0);
  const avgSavingsPct = invoices.length > 0
    ? Math.round((totalSavings / invoices.reduce((s: number, inv: any) => s + (inv.subtotal_cents ?? 0), 0)) * 100) || 0
    : 0;

  const stats = [
    { label: "Total Bookings", value: String(totalBookings), icon: Calendar },
    { label: "Total Spend", value: `$${(totalSpent).toLocaleString()}`, icon: DollarSign },
    { label: "Active Travelers", value: String(travelerCount), icon: Users },
    { label: "Avg. Savings", value: `${avgSavingsPct}%`, icon: TrendingUp },
  ];

  const filteredInvoices = invoices.filter((inv: any) =>
    !searchQuery || inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    if (status === "paid") return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
      </Badge>
    );
    if (status === "pending" || status === "issued") return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        <Clock className="w-3 h-3 mr-1" /> Pending
      </Badge>
    );
    if (status === "overdue") return (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
        <AlertCircle className="w-3 h-3 mr-1" /> Overdue
      </Badge>
    );
    return <Badge variant="outline">{status}</Badge>;
  };

  const handleExport = () => {
    const rows = [
      ["Invoice #", "Period", "Total", "Status"],
      ...invoices.map((inv: any) => [
        inv.invoice_number,
        `${inv.billing_period_start} – ${inv.billing_period_end}`,
        `$${((inv.total_cents ?? 0) / 100).toFixed(2)}`,
        inv.status,
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "business-report.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  return (
    <>
      <Helmet>
        <title>Business Dashboard | ZIVO for Business</title>
        <meta name="description" content="Manage your corporate travel program with ZIVO" />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold">
                {loadingAccount ? "Business Dashboard" : (account?.company_name ?? "Business Dashboard")}
              </h1>
              <p className="text-muted-foreground">Manage your corporate travel program</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" onClick={handleExport}>
                <Download className="w-4 h-4" />
                Export Report
              </Button>
              <Button className="gap-2" onClick={() => navigate("/flights")}>
                <PlusCircle className="w-4 h-4" />
                Book Travel
              </Button>
            </div>
          </div>

          {loadingAccount ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : !account ? (
            <Card className="p-10 text-center">
              <p className="text-lg font-semibold mb-2">No business account found</p>
              <p className="text-muted-foreground text-sm mb-4">Set up your corporate account to manage team travel.</p>
              <Button onClick={() => navigate("/business")}>Get Started</Button>
            </Card>
          ) : (
            <>
              {/* Stats */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.label}</p>
                          <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <stat.icon className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Main Content */}
              <Tabs defaultValue="bookings" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="bookings">Invoices</TabsTrigger>
                  <TabsTrigger value="travelers">Travelers</TabsTrigger>
                  <TabsTrigger value="policy">Policy</TabsTrigger>
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                {/* Invoices Tab */}
                <TabsContent value="bookings" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <CardTitle>Recent Invoices</CardTitle>
                        <div className="flex gap-2">
                          <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="Search invoices..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loadingInvoices ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                      ) : filteredInvoices.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">No invoices yet. Book travel to get started.</p>
                      ) : (
                        <div className="space-y-3">
                          {filteredInvoices.map((inv: any) => (
                            <div key={inv.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="font-medium">Invoice {inv.invoice_number}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {inv.billing_period_start} – {inv.billing_period_end}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <p className="font-semibold">${((inv.total_cents ?? 0) / 100).toFixed(2)}</p>
                                {getStatusBadge(inv.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Travelers Tab */}
                <TabsContent value="travelers" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>Team Travelers</CardTitle>
                        <Button className="gap-2" onClick={() => navigate("/business/invite")}>
                          <PlusCircle className="w-4 h-4" />
                          Add Traveler
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loadingTravelers ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                      ) : travelers.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">No team members yet. Invite travelers to get started.</p>
                      ) : (
                        <div className="space-y-3">
                          {travelers.map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between p-4 rounded-lg border">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="font-semibold text-primary text-sm">
                                    {(t.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{t.name}</p>
                                  <p className="text-sm text-muted-foreground">{t.email || t.role}</p>
                                </div>
                              </div>
                              {t.limit && (
                                <p className="text-sm text-muted-foreground">Limit: ${(t.limit / 100).toFixed(0)}/mo</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Policy Tab */}
                <TabsContent value="policy" className="space-y-4">
                  <div className="grid lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Policy Compliance</CardTitle>
                        <CardDescription>Travel rules for your team</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {!policy ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No policy configured yet</p>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { label: "Rides", val: policy.allow_rides },
                                { label: "Eats", val: policy.allow_eats },
                                { label: "Economy", val: policy.allow_economy },
                                { label: "Premium", val: policy.allow_premium },
                                { label: "Travel", val: policy.allow_travel },
                                { label: "Airport", val: policy.airport_rides_allowed },
                              ].map(item => (
                                <div key={item.label} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                                  <span>{item.label}</span>
                                  {item.val
                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    : <AlertCircle className="w-4 h-4 text-muted-foreground" />}
                                </div>
                              ))}
                            </div>
                            {policy.max_spend_per_day_cents && (
                              <p className="text-xs text-muted-foreground">Max daily spend: ${(policy.max_spend_per_day_cents / 100).toFixed(0)}</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Travel Policy Settings</CardTitle>
                        <CardDescription>Configure your company's travel rules</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          { label: "Flight Class", desc: policy?.allow_economy ? "Economy allowed" : "Economy restricted" },
                          { label: "Hotel Budget", desc: policy?.max_spend_per_day_cents ? `Max $${(policy.max_spend_per_day_cents / 100).toFixed(0)}/day` : "No limit set" },
                          { label: "Advance Booking", desc: policy?.business_hours_only ? "Business hours only" : "Anytime" },
                        ].map((row) => (
                          <div key={row.label} className="p-4 rounded-lg border">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{row.label}</p>
                                <p className="text-sm text-muted-foreground">{row.desc}</p>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => navigate("/business/settings")}>Edit</Button>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Travel Reports</CardTitle>
                      <CardDescription>Download detailed reports for your records</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                          { name: "Invoice History", type: "CSV" },
                          { name: "Traveler Summary", type: "CSV" },
                          { name: "Policy Compliance", type: "CSV" },
                          { name: "Booking History", type: "CSV" },
                          { name: "Savings Analysis", type: "CSV" },
                          { name: "Carbon Footprint", type: "CSV" },
                        ].map((report) => (
                          <div key={report.name} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{report.name}</p>
                                <p className="text-xs text-muted-foreground">{report.type}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleExport}>
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
