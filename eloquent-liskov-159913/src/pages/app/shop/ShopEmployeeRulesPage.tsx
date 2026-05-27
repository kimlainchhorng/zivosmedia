import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Shield, Plus, X, Check, ChevronRight, AlertCircle, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Rule {
  id: string;
  store_id: string;
  title: string;
  description: string | null;
  category: string;
  active: boolean;
  position: number;
  created_at: string;
}

interface AckRow {
  rule_id: string;
  employee_id: string;
}

const CATEGORIES = ["General", "Safety", "Conduct", "Schedule", "Appearance", "Technology"];

const SEED_RULES: Omit<Rule, "id" | "store_id" | "created_at">[] = [
  { title: "Punctuality", description: "Employees must arrive on time and notify management at least 2 hours in advance if unable to attend.", category: "Schedule", active: true, position: 0 },
  { title: "Dress Code", description: "All staff must wear the provided uniform during working hours and maintain a neat, professional appearance.", category: "Appearance", active: true, position: 1 },
  { title: "Phone Policy", description: "Personal phone use is limited to break times. No phones during customer interactions.", category: "Technology", active: true, position: 2 },
  { title: "Respectful Workplace", description: "All employees must treat colleagues and customers with respect. Discrimination or harassment will not be tolerated.", category: "Conduct", active: true, position: 3 },
  { title: "Food Safety", description: "All employees handling food must follow hygiene protocols including handwashing and glove use at all times.", category: "Safety", active: true, position: 4 },
];

