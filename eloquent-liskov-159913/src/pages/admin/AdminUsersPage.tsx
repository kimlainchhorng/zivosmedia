/**
 * Admin Users Management Page
 * View, search, and manage all registered users
 */
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, Search, Shield, ChevronLeft, ChevronRight,
  UserX, Eye, BadgeCheck, CheckCircle2, XCircle, Clock, Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminStoresVerification from "@/components/admin/AdminStoresVerification";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [requestSearchQuery, setRequestSearchQuery] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Verify / Unverify mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ userId, verified }: { userId: string; verified: boolean }) => {
      const { error } = await (supabase as any).rpc("set_profile_blue_verified_manual", {
        _target_user_id: userId,
        _verified: verified,
        _reason: verified ? "Manual Blue Verified approval" : "Manual Blue Verified removal",
      });
      if (error) throw error;
    },
    onSuccess: (_, { verified }) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(verified ? "Account verified ✓" : "Verification removed");
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, is_verified: verified });
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to update verification"),
  });

  const reviewRequestMutation = useMutation({
    mutationFn: async ({ requestId, approved, reason }: { requestId: string; approved: boolean; reason?: string }) => {
      const { error } = await (supabase as any).rpc("set_profile_blue_verified_from_request", {
        _request_id: requestId,
        _approved: approved,
        _rejection_reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, { approved }) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-verification-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-blue-verified-audit"] });
      setSelectedUser(null);
      setSelectedRequestIds((ids) => ids.filter((id) => !verificationRequests?.some((request: any) => request.id === id)));
      toast.success(approved ? "Blue verified badge approved" : "Verification request rejected");
    },
    onError: (err: any) => toast.error(err.message || "Failed to review request"),
  });

  // Fetch all profiles
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-users", isAdmin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin && !authLoading,
  });

  // Fetch user roles
  const { data: userRoles } = useQuery({
    queryKey: ["admin-user-roles", isAdmin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin && !authLoading,
  });

  const { data: verificationRequests } = useQuery({
    queryKey: ["admin-verification-requests", isAdmin],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("verification_requests")
        .select("id, user_id, full_name, category, document_url, additional_info, status, rejection_reason, reviewed_at, reviewed_by, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin && !authLoading,
  });

  const { data: auditLog } = useQuery({
    queryKey: ["admin-blue-verified-audit", isAdmin],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("blue_verified_audit_log")
        .select("id, request_id, target_user_id, reviewer_user_id, action, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin && !authLoading,
  });

  const getProfileUid = (profile: { id?: string | null; user_id?: string | null }) =>
    profile.user_id || profile.id || "";

  const bulkReviewMutation = useMutation({
    mutationFn: async ({ requestIds, approved }: { requestIds: string[]; approved: boolean }) => {
      for (const requestId of requestIds) {
        const { error } = await (supabase as any).rpc("set_profile_blue_verified_from_request", {
          _request_id: requestId,
          _approved: approved,
          _rejection_reason: approved ? null : "Bulk rejected by admin",
        });
        if (error) throw error;
      }
      return { count: requestIds.length, approved };
    },
    onSuccess: ({ count, approved }) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-verification-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-blue-verified-audit"] });
      setSelectedRequestIds([]);
      toast.success(`${count} request${count === 1 ? "" : "s"} ${approved ? "approved" : "rejected"}`);
    },
    onError: (err: any) => toast.error(err.message || "Bulk review failed"),
  });

  const roleMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    userRoles?.forEach((r) => {
      if (!map[r.user_id]) map[r.user_id] = [];
      map[r.user_id].push(r.role);
    });
    return map;
  }, [userRoles]);

  // Show all customers, hide only internal staff roles
  const customerProfiles = useMemo(() => {
    if (!profiles) return [];
    const excludedRoles = ["admin", "moderator", "super_admin", "operations", "finance", "support", "merchant", "owner", "manager"];
    return profiles.filter((p) => {
      const uid = getProfileUid(p);
      const roles = roleMap[uid] || [];
      return !roles.some((r) => excludedRoles.includes(r));
    });
  }, [profiles, roleMap]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return customerProfiles;
    const q = searchQuery.toLowerCase();
    return customerProfiles.filter((p) => {
      const uid = getProfileUid(p).toLowerCase();
      return (
        (p.full_name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q) ||
        uid.includes(q)
      );
    });
  }, [customerProfiles, searchQuery]);

  const totalPages = Math.ceil((filtered?.length || 0) / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const reviewerMap = useMemo(() => {
    const map: Record<string, any> = {};
    profiles?.forEach((profile: any) => {
      const uid = getProfileUid(profile);
      if (uid) map[uid] = profile;
    });
    return map;
  }, [profiles]);

  const filteredVerificationRequests = useMemo(() => {
    const q = requestSearchQuery.trim().toLowerCase();
    return (verificationRequests || []).filter((request: any) => {
      const matchesStatus = requestStatusFilter === "all" || request.status === requestStatusFilter;
      const matchesSearch = !q ||
        (request.full_name || "").toLowerCase().includes(q) ||
        (request.category || "").toLowerCase().includes(q) ||
        (request.additional_info || "").toLowerCase().includes(q) ||
        (request.user_id || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [verificationRequests, requestSearchQuery, requestStatusFilter]);

  const visiblePendingRequestIds = filteredVerificationRequests
    .filter((request: any) => request.status === "pending")
    .map((request: any) => request.id);
  const selectedPendingRequestIds = selectedRequestIds.filter((id) => visiblePendingRequestIds.includes(id));
  const allVisiblePendingSelected = visiblePendingRequestIds.length > 0 && visiblePendingRequestIds.every((id) => selectedRequestIds.includes(id));
  const pendingVerificationRequests = (verificationRequests || []).filter((request: any) => request.status === "pending");

  // Stats
  const stats = useMemo(() => {
    if (!customerProfiles.length) return { total: 0, verified: 0, setupComplete: 0 };
    return {
      total: customerProfiles.length,
      verified: customerProfiles.filter((p) => p.is_verified).length,
      setupComplete: customerProfiles.filter((p) => p.setup_complete).length,
    };
  }, [customerProfiles]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-bold text-ig-gradient mb-2">Access Denied</h1>
            <p className="text-muted-foreground">This page is restricted to administrators.</p>
            <Button onClick={() => navigate("/")} className="mt-4">Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminLayout title="Customer Management">
      <div className="space-y-6 max-w-7xl">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--flights)/0.10)] flex items-center justify-center">
                <BadgeCheck className="w-5 h-5 text-[hsl(var(--flights))]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.verified}</p>
                <p className="text-xs text-muted-foreground">Blue Verified</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <UserX className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total - stats.setupComplete}</p>
                <p className="text-xs text-muted-foreground">Incomplete Setup</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Blue Verified review panel */}
        <Card className="border-[hsl(var(--flights)/0.18)] bg-[hsl(var(--flights)/0.04)]">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <BadgeCheck className="h-4 w-4 text-[hsl(var(--flights))]" /> Blue Verified requests
                {pendingVerificationRequests.length > 0 && <Badge className="bg-amber-500/10 text-amber-600 border-0">{pendingVerificationRequests.length} pending</Badge>}
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                {(["pending", "approved", "rejected", "all"] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={requestStatusFilter === status ? "default" : "outline"}
                    className="h-8 rounded-full capitalize"
                    onClick={() => { setRequestStatusFilter(status); setSelectedRequestIds([]); }}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search requests by name, category, note, or user ID..."
                value={requestSearchQuery}
                onChange={(e) => setRequestSearchQuery(e.target.value)}
                className="h-10 rounded-xl pl-10"
              />
            </div>

            {visiblePendingRequestIds.length > 0 && (
              <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-card/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={allVisiblePendingSelected}
                    onChange={(e) => setSelectedRequestIds(e.target.checked ? visiblePendingRequestIds : [])}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Select all visible pending
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-[hsl(var(--flights))] text-primary-foreground hover:bg-[hsl(var(--flights)/0.90)]"
                    disabled={!selectedPendingRequestIds.length || bulkReviewMutation.isPending}
                    onClick={() => bulkReviewMutation.mutate({ requestIds: selectedPendingRequestIds, approved: true })}
                  >
                    {bulkReviewMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Bulk approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                    disabled={!selectedPendingRequestIds.length || bulkReviewMutation.isPending}
                    onClick={() => bulkReviewMutation.mutate({ requestIds: selectedPendingRequestIds, approved: false })}
                  >
                    <XCircle className="h-3.5 w-3.5" /> Bulk reject
                  </Button>
                </div>
              </div>
            )}

            {filteredVerificationRequests.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-card/60 p-6 text-center text-sm text-muted-foreground">No Blue Verified requests match this view.</div>
            ) : (
              <div className="space-y-2">
                {filteredVerificationRequests.map((request: any) => {
                  const isPending = request.status === "pending";
                  const reviewer = request.reviewed_by ? reviewerMap[request.reviewed_by] : null;
                  return (
                    <div key={request.id} className="rounded-xl border border-border/50 bg-card/80 p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {isPending && (
                              <input
                                type="checkbox"
                                checked={selectedRequestIds.includes(request.id)}
                                onChange={(e) => setSelectedRequestIds((ids) => e.target.checked ? [...ids, request.id] : ids.filter((id) => id !== request.id))}
                                className="h-4 w-4 rounded border-border accent-primary"
                              />
                            )}
                            <p className="truncate text-sm font-semibold text-foreground">{request.full_name}</p>
                            <RequestStatusBadge status={request.status} />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground capitalize">{request.category || "personal"} request · {request.created_at ? format(new Date(request.created_at), "MMM d, yyyy h:mm a") : "—"}</p>
                          {request.additional_info && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{request.additional_info}</p>}
                          {request.document_url && <a href={request.document_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-semibold text-[hsl(var(--flights))] hover:underline">View document</a>}
                          {request.rejection_reason && <p className="mt-2 text-xs text-destructive">Reason: {request.rejection_reason}</p>}
                          {request.reviewed_at && <p className="mt-1 text-[11px] text-muted-foreground">Reviewed {format(new Date(request.reviewed_at), "MMM d, yyyy h:mm a")}{reviewer ? ` by ${reviewer.full_name || reviewer.email || "admin"}` : ""}</p>}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button size="sm" className="gap-1.5 bg-[hsl(var(--flights))] text-primary-foreground hover:bg-[hsl(var(--flights)/0.90)]" disabled={!isPending || reviewRequestMutation.isPending} onClick={() => reviewRequestMutation.mutate({ requestId: request.id, approved: true })}>
                            {reviewRequestMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve badge
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10" disabled={!isPending || reviewRequestMutation.isPending} onClick={() => reviewRequestMutation.mutate({ requestId: request.id, approved: false, reason: "Request was not approved" })}>
                            <XCircle className="h-3.5 w-3.5" /> Reject request
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!!auditLog?.length && (
              <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Recent audit log</p>
                <div className="space-y-1.5">
                  {auditLog.slice(0, 5).map((entry: any) => {
                    const reviewer = reviewerMap[entry.reviewer_user_id];
                    return (
                      <div key={entry.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate text-foreground">{entry.action.replace("_", " ")} · {entry.reason || "No reason"}</span>
                        <span className="shrink-0 text-muted-foreground">{reviewer?.full_name || reviewer?.email || "Admin"} · {format(new Date(entry.created_at), "MMM d")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <AdminStoresVerification />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or user ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="pl-10 h-11 rounded-xl"
          />
        </div>

        {/* Users table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                {searchQuery ? "No users match your search." : "No users found."}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Roles</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((user) => {
                        const uid = getProfileUid(user);
                        const roles = roleMap[uid] || [];
                        return (
                        <tr key={uid} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="font-medium text-foreground truncate">{user.full_name || "—"}</p>
                                  {user.is_verified && <BadgeCheck className="w-4 h-4 text-[hsl(var(--flights))] shrink-0" />}
                                </div>
                                {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{user.email || "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 flex-wrap">
                              {user.email_verified ? (
                                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-0">Verified</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-500 border-0">Unverified</Badge>
                              )}
                              {user.setup_complete && (
                                <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">Setup Done</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {roles.filter((role) => role !== "driver").map((role) => (
                                <Badge key={role} variant="secondary" className="text-[10px] bg-secondary text-foreground border-0">
                                  <Shield className="w-2.5 h-2.5 mr-0.5" />{role}
                                </Badge>
                              ))}
                              {!roles.length && (
                                <span className="text-xs text-muted-foreground">user</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                            {user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                              className="text-xs"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> View
                            </Button>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-border">
                  {paginated.map((user) => {
                    const uid = getProfileUid(user);
                    const roles = roleMap[uid] || [];
                    return (
                    <button type="button"
                      key={uid}
                      onClick={() => setSelectedUser(user)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{user.full_name || "No Name"}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email || "—"}</p>
                          <div className="flex gap-1 mt-1">
                            {user.is_verified && (
                              <Badge variant="secondary" className="text-[9px] bg-[hsl(var(--flights)/0.10)] text-[hsl(var(--flights))] border-0 px-1.5 py-0">Blue Verified</Badge>
                            )}
                            {user.email_verified ? (
                              <Badge variant="secondary" className="text-[9px] bg-emerald-500/10 text-emerald-500 border-0 px-1.5 py-0">Verified</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px] bg-amber-500/10 text-amber-500 border-0 px-1.5 py-0">Unverified</Badge>
                            )}
                            {roles.filter((role) => role !== "driver").map((role) => (
                              <Badge key={role} variant="secondary" className="text-[9px] bg-secondary text-foreground border-0 px-1.5 py-0">{role}</Badge>
                            ))}
                          </div>
                        </div>
                        <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </button>
                  )})}
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User detail dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {(selectedUser?.full_name || selectedUser?.email || "?").charAt(0).toUpperCase()}
              </div>
              {selectedUser?.full_name || "User Details"}
            </DialogTitle>
            <DialogDescription>User profile information</DialogDescription>
          </DialogHeader>

          {selectedUser && (() => {
            const selectedUid = getProfileUid(selectedUser);
            const selectedRoles = roleMap[selectedUid] || [];

            return (
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem label="Email" value={selectedUser.email} />
                  <DetailItem label="Phone" value={selectedUser.phone} />
                  <DetailItem label="User ID" value={selectedUid} mono />
                  <DetailItem label="Joined" value={selectedUser.created_at ? format(new Date(selectedUser.created_at), "MMM d, yyyy h:mm a") : "—"} />
                  <DetailItem label="Email Verified" value={selectedUser.email_verified ? "Yes" : "No"} />
                  <DetailItem label="Setup Complete" value={selectedUser.setup_complete ? "Yes" : "No"} />
                  <DetailItem label="Country" value={selectedUser.country || "—"} />
                  <DetailItem label="City" value={selectedUser.city || "—"} />
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Roles</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {selectedRoles.filter((r: string) => r !== "driver").length > 0 ? (
                      selectedRoles.filter((r: string) => r !== "driver").map((role: string) => (
                        <Badge key={role} className="bg-secondary text-foreground border-0">
                          <Shield className="w-3 h-3 mr-1" />{role}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Regular user (no special roles)</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Account Verification</p>
                  <Button
                    variant={selectedUser.is_verified ? "outline" : "default"}
                    size="sm"
                    className="gap-2"
                    disabled={verifyMutation.isPending}
                    onClick={() => verifyMutation.mutate({ userId: selectedUid, verified: !selectedUser.is_verified })}
                  >
                    {selectedUser.is_verified ? (
                      <>
                        <BadgeCheck className="w-4 h-4 text-[hsl(var(--flights))]" />
                        Blue Verified — Remove Badge
                      </>
                    ) : (
                      <>
                        <BadgeCheck className="w-4 h-4" />
                        Give Blue Verified
                      </>
                    )}
                  </Button>
                  {selectedUser.is_verified && (
                    <p className="text-[10px] text-muted-foreground mt-1.5">This account has an active blue verified badge.</p>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function RequestStatusBadge({ status }: { status?: string | null }) {
  if (status === "approved") {
    return <Badge className="bg-emerald-500/10 text-emerald-600 border-0"><CheckCircle2 className="mr-1 h-3 w-3" />Approved</Badge>;
  }
  if (status === "rejected") {
    return <Badge className="bg-destructive/10 text-destructive border-0"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
  }
  return <Badge className="bg-amber-500/10 text-amber-600 border-0"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
}

function DetailItem({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={cn("text-sm text-foreground truncate", mono && "font-mono text-xs")}>{value || "—"}</p>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
