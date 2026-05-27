// AdminDriverVerificationPage — wrapped in AdminLayout for proper admin chrome + back nav.
// (re-saved to nudge Vite HMR after a stale cache)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

interface Row {
  id: string;
  driver_id: string;
  document_type: string;
  file_path: string | null;
  status: string;
  uploaded_at: string | null;
  rejection_reason: string | null;
  driver_name?: string;
}

export default function AdminDriverVerificationPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasonByRow, setReasonByRow] = useState<Record<string, string>>({});
  const [signed, setSigned] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("driver_documents")
      .select("id, driver_id, document_type, file_path, status, uploaded_at, rejection_reason")
      .order("uploaded_at", { ascending: false, nullsFirst: false })
      .limit(200);
    const docs = (data ?? []) as Row[];
    // fetch driver names
    const driverIds = Array.from(new Set(docs.map((d) => d.driver_id)));
    if (driverIds.length) {
      const { data: drivers } = await supabase.from("drivers").select("id, full_name").in("id", driverIds);
      const map = new Map((drivers ?? []).map((d: any) => [d.id, d.full_name]));
      docs.forEach((r) => (r.driver_name = map.get(r.driver_id) ?? r.driver_id.slice(0, 8)));
    }
    setRows(docs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const viewFile = async (row: Row) => {
    if (!row.file_path) return;
    if (signed[row.id]) {
      window.open(signed[row.id], "_blank");
      return;
    }
    const { data } = await supabase.storage.from("driver-documents").createSignedUrl(row.file_path, 300);
    if (data?.signedUrl) {
      setSigned((s) => ({ ...s, [row.id]: data.signedUrl }));
      window.open(data.signedUrl, "_blank");
    }
  };

  const decide = async (row: Row, status: "approved" | "rejected") => {
    const reason = reasonByRow[row.id] ?? null;
    if (status === "rejected" && !reason) {
      toast.error("Provide a rejection reason");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("driver_documents")
      .update({
        status,
        rejection_reason: status === "rejected" ? reason : null,
        approved_by: user?.id ?? null,
        approved_at: status === "approved" ? new Date().toISOString() : null,
        reviewed_at: new Date().toISOString(),
      } as any)
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Document ${status}`);
      load();
    }
  };

  const pending = rows.filter((r) => r.status === "pending");

  return (
    <AdminLayout title="Driver Verification — ZIVO Admin">
      <div className="container max-w-6xl py-6 space-y-4">
        {/* Sticky-ish header with back + refresh */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/admin"))}
            className="h-9 w-9 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-tight">Driver Verification Queue</h1>
            <p className="text-sm text-muted-foreground">
              {pending.length} pending review · {rows.length} total
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
        </div>

        <Card>
        <CardHeader><CardTitle>Pending Reviews</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={5}>No documents.</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.driver_name}</TableCell>
                  <TableCell>{r.document_type}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.uploaded_at ? new Date(r.uploaded_at).toLocaleString() : "—"}</TableCell>
                  <TableCell className="space-y-2 min-w-[280px]">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => viewFile(r)} disabled={!r.file_path}>View</Button>
                      <Button size="sm" onClick={() => decide(r, "approved")} disabled={r.status === "approved"}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => decide(r, "rejected")}>Reject</Button>
                    </div>
                    <Input
                      placeholder="Rejection reason (required to reject)"
                      value={reasonByRow[r.id] ?? r.rejection_reason ?? ""}
                      onChange={(e) => setReasonByRow((s) => ({ ...s, [r.id]: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
}
