import { useState } from "react";
import { 
  Download, 
  Share2, 
  Mail, 
  Calendar, 
  FileText,
  Copy,
  Check,
  Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ItineraryExporterProps {
  className?: string;
  tripName?: string;
}

const exportOptions = [
  { id: "pdf", icon: FileText, label: "PDF Document", description: "Print-ready format" },
  { id: "calendar", icon: Calendar, label: "Add to Calendar", description: "Google, Apple, Outlook" },
  { id: "email", icon: Mail, label: "Email Itinerary", description: "Send to yourself or others" },
  { id: "mobile", icon: Smartphone, label: "Mobile Wallet", description: "Apple/Google Wallet" },
];

const ItineraryExporter = ({ className, tripName = "Paris Adventure" }: ItineraryExporterProps) => {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = (optionId: string) => {
    setExporting(optionId);
    setTimeout(() => setExporting(null), 1500);
  };

  const handleCopyLink = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Export & Share</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {tripName}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {exportOptions.map((option) => {
          const Icon = option.icon;
          const isExporting = exporting === option.id;
          
          return (
            <button type="button"
              key={option.id}
              onClick={() => handleExport(option.id)}
              disabled={isExporting}
              className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/30 transition-all duration-200 text-left group active:scale-[0.98] touch-manipulation"
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn(
                  "w-4 h-4 transition-colors",
                  isExporting ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span className="text-xs font-medium">
                  {isExporting ? "Exporting..." : option.label}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">{option.description}</p>
            </button>
          );
        })}
      </div>

      {/* Share Link */}
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
        <p className="text-xs text-muted-foreground mb-2">Share trip link</p>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 rounded-xl bg-background/50 text-xs text-muted-foreground truncate">
            zivo.app/trip/paris-2024-abc123
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyLink}
            className="shrink-0"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ItineraryExporter;
