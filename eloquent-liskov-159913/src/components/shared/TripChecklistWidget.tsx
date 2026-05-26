import { useState } from "react";
import { 
  CheckSquare, 
  Square, 
  Plus,
  Trash2,
  Plane,
  Hotel,
  Car,
  Briefcase,
  Shirt,
  Pill,
  CreditCard,
  FileText,
  Smartphone,
  Camera
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  category: string;
  icon: typeof Plane;
}

interface TripChecklistWidgetProps {
  destination?: string;
  className?: string;
}

const defaultChecklist: ChecklistItem[] = [
  { id: "1", label: "Book flight tickets", checked: true, category: "bookings", icon: Plane },
  { id: "2", label: "Reserve hotel", checked: true, category: "bookings", icon: Hotel },
  { id: "3", label: "Arrange car rental", checked: false, category: "bookings", icon: Car },
  { id: "4", label: "Pack clothes", checked: false, category: "packing", icon: Shirt },
  { id: "5", label: "Pack toiletries", checked: false, category: "packing", icon: Briefcase },
  { id: "6", label: "Bring medications", checked: false, category: "packing", icon: Pill },
  { id: "7", label: "Passport/ID ready", checked: true, category: "documents", icon: FileText },
  { id: "8", label: "Travel insurance", checked: false, category: "documents", icon: CreditCard },
  { id: "9", label: "Download offline maps", checked: false, category: "tech", icon: Smartphone },
  { id: "10", label: "Charge camera", checked: false, category: "tech", icon: Camera },
];

const categories = [
  { id: "all", label: "All" },
  { id: "bookings", label: "Bookings" },
  { id: "packing", label: "Packing" },
  { id: "documents", label: "Documents" },
  { id: "tech", label: "Tech" },
];

const TripChecklistWidget = ({ destination = "Paris", className }: TripChecklistWidgetProps) => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklist);
  const [activeCategory, setActiveCategory] = useState("all");
  const [newItem, setNewItem] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);

  const toggleItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const deleteItem = (id: string) => {
    setChecklist(prev => prev.filter(item => item.id !== id));
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    
    const item: ChecklistItem = {
      id: Date.now().toString(),
      label: newItem.trim(),
      checked: false,
      category: activeCategory === "all" ? "packing" : activeCategory,
      icon: Briefcase,
    };
    
    setChecklist(prev => [...prev, item]);
    setNewItem("");
    setShowAddInput(false);
  };

  const filteredItems = activeCategory === "all"
    ? checklist
    : checklist.filter(item => item.category === activeCategory);

  const completedCount = checklist.filter(item => item.checked).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <CheckSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Trip Checklist</CardTitle>
              <p className="text-sm text-muted-foreground">
                Getting ready for {destination}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className={cn(
            progressPercent === 100 ? "bg-primary/10 text-primary" : ""
          )}>
            {completedCount}/{totalCount}
          </Badge>
        </div>

        {/* Progress */}
        <div className="mt-3">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {progressPercent === 100 
              ? "All set! You're ready to go!" 
              : `${Math.round(progressPercent)}% complete`
            }
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {/* Category Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
          {categories.map((cat) => (
            <button type="button"
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 active:scale-[0.95] touch-manipulation",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Checklist Items */}
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-xl transition-all duration-200 group",
                item.checked ? "bg-muted/30" : "hover:bg-muted/50"
              )}
            >
              <button type="button"
                onClick={() => toggleItem(item.id)}
                className="shrink-0"
              >
                {item.checked ? (
                  <CheckSquare className="w-5 h-5 text-primary" />
                ) : (
                  <Square className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
              <item.icon className={cn(
                "w-4 h-4 shrink-0",
                item.checked ? "text-muted-foreground" : "text-primary"
              )} />
              <span className={cn(
                "flex-1 text-sm",
                item.checked && "line-through text-muted-foreground"
              )}>
                {item.label}
              </span>
              <button type="button"
                onClick={() => deleteItem(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Item */}
        {showAddInput ? (
          <div className="flex gap-2 mt-3">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add new item..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              autoFocus
            />
            <Button size="sm" onClick={addItem}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddInput(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={() => setShowAddInput(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default TripChecklistWidget;
