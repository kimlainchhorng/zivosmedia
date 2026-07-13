/**
 * Business Account Dashboard
 * Corporate renter account management
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  CreditCard,
  FileText,
  Plus,
  Settings,
  Loader2,
  Check,
  X,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useBusinessAccount,
  useAuthorizedDrivers,
  useAddAuthorizedDriver,
  useRemoveAuthorizedDriver,
  type AuthorizedDriver,
} from "@/hooks/useBusinessAccount";
import { cn } from "@/lib/utils";

export default function BusinessAccountPage() {
  const navigate = useNavigate();
  const { data: account, isLoading } = useBusinessAccount();
  const { data: drivers } = useAuthorizedDrivers(account?.id);
  const addDriver = useAddAuthorizedDriver();
  const removeDriver = useRemoveAuthorizedDriver();

  const [showAddDriver, setShowAddDriver] = useState(false);
  const [newDriver, setNewDriver] = useState({
    driver_name: "",
    driver_email: "",
    driver_phone: "",
    license_number: "",
    license_state: "",
  });

  const handleAddDriver = async () => {
    if (!account) return;
    await addDriver.mutateAsync({
      business_account_id: account.id,
      ...newDriver,
      is_active: true,
    });
    setShowAddDriver(false);
    setNewDriver({
      driver_name: "",
      driver_email: "",
      driver_phone: "",
      license_number: "",
      license_state: "",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!account) {
    // Show signup prompt
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center space-y-6 py-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Business Account</h1>
          <p className="text-muted-foreground">
            Streamline rentals for your company with saved drivers, invoicing, and more.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center py-6">
            <div>
              <p className="text-3xl font-bold text-primary">Unlimited</p>
              <p className="text-sm text-muted-foreground">Drivers</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">Net-30</p>
              <p className="text-sm text-muted-foreground">Invoicing</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">10%</p>
              <p className="text-sm text-muted-foreground">Discounts</p>
            </div>
          </div>
          <Button size="lg" onClick={() => navigate("/business/signup")}>
            <Plus className="w-5 h-5 mr-2" />
            Create Business Account
          </Button>
        </div>
      </div>
    );
  }

  const statusBadge = {
    pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
    approved: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
    suspended: { label: "Suspended", className: "bg-red-100 text-red-700" },
  }[account.status];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 safe-area-top z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{account.company_name}</h1>
              <Badge className={cn("mt-1", statusBadge.className)}>
                {statusBadge.label}
              </Badge>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/business/settings")}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{drivers?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Drivers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{account.total_bookings}</p>
                  <p className="text-sm text-muted-foreground">Bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold">
                    ${(account.total_spent || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-foreground" />
                <div>
                  <p className="text-2xl font-bold capitalize">
                    {account.payment_method}
                  </p>
                  <p className="text-sm text-muted-foreground">Payment</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Authorized Drivers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Authorized Drivers</CardTitle>
                <CardDescription>
                  Drivers who can rent vehicles under this account
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddDriver(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Driver
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {drivers && drivers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>License</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">
                        {driver.driver_name}
                      </TableCell>
                      <TableCell>{driver.driver_email || "—"}</TableCell>
                      <TableCell>
                        {driver.license_number
                          ? `${driver.license_state} ****${driver.license_number.slice(-4)}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={driver.is_verified ? "default" : "secondary"}
                        >
                          {driver.is_verified ? "Verified" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => removeDriver.mutate(driver.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No authorized drivers yet</p>
                <p className="text-sm">Add drivers to allow them to rent under this account</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Info */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Billing Contact</p>
              <p className="font-medium">{account.billing_contact_name}</p>
              <p className="text-sm">{account.billing_contact_email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <p className="font-medium capitalize">{account.payment_method}</p>
              {account.payment_method === "invoice" && (
                <p className="text-sm">Net {account.payment_terms_days} days</p>
              )}
            </div>
            {account.billing_address && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Billing Address</p>
                <p className="font-medium">
                  {account.billing_address}, {account.billing_city}, {account.billing_state} {account.billing_zip}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add Driver Modal */}
      <Dialog open={showAddDriver} onOpenChange={setShowAddDriver}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Authorized Driver</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Driver Name *</Label>
              <Input
                placeholder="Full name"
                value={newDriver.driver_name}
                onChange={(e) =>
                  setNewDriver({ ...newDriver, driver_name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="driver@company.com"
                  value={newDriver.driver_email}
                  onChange={(e) =>
                    setNewDriver({ ...newDriver, driver_email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={newDriver.driver_phone}
                  onChange={(e) =>
                    setNewDriver({ ...newDriver, driver_phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>License Number</Label>
                <Input
                  placeholder="DL number"
                  value={newDriver.license_number}
                  onChange={(e) =>
                    setNewDriver({ ...newDriver, license_number: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>License State</Label>
                <Input
                  placeholder="CA"
                  maxLength={2}
                  value={newDriver.license_state}
                  onChange={(e) =>
                    setNewDriver({ ...newDriver, license_state: e.target.value.toUpperCase() })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDriver(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddDriver}
              disabled={!newDriver.driver_name || addDriver.isPending}
            >
              {addDriver.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Add Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