export default function ShopEmployeeRulesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [acks, setAcks] = useState<AckRow[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [form, setForm] = useState({ title: "", description: "", category: "General" });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) return;

      const { data: store } = await (supabase as any)
        .from("store_profiles")
        .select("id")
        .eq("owner_id", uid)
        .limit(1)
        .maybeSingle();
      const sid = store?.id || null;
      setStoreId(sid);
      if (!sid) return;

      const [{ data: ruleData }, { data: empData }] = await Promise.all([
        (supabase as any)
          .from("employee_rules")
          .select("id, store_id, title, description, category, active, position, created_at")
          .eq("store_id", sid)
          .order("position", { ascending: true }),
        (supabase as any)
          .from("store_employees")
          .select("id")
          .eq("store_id", sid)
          .eq("status", "active"),
      ]);

      let rows = (ruleData || []) as Rule[];
      const empRows = (empData || []) as { id: string }[];
      setEmployeeCount(empRows.length);

      if (rows.length === 0) {
        const seeded = SEED_RULES.map((r) => ({ ...r, store_id: sid }));
        const { data: inserted } = await (supabase as any)
          .from("employee_rules")
          .insert(seeded)
          .select("id, store_id, title, description, category, active, position, created_at");
        rows = ((inserted || []) as Rule[]).sort((a, b) => a.position - b.position);
      }
      setRules(rows);

      if (rows.length) {
        const { data: ackData } = await (supabase as any)
          .from("employee_rule_acknowledgements")
          .select("rule_id, employee_id")
          .in(
            "rule_id",
            rows.map((r) => r.id),
          );
        setAcks((ackData || []) as AckRow[]);
      } else {
        setAcks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const ackCountByRule = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of acks) m.set(a.rule_id, (m.get(a.rule_id) ?? 0) + 1);
    return m;
  }, [acks]);

  const addRule = async () => {
    if (!storeId || !form.title.trim()) return;
    setSaving(true);
    try {
      const nextPos = (rules.at(-1)?.position ?? -1) + 1;
      const { error } = await (supabase as any).from("employee_rules").insert({
        store_id: storeId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        active: true,
        position: nextPos,
      });
      if (error) throw error;
      toast.success(`Rule added: ${form.title.trim()}`);
      setForm({ title: "", description: "", category: "General" });
      setShowForm(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Could not add rule.");
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: Rule) => {
    const next = !rule.active;
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, active: next } : r)));
    const { error } = await (supabase as any)
      .from("employee_rules")
      .update({ active: next })
      .eq("id", rule.id);
    if (error) {
      toast.error("Could not update rule.");
      loadData();
      return;
    }
    toast.success(`${rule.title} ${next ? "enabled" : "disabled"}`);
  };

  const removeRule = async (rule: Rule) => {
    if (!confirm(`Remove rule "${rule.title}"?`)) return;
    setRules((prev) => prev.filter((r) => r.id !== rule.id));
    const { error } = await (supabase as any).from("employee_rules").delete().eq("id", rule.id);
    if (error) {
      toast.error("Could not remove rule.");
      loadData();
      return;
    }
    toast.success("Rule removed");
  };

  const categoriesPresent = ["All", ...CATEGORIES.filter((c) => rules.some((r) => r.category === c))];
  const filtered = rules.filter((r) => categoryFilter === "All" || r.category === categoryFilter);
  const activeCount = rules.filter((r) => r.active).length;

  return (
    <AppLayout title="Employee Rules" hideHeader>
      <div className="flex flex-col px-4 pt-3 pb-24 max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5 mb-5">
          <button type="button" onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-[17px] flex-1">Employee Rules</h1>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Rule
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading rules…</p>
        ) : !storeId ? (
          <p className="text-sm text-muted-foreground">No owner store found for this account.</p>
        ) : (
          <>
            <Card className="p-4 border-border mb-4 bg-secondary">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Shield className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[15px]">{rules.length} workplace rules</p>
                  <p className="text-[12px] text-muted-foreground">
                    {activeCount} active · {rules.length - activeCount} disabled
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Users className="w-3.5 h-3.5" /> {employeeCount} team
                </div>
              </div>
            </Card>

            {categoriesPresent.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-4">
                {categoriesPresent.map((c) => (
                  <button type="button"
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all",
                      categoryFilter === c
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <AnimatePresence>
              {showForm && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-4">
                  <Card className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-[14px]">Add Rule</p>
                      <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-muted/60">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Rule title (e.g. Break Policy)"
                      className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      autoFocus
                    />
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Rule description..."
                      rows={3}
                      className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="flex gap-2">
                      <select
                        value={form.category}
                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                        className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                      <Button onClick={addRule} disabled={saving || !form.title.trim()}>
                        {saving ? "Adding…" : "Add"}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {filtered.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No rules in this category</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {filtered.map((rule) => {
                  const ackCount = ackCountByRule.get(rule.id) ?? 0;
                  const ackPct = employeeCount > 0 ? Math.round((ackCount / employeeCount) * 100) : 0;
                  return (
                    <Card key={rule.id} className={cn("p-3 transition-opacity", !rule.active && "opacity-50")}>
                      <div className="flex items-start gap-3">
                        <button type="button"
                          onClick={() => toggleRule(rule)}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                            rule.active ? "bg-primary border-primary" : "border-border",
                          )}
                        >
                          {rule.active && <Check className="w-3 h-3 text-primary-foreground" />}
                        </button>
                        <button type="button" className="flex-1 text-left min-w-0" onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn("font-semibold text-[13px]", !rule.active && "line-through")}>{rule.title}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{rule.category}</span>
                            {employeeCount > 0 && (
                              <span
                                className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-full",
                                  ackPct === 100
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                                    : "bg-amber-500/15 text-amber-600 dark:text-amber-300",
                                )}
                              >
                                {ackCount}/{employeeCount} acked
                              </span>
                            )}
                          </div>
                          <AnimatePresence>
                            {expandedId === rule.id && (
                              <motion.p
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="text-[12px] text-muted-foreground mt-1 overflow-hidden"
                              >
                                {rule.description}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <ChevronRight className={cn("w-4 h-4 text-muted-foreground/40 transition-transform", expandedId === rule.id && "rotate-90")} />
                          <button type="button" onClick={() => removeRule(rule)} className="p-1 rounded-lg hover:bg-muted/60">
                            <X className="w-3.5 h-3.5 text-muted-foreground/50" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
