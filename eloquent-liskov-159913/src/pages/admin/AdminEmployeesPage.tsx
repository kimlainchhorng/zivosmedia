import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Plus, Mail, Shield, Trash2, UserCheck, UserX, RefreshCw, Pencil } from "lucide-react";
import { format } from "date-fns";

type Employee = {
  id: string;
  user_id: string;
  role: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

const STAFF_ROLES = ["admin", "moderator", "support", "operations"] as const;

export default function AdminEmployeesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("support");

  // Fetch employees: users with staff roles from user_roles + profile info
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role")
        .in("role", STAFF_ROLES);

      if (error) throw error;
      if (!roles?.length) return [];

      // Get profile info for these users
      const userIds = [...new Set(roles.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      return roles.map((r) => {
        const profile = profileMap.get(r.user_id);
        return {
          id: r.id,
          user_id: r.user_id,
          role: r.role,
          email: profile?.email ?? null,
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          created_at: "", // user_roles doesn't have created_at in all schemas
        } as Employee;
      });
    },
  });

  // Remove role
  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
      toast.success("Employee role removed");
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  // Send invite — assign role if user exists, otherwise save pending + send email
  const sendInvite = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Look up user by email in profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (profile?.user_id) {
        // User exists — assign role directly
        const { error } = await supabase.from("user_roles").insert({
          user_id: profile.user_id,
          role: role as any,
        });
        if (error) {
          if (error.code === "23505") throw new Error("User already has this role");
          throw error;
        }
      } else {
        // User not found — save as pending invitation
        const { error } = await supabase.from("admin_invitations").insert({
          email: normalizedEmail,
          role,
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
        if (error) throw error;
      }

      // Send invite email regardless
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "employee-invite",
            recipientEmail: normalizedEmail,
            templateData: {
              email: normalizedEmail,
              role,
              loginUrl: "https://hizivo.com/auth",
            },
          },
        });
      } catch (emailErr) {
        console.warn("Email send failed (role still assigned):", emailErr);
      }

      return { assigned: !!profile?.user_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
      toast.success(
        result?.assigned
          ? "Role assigned & invitation email sent"
          : "Invitation email sent (role will be assigned on sign-up)"
      );
      setInviteOpen(false);
      setInviteEmail("");
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  // Resend invitation email
  const resendInvite = useMutation({
    mutationFn: async (inv: { email: string; role: string }) => {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "employee-invite",
          recipientEmail: inv.email,
          templateData: { email: inv.email, role: inv.role, loginUrl: "https://hizivo.com/auth" },
        },
      });
    },
    onSuccess: () => toast.success("Invitation resent"),
    onError: () => toast.error("Failed to resend"),
  });

  // Delete invitation
  const deleteInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_invitations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
      toast.success("Invitation deleted");
    },
    onError: () => toast.error("Failed to delete invitation"),
  });

  // Update invitation role
  const updateInviteRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase
        .from("admin_invitations")
        .update({ role })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
      toast.success("Invitation role updated");
    },
    onError: () => toast.error("Failed to update role"),
  });

  // Pending invitations
  const { data: invitations = [] } = useQuery({
    queryKey: ["admin-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_invitations")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = employees.filter((e) => {
    const matchesSearch =
      !search ||
      e.email?.toLowerCase().includes(search.toLowerCase()) ||
      e.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || e.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleColor = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "moderator": return "default";
      case "support": return "secondary";
      case "operations": return "outline";
      default: return "secondary";
    }
  };

  return (
    <AdminLayout title="ZIVO Employees">
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAFF_ROLES.map((role) => (
            <Card key={role}>
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{role}s</p>
                <p className="text-xl font-bold text-foreground">
                  {employees.filter((e) => e.role === role).length}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-36 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {STAFF_ROLES.map((r) => (
                <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Employee</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    placeholder="employee@hizovo.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAFF_ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  disabled={!inviteEmail || sendInvite.isPending}
                  onClick={() => sendInvite.mutate({ email: inviteEmail, role: inviteRole })}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {sendInvite.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground">
                Pending Invitations ({invitations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{inv.email}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{inv.role}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Update Role */}
                      <Select
                        value={inv.role ?? "support"}
                        onValueChange={(role) => updateInviteRole.mutate({ id: inv.id, role })}
                      >
                        <SelectTrigger className="h-7 w-24 text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAFF_ROLES.map((r) => (
                            <SelectItem key={r} value={r} className="capitalize text-xs">{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Resend */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={resendInvite.isPending}
                        onClick={() => resendInvite.mutate({ email: inv.email, role: inv.role ?? "support" })}
                        title="Resend invitation"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${resendInvite.isPending ? "animate-spin" : ""}`} />
                      </Button>
                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          if (confirm(`Delete invitation for ${inv.email}?`)) {
                            deleteInvite.mutate(inv.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                      <Badge variant="outline" className="text-[10px]">Pending</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employee List */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Employees ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-center text-xs text-muted-foreground py-8">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">No employees found</p>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        {emp.avatar_url ? (
                          <img src={emp.avatar_url} className="h-8 w-8 rounded-full object-cover" alt="" />
                        ) : (
                          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {emp.full_name || emp.email || "Unknown"}
                        </p>
                        {emp.full_name && emp.email && (
                          <p className="text-[10px] text-muted-foreground truncate">{emp.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={roleColor(emp.role) as any} className="text-[10px] capitalize">
                        {emp.role}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          if (confirm(`Remove ${emp.role} role from ${emp.email ?? "this user"}?`)) {
                            removeRole.mutate(emp.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
