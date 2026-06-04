import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  CalendarIcon, User, Car, Clock, Phone, Mail, FileText,
  Search, MessageSquareText, CalendarClock, ExternalLink,
  CheckCircle2, XCircle, AlertCircle, TrendingUp, RefreshCw,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Wrench, Star, BarChart3, Download,
  Filter, SortAsc, SortDesc, Eye, Zap, Plus, Trash2
} from "lucide-react";
import { format, isToday, isThisMonth, parseISO, differenceInDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: AlertCircle,
  confirmed: CheckCircle2,
  completed: Star,
  cancelled: XCircle,
};

export default function AdminBookingsTab({ storeId }: { storeId: string }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; bookingId: string; notes: string }>({ open: false, bookingId: "", notes: "" });
  const [rescheduleDialog, setRescheduleDialog] = useState<{ open: boolean; bookingId: string; date: Date | undefined; time: string }>({ open: false, bookingId: "", date: undefined, time: "" });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(undefined);
  const [calMonth, setCalMonth] = useState<Date>(new Date());
  const [newDialog, setNewDialog] = useState<{
    open: boolean;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    service_name: string;
    vehicle_year: string;
    vehicle_make: string;
    vehicle_model: string;
    notes: string;
    date: Date | undefined;
    time: string;
    status: string;
  }>({
    open: false,
    customer_name: "", customer_phone: "", customer_email: "",
    service_name: "", vehicle_year: "", vehicle_make: "", vehicle_model: "",
    notes: "", date: undefined, time: "", status: "confirmed",
  });

  const resetNewDialog = () => setNewDialog({
    open: false, customer_name: "", customer_phone: "", customer_email: "",
    service_name: "", vehicle_year: "", vehicle_make: "", vehicle_model: "",
    notes: "", date: undefined, time: "", status: "confirmed",
  });

  const createBooking = async () => {
    if (!newDialog.customer_name.trim() || !newDialog.customer_phone.trim() || !newDialog.service_name.trim() || !newDialog.date || !newDialog.time) {
      toast.error("Name, phone, service, date and time are required");
      return;
    }
    setSaving(true);
    const payload: any = {
      store_id: storeId,
      customer_name: newDialog.customer_name.trim(),
      customer_phone: newDialog.customer_phone.trim(),
      customer_email: newDialog.customer_email.trim() || null,
      service_name: newDialog.service_name.trim(),
      vehicle_year: newDialog.vehicle_year.trim() || null,
      vehicle_make: newDialog.vehicle_make.trim() || null,
      vehicle_model: newDialog.vehicle_model.trim() || null,
      notes: newDialog.notes.trim() || null,
      preferred_date: format(newDialog.date, "yyyy-MM-dd"),
      preferred_time: newDialog.time,
      status: newDialog.status,
    };
    const { error } = await supabase.functions.invoke("service-booking-manage", {
      body: {
        action: "create",
        store_id: storeId,
        booking: payload,
      },
    });
    setSaving(false);
    if (error) { toast.error(error.message || "Failed to create booking"); return; }
    toast.success("Booking created");
    resetNewDialog();
    fetchBookings();
  };

  const fetchBookings = async () => {
    const { data } = await supabase
      .from("service_bookings")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: sortOrder === "asc" });
    setBookings(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, [storeId, sortOrder]);

  // On first load, jump the calendar to the month of the most recent booking
  // so the day-count indicators are visible right away.
  const calInit = useRef(false);
  useEffect(() => {
    if (calInit.current || bookings.length === 0) return;
    const dates = bookings.map((b) => b.preferred_date).filter(Boolean).sort();
    if (dates.length) { setCalMonth(parseISO(dates[dates.length - 1])); calInit.current = true; }
  }, [bookings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
    toast.success("Bookings refreshed");
  };

  const deleteBooking = async (id: string) => {
    if (!window.confirm("Delete this booking? This cannot be undone.")) return;
    const { error } = await supabase.functions.invoke("service-booking-manage", {
      body: { action: "delete", booking_id: id },
    });
    if (error) { toast.error(error.message || "Failed to delete booking"); return; }
    toast.success("Booking deleted");
    if (expandedId === id) setExpandedId(null);
    fetchBookings();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.functions.invoke("service-booking-manage", {
      body: { action: "update_status", booking_id: id, status },
    });
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`Booking ${status}`);
    fetchBookings();
  };

  const [convertingId, setConvertingId] = useState<string | null>(null);

  const convertToWorkOrder = async (b: any) => {
    if (b.workorder_id) return;
    setConvertingId(b.id);
    const woNumber = `WO-${Date.now().toString().slice(-6)}`;
    const vehicleLabel = [b.vehicle_year, b.vehicle_make, b.vehicle_model].filter(Boolean).join(" ") || "Unknown Vehicle";

    let vehicleId: string | null = null;
    if (b.customer_name && (b.vehicle_make || b.vehicle_model)) {
      const { data: existing } = await supabase
        .from("ar_customer_vehicles")
        .select("id")
        .eq("store_id", storeId)
        .eq("owner_name", b.customer_name)
        .ilike("make", b.vehicle_make || "%")
        .ilike("model", b.vehicle_model || "%")
        .maybeSingle();
      if (existing?.id) {
        vehicleId = existing.id;
      } else {
        const { data: created, error: vErr } = await supabase
          .from("ar_customer_vehicles")
          .insert({
            store_id: storeId,
            owner_name: b.customer_name,
            owner_phone: b.customer_phone || null,
            owner_email: b.customer_email || null,
            year: b.vehicle_year ? parseInt(b.vehicle_year, 10) || null : null,
            make: b.vehicle_make || "Unknown",
            model: b.vehicle_model || "Unknown",
          } as any)
          .select("id")
          .single();
        if (!vErr && created?.id) vehicleId = created.id;
      }
    }

    const { data: wo, error: woErr } = await supabase
      .from("ar_work_orders")
      .insert({
        store_id: storeId,
        number: woNumber,
        customer_name: b.customer_name,
        customer_phone: b.customer_phone || null,
        customer_email: b.customer_email || null,
        vehicle_id: vehicleId,
        vehicle_label: vehicleLabel,
        notes: [b.service_name, b.notes].filter(Boolean).join("\n"),
        status: "awaiting",
      } as any)
      .select("id")
      .single();
    if (woErr || !wo) { toast.error("Failed to create work order"); setConvertingId(null); return; }
    await supabase.functions.invoke("service-booking-manage", {
      body: { action: "link_workorder", booking_id: b.id, workorder_id: wo.id },
    });
    setConvertingId(null);
    toast.success(`Work Order ${woNumber} created${vehicleId ? " with linked vehicle" : ""}`);
    fetchBookings();
  };

  const saveNotes = async () => {
    setSaving(true);
    const { error } = await supabase.functions.invoke("service-booking-manage", {
      body: {
        action: "save_notes",
        booking_id: notesDialog.bookingId,
        admin_notes: notesDialog.notes,
      },
    });
    setSaving(false);
    if (error) { toast.error("Failed to save notes"); return; }
    toast.success("Notes saved");
    setNotesDialog({ open: false, bookingId: "", notes: "" });
    fetchBookings();
  };

  const saveReschedule = async () => {
    if (!rescheduleDialog.date || !rescheduleDialog.time) {
      toast.error("Please select both date and time");
      return;
    }
    setSaving(true);
    const { error } = await supabase.functions.invoke("service-booking-manage", {
      body: {
        action: "reschedule",
        booking_id: rescheduleDialog.bookingId,
        preferred_date: format(rescheduleDialog.date, "yyyy-MM-dd"),
        preferred_time: rescheduleDialog.time,
      },
    });
    setSaving(false);
    if (error) { toast.error("Failed to reschedule"); return; }
    toast.success("Booking rescheduled");
    setRescheduleDialog({ open: false, bookingId: "", date: undefined, time: "" });
    fetchBookings();
  };

  // Drag-to-reschedule: drop a booking on a calendar day to move it there,
  // keeping its time. Optimistic update, then persist via the same backend
  // reschedule action and refetch.
  const moveBooking = async (bookingId: string, newDateStr: string) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b || b.preferred_date === newDateStr) return;
    const prevDate = b.preferred_date;
    setBookings((list) => list.map((x) => x.id === bookingId ? { ...x, preferred_date: newDateStr } : x));
    const { error } = await supabase.functions.invoke("service-booking-manage", {
      body: {
        action: "reschedule",
        booking_id: bookingId,
        preferred_date: newDateStr,
        preferred_time: b.preferred_time || "09:00",
      },
    });
    if (error) {
      setBookings((list) => list.map((x) => x.id === bookingId ? { ...x, preferred_date: prevDate } : x));
      toast.error("Couldn't move booking");
      return;
    }
    toast.success(`Moved to ${format(parseISO(newDateStr), "MMM d")}`);
    fetchBookings();
  };

  const filtered = useMemo(() => {
    return bookings
      .filter(b => filter === "all" || b.status === filter)
      .filter(b => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          b.customer_name?.toLowerCase().includes(q) ||
          b.customer_phone?.toLowerCase().includes(q) ||
          b.customer_email?.toLowerCase().includes(q) ||
          b.service_name?.toLowerCase().includes(q)
        );
      });
  }, [bookings, filter, search]);

  const pendingCount = bookings.filter(b => b.status === "pending").length;
  const confirmedCount = bookings.filter(b => b.status === "confirmed").length;
  const completedCount = bookings.filter(b => b.status === "completed").length;
  const cancelledCount = bookings.filter(b => b.status === "cancelled").length;
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayCount = bookings.filter(b => b.preferred_date === todayStr).length;
  const thisMonthCount = bookings.filter(b => {
    try { return isThisMonth(parseISO(b.preferred_date)); } catch { return false; }
  }).length;

  // Upcoming bookings (next 7 days, confirmed or pending)
  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return bookings
      .filter(b => (b.status === "pending" || b.status === "confirmed"))
      .filter(b => {
        try {
          const d = parseISO(b.preferred_date);
          const diff = differenceInDays(d, now);
          return diff >= 0 && diff <= 7;
        } catch { return false; }
      })
      .sort((a, b) => a.preferred_date.localeCompare(b.preferred_date));
  }, [bookings]);

  const completionRate = bookings.length > 0
    ? Math.round((completedCount / bookings.length) * 100)
    : 0;

  if (loading) return (
    <div className="py-12 text-center text-muted-foreground space-y-3">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin opacity-40" />
      <p className="text-sm">Loading bookings...</p>
    </div>
  );

  const timeSlots = [
    "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
    "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
    "5:00 PM", "5:30 PM", "6:00 PM",
  ];

  const getTimeLabel = (b: any) => {
    try {
      const d = parseISO(b.preferred_date);
      if (isToday(d)) return "Today";
      const diff = differenceInDays(d, new Date());
      if (diff === 1) return "Tomorrow";
      if (diff === -1) return "Yesterday";
      if (diff > 1 && diff <= 7) return `In ${diff} days`;
      return format(d, "MMM d");
    } catch { return ""; }
  };

  return (
    <div className="space-y-5">
      {/* ── Header with refresh ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Customer Bookings</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{bookings.length} total bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setNewDialog(n => ({ ...n, open: true }))}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New Booking
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Enhanced Stats Grid ── */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="overflow-hidden border-l-4 border-l-primary/60">
          <CardContent className="p-2.5 sm:p-2.5 pt-2.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-lg font-bold leading-none text-foreground">{bookings.length}</p>
                <p className="text-[10px] text-muted-foreground truncate">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-amber-400">
          <CardContent className="p-2.5 sm:p-2.5 pt-2.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-lg font-bold leading-none text-amber-700">{pendingCount}</p>
                <p className="text-[10px] text-amber-600 truncate">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-blue-400">
          <CardContent className="p-2.5 sm:p-2.5 pt-2.5">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 shrink-0 text-blue-600" />
              <div className="min-w-0">
                <p className="text-lg font-bold leading-none text-blue-700">{todayCount}</p>
                <p className="text-[10px] text-blue-600 truncate">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-green-400">
          <CardContent className="p-2.5 sm:p-2.5 pt-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
              <div className="min-w-0">
                <p className="text-lg font-bold leading-none text-green-700">{completedCount}</p>
                <p className="text-[10px] text-green-600 truncate">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Insights Row ── */}
      {upcomingBookings.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {/* Upcoming */}
          {upcomingBookings.length > 0 && (
            <Card>
              <CardContent className="p-4 sm:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-semibold text-foreground">Upcoming ({upcomingBookings.length})</p>
                </div>
                <div className="space-y-2">
                  {upcomingBookings.slice(0, 3).map(b => (
                    <div key={b.id} className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate font-medium text-foreground">{b.service_name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{getTimeLabel(b)}</Badge>
                        <Badge className={cn("text-[10px] px-1.5 py-0", STATUS_COLORS[b.status])}>{b.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {upcomingBookings.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">+{upcomingBookings.length - 3} more upcoming</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      )}

      {/* ── Search + Filter + Sort ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email, or service..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({bookings.length})</SelectItem>
            <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
            <SelectItem value="confirmed">Confirmed ({confirmedCount})</SelectItem>
            <SelectItem value="completed">Completed ({completedCount})</SelectItem>
            <SelectItem value="cancelled">Cancelled ({cancelledCount})</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="icon"
          variant="outline"
          onClick={() => setSortOrder(o => o === "desc" ? "asc" : "desc")}
          className="shrink-0"
          title={sortOrder === "desc" ? "Newest first" : "Oldest first"}
        >
          {sortOrder === "desc" ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
        </Button>
      </div>

      {/* ── Calendar View ── */}
      {(() => {
        const bookingDates = new Map<string, { count: number; statuses: string[] }>();
        bookings.forEach(b => {
          if (!b.preferred_date) return;
          const key = b.preferred_date;
          const existing = bookingDates.get(key) || { count: 0, statuses: [] };
          existing.count++;
          existing.statuses.push(b.status);
          bookingDates.set(key, existing);
        });

        return (
          <Card>
            <CardContent className="p-4 sm:p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <BookingsCalendar
                    month={calMonth}
                    onMonthChange={setCalMonth}
                    selected={calendarDate}
                    onSelect={setCalendarDate}
                    bookingDates={bookingDates}
                    onDropBooking={moveBooking}
                  />
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">Tip: drag a booking onto a day to reschedule it.</p>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    {calendarDate
                      ? format(calendarDate, "EEEE, MMM d, yyyy")
                      : "Select a date to view bookings"
                    }
                  </h4>
                  {calendarDate ? (() => {
                    const dateStr = format(calendarDate, "yyyy-MM-dd");
                    const dayBookings = filtered.filter(b => b.preferred_date === dateStr);
                    if (dayBookings.length === 0) return (
                      <div className="text-center py-8">
                        <CalendarClock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No bookings on this day</p>
                      </div>
                    );
                    return (
                      <ScrollArea className="h-[260px]">
                        <div className="space-y-2 pr-2">
                          {dayBookings.map(b => {
                            const StatusIcon = STATUS_ICONS[b.status] || AlertCircle;
                            return (
                              <div
                                key={b.id}
                                draggable
                                onDragStart={(e) => { e.dataTransfer.setData("text/plain", b.id); e.dataTransfer.effectAllowed = "move"; }}
                                className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors cursor-grab active:cursor-grabbing"
                                onClick={() => { setExpandedId(b.id); }}
                                title="Drag to a day to reschedule"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{b.service_name}</p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <User className="h-3 w-3" />
                                    {b.customer_name}
                                    {b.preferred_time && (
                                      <span className="ml-2 flex items-center gap-0.5">
                                        <Clock className="h-3 w-3" /> {b.preferred_time}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <Badge className={cn("text-[10px] shrink-0", STATUS_COLORS[b.status])}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {b.status}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    );
                  })() : (
                    <div className="space-y-2">
                      {Array.from(bookingDates.entries()).slice(0, 5).map(([dateKey, info]) => (
                        <div
                          key={dateKey}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => setCalendarDate(parseISO(dateKey))}
                        >
                          <span className="text-sm text-foreground">{format(parseISO(dateKey), "EEE, MMM d")}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {info.count} booking{info.count > 1 ? "s" : ""}
                          </Badge>
                        </div>
                      ))}
                      {bookingDates.size === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">No bookings scheduled</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* ── Results count ── */}
      {search && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} found
        </p>
      )}

      {/* ── Bookings List ── */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/60 flex items-center justify-center">
              <CalendarIcon className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-semibold text-foreground">No bookings {search ? "matching your search" : "yet"}</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
              {search
                ? "Try adjusting your search or filter criteria"
                : "When customers book services from your store, they'll appear here for you to manage"
              }
            </p>
            {search && (
              <Button size="sm" variant="outline" className="mt-4" onClick={() => { setSearch(""); setFilter("all"); }}>
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => {
            const isExpanded = expandedId === b.id;
            const StatusIcon = STATUS_ICONS[b.status] || AlertCircle;

            return (
              <Card
                key={b.id}
                className={cn(
                  "transition-all duration-200 hover:shadow-md",
                  b.status === "pending" && "ring-1 ring-amber-200/60",
                  isExpanded && "shadow-md"
                )}
              >
                <CardContent className="p-0 sm:p-0">
                  {/* Main Row */}
                  <div
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", b.id); e.dataTransfer.effectAllowed = "move"; }}
                    className="flex items-center gap-2.5 p-2.5 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  >
                    {/* Status indicator */}
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                      b.status === "pending" && "bg-amber-100",
                      b.status === "confirmed" && "bg-blue-100",
                      b.status === "completed" && "bg-green-100",
                      b.status === "cancelled" && "bg-red-100",
                    )}>
                      <StatusIcon className={cn(
                        "h-3.5 w-3.5",
                        b.status === "pending" && "text-amber-600",
                        b.status === "confirmed" && "text-blue-600",
                        b.status === "completed" && "text-green-600",
                        b.status === "cancelled" && "text-red-500",
                      )} />
                    </div>

                    {/* Info — single line: service · customer · date · time */}
                    <div className="flex flex-1 min-w-0 items-center gap-2">
                      <p className="shrink-0 max-w-[40%] truncate text-sm font-semibold text-foreground">{b.service_name}</p>
                      {b.admin_notes && <MessageSquareText className="h-3 w-3 shrink-0 text-amber-500" />}
                      <span className="truncate text-xs text-muted-foreground">
                        {b.customer_name} · {format(new Date(b.preferred_date), "MMM d")} · {b.preferred_time}
                      </span>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge className={cn("text-[10px] px-1.5 py-0", STATUS_COLORS[b.status])}>{b.status}</Badge>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      <div className="p-3 space-y-2.5">
                        {/* Customer Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center gap-2 text-xs bg-muted/30 rounded-lg px-2.5 py-1.5">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Customer</p>
                              <p className="font-medium text-foreground">{b.customer_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs bg-muted/30 rounded-lg px-2.5 py-1.5">
                            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Phone</p>
                              <a href={`tel:${b.customer_phone}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                                {b.customer_phone} <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs bg-muted/30 rounded-lg px-2.5 py-1.5">
                            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</p>
                              <a href={`mailto:${b.customer_email}`} className="font-medium text-primary hover:underline flex items-center gap-1 truncate">
                                {b.customer_email} <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            </div>
                          </div>
                          {(b.vehicle_make || b.vehicle_model) && (
                            <div className="flex items-center gap-2 text-xs bg-muted/30 rounded-lg px-2.5 py-1.5">
                              <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vehicle</p>
                                <p className="font-medium text-foreground">{[b.vehicle_year, b.vehicle_make, b.vehicle_model].filter(Boolean).join(" ")}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Schedule info */}
                        <div className="flex items-center gap-3 text-xs bg-primary/5 rounded-lg px-2.5 py-1.5">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            <span className="font-medium">{format(new Date(b.preferred_date), "EEEE, MMMM d, yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="font-medium">{b.preferred_time}</span>
                          </div>
                        </div>

                        {/* Customer notes */}
                        {b.notes && (
                          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                            <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] uppercase tracking-wider font-medium mb-0.5">Customer Note</p>
                              <p>{b.notes}</p>
                            </div>
                          </div>
                        )}

                        {/* Admin notes */}
                        {b.admin_notes && (
                          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                            <MessageSquareText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] uppercase tracking-wider font-medium mb-0.5">Admin Note</p>
                              <p>{b.admin_notes}</p>
                            </div>
                          </div>
                        )}

                        <Separator />

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                          {b.status === "pending" && (
                            <>
                              <Button size="sm" onClick={() => updateStatus(b.id, "confirmed")} className="gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => updateStatus(b.id, "cancelled")} className="gap-1.5">
                                <XCircle className="h-3.5 w-3.5" /> Cancel
                              </Button>
                            </>
                          )}
                          {b.status === "confirmed" && (
                            <>
                              <Button size="sm" onClick={() => updateStatus(b.id, "completed")} className="gap-1.5">
                                <Star className="h-3.5 w-3.5" /> Mark Completed
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, "pending")} className="gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5" /> Set Pending
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => updateStatus(b.id, "cancelled")} className="gap-1.5">
                                <XCircle className="h-3.5 w-3.5" /> Cancel
                              </Button>
                            </>
                          )}
                          {b.status === "cancelled" && (
                            <>
                              <Button size="sm" onClick={() => updateStatus(b.id, "confirmed")} className="gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Reopen & Confirm
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, "pending")} className="gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5" /> Reopen as Pending
                              </Button>
                            </>
                          )}
                          {b.status === "completed" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, "confirmed")} className="gap-1.5">
                              <RefreshCw className="h-3.5 w-3.5" /> Reopen
                            </Button>
                          )}
                          {!b.workorder_id ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
                              disabled={convertingId === b.id}
                              onClick={() => convertToWorkOrder(b)}
                            >
                              <Wrench className="h-3.5 w-3.5" />
                              {convertingId === b.id ? "Creating…" : "Create Work Order"}
                            </Button>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/40 px-2.5 py-1 text-xs">
                              <CheckCircle2 className="h-3 w-3" /> Work Order Created
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRescheduleDialog({ open: true, bookingId: b.id, date: new Date(b.preferred_date), time: b.preferred_time })}
                            className="gap-1.5"
                          >
                            <CalendarClock className="h-3.5 w-3.5" /> Reschedule
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setNotesDialog({ open: true, bookingId: b.id, notes: b.admin_notes || "" })}
                            className="gap-1.5"
                          >
                            <MessageSquareText className="h-3.5 w-3.5" /> Notes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteBooking(b.id)}
                            className="gap-1.5 border-red-500/40 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                          Submitted {format(new Date(b.created_at), "MMM d, yyyy 'at' h:mm a")}
                          {b.id && <span className="ml-2 text-muted-foreground/50">ID: {b.id.slice(0, 8)}</span>}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Summary Footer ── */}
      {bookings.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-3 sm:p-3 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Showing {filtered.length} of {bookings.length}</span>
              <span>•</span>
              <span>{thisMonthCount} this month</span>
              <span>•</span>
              <span>{completionRate}% completion rate</span>
            </div>
            <span className="text-[10px]">Last updated: {format(new Date(), "h:mm a")}</span>
          </CardContent>
        </Card>
      )}

      {/* Notes Dialog */}
      <Dialog open={notesDialog.open} onOpenChange={open => !open && setNotesDialog(n => ({ ...n, open: false }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" />
              Admin Notes
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Add internal notes about this booking..."
            value={notesDialog.notes}
            onChange={e => setNotesDialog(n => ({ ...n, notes: e.target.value }))}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialog(n => ({ ...n, open: false }))}>Cancel</Button>
            <Button onClick={saveNotes} disabled={saving}>{saving ? "Saving..." : "Save Notes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialog.open} onOpenChange={open => !open && setRescheduleDialog(r => ({ ...r, open: false }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Reschedule Booking
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">New Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left", !rescheduleDialog.date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {rescheduleDialog.date ? format(rescheduleDialog.date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div>
                    <Calendar
                      mode="single"
                      selected={rescheduleDialog.date}
                      onSelect={d => setRescheduleDialog(r => ({ ...r, date: d }))}
                      disabled={d => d < new Date()}
                      className="p-3 pointer-events-auto"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">New Time</label>
              <Select value={rescheduleDialog.time} onValueChange={t => setRescheduleDialog(r => ({ ...r, time: t }))}>
                <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                <SelectContent>
                  {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialog(r => ({ ...r, open: false }))}>Cancel</Button>
            <Button onClick={saveReschedule} disabled={saving}>{saving ? "Saving..." : "Reschedule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Booking Dialog */}
      <Dialog open={newDialog.open} onOpenChange={open => !open && resetNewDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Create New Booking
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Customer Name *</label>
                <Input value={newDialog.customer_name} onChange={e => setNewDialog(n => ({ ...n, customer_name: e.target.value }))} placeholder="Full name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone *</label>
                <Input value={newDialog.customer_phone} onChange={e => setNewDialog(n => ({ ...n, customer_phone: e.target.value }))} placeholder="(555) 555-5555" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input type="email" value={newDialog.customer_email} onChange={e => setNewDialog(n => ({ ...n, customer_email: e.target.value }))} placeholder="customer@example.com" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Service *</label>
                <Input value={newDialog.service_name} onChange={e => setNewDialog(n => ({ ...n, service_name: e.target.value }))} placeholder="e.g. Oil Change, Brake Inspection" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Vehicle Year</label>
                <Input value={newDialog.vehicle_year} onChange={e => setNewDialog(n => ({ ...n, vehicle_year: e.target.value }))} placeholder="2020" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Make</label>
                <Input value={newDialog.vehicle_make} onChange={e => setNewDialog(n => ({ ...n, vehicle_make: e.target.value }))} placeholder="Toyota" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Model</label>
                <Input value={newDialog.vehicle_model} onChange={e => setNewDialog(n => ({ ...n, vehicle_model: e.target.value }))} placeholder="Camry" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Date *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left", !newDialog.date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newDialog.date ? format(newDialog.date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div>
                      <Calendar mode="single" selected={newDialog.date} onSelect={d => setNewDialog(n => ({ ...n, date: d }))} className="p-3 pointer-events-auto" />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Time *</label>
                <Select value={newDialog.time} onValueChange={t => setNewDialog(n => ({ ...n, time: t }))}>
                  <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Status</label>
                <Select value={newDialog.status} onValueChange={s => setNewDialog(n => ({ ...n, status: s }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Notes</label>
                <Textarea value={newDialog.notes} onChange={e => setNewDialog(n => ({ ...n, notes: e.target.value }))} placeholder="Any details about the booking..." rows={3} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetNewDialog}>Cancel</Button>
            <Button onClick={createBooking} disabled={saving} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {saving ? "Creating..." : "Create Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Interactive month calendar: shows a booking count per day and accepts a
// dragged booking onto any day to reschedule it (touch users can still use the
// per-booking Reschedule action). Status mix tints the day's count dot.
function BookingsCalendar({
  month, onMonthChange, selected, onSelect, bookingDates, onDropBooking,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  selected: Date | undefined;
  onSelect: (d: Date) => void;
  bookingDates: Map<string, { count: number; statuses: string[] }>;
  onDropBooking: (bookingId: string, dateStr: string) => void;
}) {
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="rounded-xl border border-border p-2">
      {/* Header */}
      <div className="mb-1 flex items-center justify-between px-1">
        <button type="button" onClick={() => onMonthChange(addMonths(month, -1))} aria-label="Previous month" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">{format(month, "MMMM yyyy")}</span>
        <button type="button" onClick={() => onMonthChange(addMonths(month, 1))} aria-label="Next month" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-0.5">
        {weekdays.map((w) => (
          <div key={w} className="py-1 text-center text-[10px] font-medium text-muted-foreground">{w}</div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const info = bookingDates.get(dateStr);
          const inMonth = isSameMonth(day, month);
          const isSel = selected && isSameDay(day, selected);
          const isDragOver = dragOverKey === dateStr;
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelect(day)}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverKey(dateStr); }}
              onDragLeave={() => setDragOverKey((k) => (k === dateStr ? null : k))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                setDragOverKey(null);
                if (id) onDropBooking(id, dateStr);
              }}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-lg text-xs transition-colors",
                !inMonth && "text-muted-foreground/40",
                inMonth && "text-foreground hover:bg-muted",
                isToday(day) && !isSel && "bg-accent",
                isSel && "bg-primary text-primary-foreground",
                isDragOver && "ring-2 ring-primary ring-offset-1 bg-primary/10",
              )}
            >
              <span className={cn("leading-none", info && "font-bold")}>{format(day, "d")}</span>
              {info && (
                <span className={cn(
                  "mt-0.5 rounded-full px-1 text-[8px] font-bold leading-tight",
                  isSel ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/15 text-primary",
                )}>
                  {info.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
