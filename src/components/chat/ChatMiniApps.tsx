/**
 * ChatMiniApps — In-chat polls, shared to-do lists, and split bills
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import X from "lucide-react/dist/esm/icons/x";
import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import ListTodo from "lucide-react/dist/esm/icons/list-todo";
import Receipt from "lucide-react/dist/esm/icons/receipt";
import Utensils from "lucide-react/dist/esm/icons/utensils";
import Map from "lucide-react/dist/esm/icons/map";
import Plus from "lucide-react/dist/esm/icons/plus";
import Check from "lucide-react/dist/esm/icons/check";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Vote from "lucide-react/dist/esm/icons/vote";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ChatMiniAppsProps {
  open: boolean;
  onClose: () => void;
  chatPartnerId: string;
  chatPartnerName: string;
  initialView?: MiniApp;
  onItemCreated?: (text: string, type: string) => void;
}

type MiniApp = "menu" | "poll" | "todo" | "split" | "book_table" | "trip_idea";

interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, string>;
  is_closed: boolean;
  creator_id: string;
}

interface TodoItem {
  text: string;
  done: boolean;
}

interface Todo {
  id: string;
  title: string;
  items: TodoItem[];
  creator_id: string;
}

interface SplitBill {
  id: string;
  title: string;
  total_amount: number;
  splits: { userId: string; name: string; amount: number; paid: boolean }[];
  status: string;
  creator_id: string;
}

type PollRow = {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, string>;
  is_closed: boolean;
  creator_id: string;
};

type TodoRow = {
  id: string;
  title: string;
  items: TodoItem[];
  creator_id: string;
};

type SplitRow = {
  id: string;
  title: string;
  total_amount: number;
  splits: { userId: string; name: string; amount: number; paid: boolean }[];
  status: string;
  creator_id: string;
};

const dbFrom = (table: string): any => (supabase as any).from(table);

export default function ChatMiniApps({ open, onClose, chatPartnerId, chatPartnerName, initialView = "menu", onItemCreated }: ChatMiniAppsProps) {
  const { user } = useAuth();
  const [view, setView] = useState<MiniApp>(initialView);

  useEffect(() => {
    if (open && initialView) setView(initialView);
  }, [open, initialView]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [bills, setBills] = useState<SplitBill[]>([]);

  // Create states
  const [newPollQ, setNewPollQ] = useState("");
  const [newPollOpts, setNewPollOpts] = useState(["", ""]);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoItems, setNewTodoItems] = useState([""]);
  const [newBillTitle, setNewBillTitle] = useState("");
  const [newBillAmount, setNewBillAmount] = useState("");
  const [newBookingTitle, setNewBookingTitle] = useState("");
  const [newBookingDate, setNewBookingDate] = useState("");
  const [newTripTitle, setNewTripTitle] = useState("");
  const [newTripDest, setNewTripDest] = useState("");

  useEffect(() => {
    if (!open || !user?.id) return;
    const loadAll = async () => {
      const [pollsRes, todosRes, billsRes] = await Promise.all([
        dbFrom("chat_polls").select("*").or(`creator_id.eq.${user.id},chat_partner_id.eq.${user.id}`).eq("chat_partner_id", chatPartnerId).order("created_at", { ascending: false }),
        dbFrom("chat_todos").select("*").or(`creator_id.eq.${user.id},chat_partner_id.eq.${user.id}`).eq("chat_partner_id", chatPartnerId).order("created_at", { ascending: false }),
        dbFrom("chat_split_bills").select("*").or(`creator_id.eq.${user.id},chat_partner_id.eq.${user.id}`).eq("chat_partner_id", chatPartnerId).order("created_at", { ascending: false }),
      ]);
      if (pollsRes.data) setPolls(pollsRes.data as PollRow[]);
      if (todosRes.data) setTodos(todosRes.data as TodoRow[]);
      if (billsRes.data) setBills(billsRes.data as SplitRow[]);
    };
    loadAll();
  }, [open, user?.id, chatPartnerId]);

  const createPoll = async () => {
    if (!newPollQ.trim() || newPollOpts.filter(o => o.trim()).length < 2) {
      toast.error("Need a question and at least 2 options");
      return;
    }
    const { error } = await dbFrom("chat_polls").insert({
      creator_id: user!.id,
      chat_partner_id: chatPartnerId,
      question: newPollQ.trim(),
      options: newPollOpts.filter(o => o.trim()),
      votes: {},
    });
    if (error) { toast.error("Failed to create poll"); return; }
    toast.success("Poll created!");
    onItemCreated?.(`📊 Poll: ${newPollQ.trim()}`, "poll");
    setNewPollQ("");
    setNewPollOpts(["", ""]);
    setView("menu");
    // Reload
    const { data } = await dbFrom("chat_polls").select("*").eq("chat_partner_id", chatPartnerId).order("created_at", { ascending: false });
    if (data) setPolls(data as PollRow[]);
  };

  const votePoll = async (pollId: string, option: string) => {
    const poll = polls.find(p => p.id === pollId);
    if (!poll || poll.is_closed) return;
    const newVotes = { ...poll.votes, [user!.id]: option };
    await dbFrom("chat_polls").update({ votes: newVotes }).eq("id", pollId);
    setPolls(prev => prev.map(p => p.id === pollId ? { ...p, votes: newVotes } : p));
  };

  const createTodo = async () => {
    if (!newTodoTitle.trim()) { toast.error("Need a title"); return; }
    const items = newTodoItems.filter(i => i.trim()).map(text => ({ text: text.trim(), done: false }));
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    await dbFrom("chat_todos").insert({
      creator_id: user!.id,
      chat_partner_id: chatPartnerId,
      title: newTodoTitle.trim(),
      items,
    });
    toast.success("To-do list created!");
    onItemCreated?.(`📝 To-Do List: ${newTodoTitle.trim()}`, "todo");
    setNewTodoTitle("");
    setNewTodoItems([""]);
    setView("menu");
    const { data } = await dbFrom("chat_todos").select("*").eq("chat_partner_id", chatPartnerId).order("created_at", { ascending: false });
    if (data) setTodos(data as TodoRow[]);
  };

  const toggleTodoItem = async (todoId: string, idx: number) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    const newItems = [...todo.items];
    newItems[idx] = { ...newItems[idx], done: !newItems[idx].done };
    await dbFrom("chat_todos").update({ items: newItems, updated_at: new Date().toISOString() }).eq("id", todoId);
    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, items: newItems } : t));
  };

  const createSplitBill = async () => {
    if (!newBillTitle.trim() || !newBillAmount) { toast.error("Need title and amount"); return; }
    const total = parseFloat(newBillAmount);
    if (isNaN(total) || total <= 0) { toast.error("Invalid amount"); return; }
    const half = Math.round(total * 100 / 2) / 100;
    await dbFrom("chat_split_bills").insert({
      creator_id: user!.id,
      chat_partner_id: chatPartnerId,
      title: newBillTitle.trim(),
      total_amount: total,
      splits: [
        { userId: user!.id, name: "You", amount: half, paid: false },
        { userId: chatPartnerId, name: chatPartnerName, amount: total - half, paid: false },
      ],
    });
    toast.success("Bill split created!");
    onItemCreated?.(`💸 Split Bill: ${newBillTitle.trim()} ($${total.toFixed(2)})`, "split_bill");
    setNewBillTitle("");
    setNewBillAmount("");
    setView("menu");
    const { data } = await dbFrom("chat_split_bills").select("*").eq("chat_partner_id", chatPartnerId).order("created_at", { ascending: false });
    if (data) setBills(data as SplitRow[]);
  };

  const createBooking = async () => {
    if (!newBookingTitle.trim() || !newBookingDate) {
      toast.error("Need restaurant and date/time");
      return;
    }
    onItemCreated?.(`🍽️ Table Booking: ${newBookingTitle.trim()} @ ${newBookingDate}`, "book_table");
    toast.success("Table suggestion sent!");
    setNewBookingTitle("");
    setNewBookingDate("");
    setView("menu");
  };

  const createTrip = async () => {
    if (!newTripTitle.trim() || !newTripDest.trim()) {
      toast.error("Need trip title and destination");
      return;
    }
    onItemCreated?.(`✈️ Trip Idea: ${newTripTitle.trim()} to ${newTripDest.trim()}`, "trip_idea");
    toast.success("Trip idea sent!");
    setNewTripTitle("");
    setNewTripDest("");
    setView("menu");
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-end justify-center px-2 sm:px-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/45 backdrop-blur-md" />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="zivo-chat-popover-glass relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-[1.75rem] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="zivo-chat-header-glass sticky top-0 z-10 px-5 pt-5 pb-4 pt-safe">
            <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-foreground/20" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {view !== "menu" && (
                  <button type="button" onClick={() => setView("menu")} className="zivo-chat-icon-button flex h-9 w-9 items-center justify-center" aria-label="Back to mini apps">
                    <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
                  </button>
                )}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Chat tools</p>
                  <h3 className="text-lg font-black text-foreground">
                    {view === "menu" ? "Mini Apps" : view === "poll" ? "Polls" : view === "todo" ? "To-Do Lists" : view === "split" ? "Split Bills" : view === "book_table" ? "Book Table" : "Trip Idea"}
                  </h3>
                </div>
              </div>
              <button type="button" onClick={onClose} className="zivo-chat-icon-button flex h-9 w-9 items-center justify-center" aria-label="Close mini apps">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="p-5">
            {view === "menu" && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "poll" as MiniApp, icon: BarChart3, label: "Poll", count: polls.length, color: "bg-blue-500" },
                  { id: "todo" as MiniApp, icon: ListTodo, label: "To-Do", count: todos.length, color: "bg-emerald-500" },
                  { id: "split" as MiniApp, icon: Receipt, label: "Split Bill", count: bills.length, color: "bg-amber-500" },
                  { id: "book_table" as MiniApp, icon: Utensils, label: "Book Table", count: 0, color: "bg-orange-500" },
                  { id: "trip_idea" as MiniApp, icon: Map, label: "Trip Idea", count: 0, color: "bg-indigo-500" },
                ].map((app) => (
                  <button type="button"
                    key={app.id}
                    onClick={() => setView(app.id)}
                    className="group relative flex min-h-[122px] flex-col items-center justify-center gap-2 rounded-3xl border border-white/10 bg-background/45 px-2 py-5 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-muted/20 hover:shadow-lg"
                  >
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${app.color} shadow-lg transition-transform group-hover:scale-105`}>
                      <app.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-center text-xs font-black text-foreground">{app.label}</span>
                    {app.count > 0 && (
                      <span className="absolute right-2 top-2 flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-primary-foreground shadow-lg">
                        {app.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* POLL VIEW */}
            {view === "poll" && (
              <div className="space-y-4">
                {/* Create new poll */}
                <div className="zivo-chat-card space-y-3 p-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Create a Poll</h4>
                  <input
                    placeholder="Ask a question..."
                    value={newPollQ}
                    onChange={(e) => setNewPollQ(e.target.value)}
                    className="zivo-chat-search h-10 w-full px-3 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  {newPollOpts.map((opt, i) => (
                    <input
                      key={i}
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const n = [...newPollOpts];
                        n[i] = e.target.value;
                        setNewPollOpts(n);
                      }}
                      className="zivo-chat-search h-9 w-full px-3 text-sm text-foreground placeholder:text-muted-foreground"
                    />
                  ))}
                  <div className="flex gap-2">
                    {newPollOpts.length < 6 && (
                      <button type="button" onClick={() => setNewPollOpts([...newPollOpts, ""])} className="zivo-chat-chip flex items-center gap-1 px-3 py-2 text-xs font-black text-primary">
                        <Plus className="w-3 h-3" /> Add option
                      </button>
                    )}
                  </div>
                  <button type="button" onClick={createPoll} className="zivo-chat-chip-active h-10 w-full justify-center text-sm font-black">
                    Create Poll
                  </button>
                </div>

                {/* Existing polls */}
                {polls.map((poll) => {
                  const totalVotes = Object.keys(poll.votes).length;
                  const myVote = poll.votes[user!.id];
                  return (
                    <div key={poll.id} className="zivo-chat-card space-y-2 p-4">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-black text-foreground">{poll.question}</p>
                        {poll.is_closed && <span className="zivo-chat-chip px-2 py-0.5 text-[9px] font-black text-muted-foreground">Closed</span>}
                      </div>
                      {(poll.options as string[]).map((opt) => {
                        const voteCount = Object.values(poll.votes).filter(v => v === opt).length;
                        const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                        const isMyVote = myVote === opt;
                        return (
                          <button type="button"
                            key={opt}
                            onClick={() => votePoll(poll.id, opt)}
                            disabled={poll.is_closed}
                            className={`relative w-full overflow-hidden rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                              isMyVote ? "border-primary/50 bg-primary/10" : "border-border/30 bg-background/35"
                            }`}
                          >
                            <div className="absolute inset-y-0 left-0 bg-primary/10 transition-all" style={{ width: `${pct}%` }} />
                            <div className="relative flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                {isMyVote && <Check className="w-3 h-3 text-primary" />}
                                {opt}
                              </span>
                              <span className="text-[10px] font-black text-muted-foreground">{pct}%</span>
                            </div>
                          </button>
                        );
                      })}
                      <p className="text-[10px] font-semibold text-muted-foreground">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* To-Do view */}
            {view === "todo" && (
              <div className="space-y-4">
                <div className="zivo-chat-card space-y-3 p-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Create a To-Do List</h4>
                  <input
                    placeholder="List title..."
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    className="zivo-chat-search h-10 w-full px-3 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  {newTodoItems.map((item, i) => (
                    <input
                      key={i}
                      placeholder={`Item ${i + 1}`}
                      value={item}
                      onChange={(e) => {
                        const n = [...newTodoItems];
                        n[i] = e.target.value;
                        setNewTodoItems(n);
                      }}
                      className="zivo-chat-search h-9 w-full px-3 text-sm text-foreground placeholder:text-muted-foreground"
                    />
                  ))}
                  <button type="button" onClick={() => setNewTodoItems([...newTodoItems, ""])} className="zivo-chat-chip flex items-center gap-1 px-3 py-2 text-xs font-black text-primary">
                    <Plus className="w-3 h-3" /> Add item
                  </button>
                  <button type="button" onClick={createTodo} className="zivo-chat-chip-active h-10 w-full justify-center text-sm font-black">
                    Create List
                  </button>
                </div>

                {todos.map((todo) => (
                  <div key={todo.id} className="zivo-chat-card space-y-2 p-4">
                    <h4 className="text-sm font-black text-foreground">{todo.title}</h4>
                    {(todo.items as TodoItem[]).map((item, i) => (
                      <button type="button"
                        key={i}
                        onClick={() => toggleTodoItem(todo.id, i)}
                        className="flex w-full items-center gap-2.5 rounded-2xl px-2 py-2 text-left hover:bg-muted/20"
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                          item.done ? "bg-primary border-primary" : "border-border"
                        }`}>
                          {item.done && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className={`text-sm font-semibold ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {item.text}
                        </span>
                      </button>
                    ))}
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      {(todo.items as TodoItem[]).filter(i => i.done).length}/{(todo.items as TodoItem[]).length} completed
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* SPLIT BILL VIEW */}
            {view === "split" && (
              <div className="space-y-4">
                <div className="zivo-chat-card space-y-3 p-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Split a Bill</h4>
                  <input
                    placeholder="What's it for?"
                    value={newBillTitle}
                    onChange={(e) => setNewBillTitle(e.target.value)}
                    className="zivo-chat-search h-10 w-full px-3 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={newBillAmount}
                      onChange={(e) => setNewBillAmount(e.target.value)}
                      className="zivo-chat-search h-10 w-full pl-7 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <p className="text-[10px] font-semibold text-muted-foreground">Split evenly between you and {chatPartnerName}</p>
                  <button type="button" onClick={createSplitBill} className="zivo-chat-chip-active h-10 w-full justify-center text-sm font-black">
                    Create Split
                  </button>
                </div>

                {bills.map((bill) => (
                  <div key={bill.id} className="zivo-chat-card space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-foreground">{bill.title}</h4>
                      <span className="text-sm font-black text-primary">${Number(bill.total_amount).toFixed(2)}</span>
                    </div>
                    {bill.splits.map((split, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${split.paid ? "bg-emerald-500" : "bg-amber-500"}`} />
                          <span className="text-xs font-semibold text-foreground">{split.userId === user?.id ? "You" : split.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-foreground">${Number(split.amount).toFixed(2)}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                            split.paid ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                          }`}>
                            {split.paid ? "Paid" : "Pending"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* BOOK TABLE VIEW */}
            {view === "book_table" && (
              <div className="space-y-4">
                <div className="zivo-chat-card space-y-3 p-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Book a Table</h4>
                  <input
                    placeholder="Restaurant name..."
                    value={newBookingTitle}
                    onChange={(e) => setNewBookingTitle(e.target.value)}
                    className="zivo-chat-search h-10 w-full px-3 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <input
                    type="datetime-local"
                    value={newBookingDate}
                    onChange={(e) => setNewBookingDate(e.target.value)}
                    className="zivo-chat-search h-10 w-full px-3 text-sm text-foreground"
                  />
                  <button type="button" onClick={createBooking} className="h-10 w-full rounded-2xl bg-orange-500 text-sm font-black text-white shadow-lg shadow-orange-500/20">
                    Send Suggestion
                  </button>
                </div>
              </div>
            )}

            {/* TRIP IDEA VIEW */}
            {view === "trip_idea" && (
              <div className="space-y-4">
                <div className="zivo-chat-card space-y-3 p-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Plan a Trip</h4>
                  <input
                    placeholder="Trip title (e.g. Summer Vacay)"
                    value={newTripTitle}
                    onChange={(e) => setNewTripTitle(e.target.value)}
                    className="zivo-chat-search h-10 w-full px-3 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <input
                    placeholder="Destination..."
                    value={newTripDest}
                    onChange={(e) => setNewTripDest(e.target.value)}
                    className="zivo-chat-search h-10 w-full px-3 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <button type="button" onClick={createTrip} className="h-10 w-full rounded-2xl bg-indigo-500 text-sm font-black text-white shadow-lg shadow-indigo-500/20">
                    Share Idea
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
