import { 
  FileText, 
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Plus,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  type: string;
  name: string;
  status: "verified" | "pending" | "expired" | "missing";
  expiryDate?: string;
}

interface TravelDocumentsWidgetProps {
  className?: string;
  documents?: Document[];
  destination?: string;
  onUpload?: (docId: string) => void;
  onView?: (docId: string) => void;
}

const defaultDocuments: Document[] = [
  { id: "1", type: "passport", name: "Passport", status: "verified", expiryDate: "Dec 2028" },
  { id: "2", type: "visa", name: "Tourist Visa", status: "pending" },
  { id: "3", type: "insurance", name: "Travel Insurance", status: "verified", expiryDate: "Jul 2025" },
  { id: "4", type: "vaccination", name: "Vaccination Card", status: "missing" },
];

const statusConfig = {
  verified: { label: "Verified", icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10" },
  pending: { label: "Pending", icon: Clock, color: "text-amber-400 bg-amber-500/10" },
  expired: { label: "Expired", icon: AlertTriangle, color: "text-red-400 bg-red-500/10" },
  missing: { label: "Missing", icon: Plus, color: "text-muted-foreground bg-muted/30" },
};

const TravelDocumentsWidget = ({ 
  className,
  documents = defaultDocuments,
  destination,
  onUpload,
  onView
}: TravelDocumentsWidgetProps) => {
  const verifiedCount = documents.filter(d => d.status === "verified").length;
  const progress = documents.length > 0 ? (verifiedCount / documents.length) * 100 : 0;

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Travel Documents</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {verifiedCount}/{documents.length} Ready
        </Badge>
      </div>

      {destination && (
        <div className="text-xs text-muted-foreground mb-3">
          Required for travel to <span className="text-foreground font-medium">{destination}</span>
        </div>
      )}

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Document readiness</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Document List */}
      <div className="space-y-2 mb-4">
        {documents.map((doc) => {
          const config = statusConfig[doc.status];
          const StatusIcon = config.icon;
          
          return (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/20 transition-all duration-200"
            >
              <div className={cn("p-1.5 rounded-xl", config.color.split(" ")[1])}>
                <StatusIcon className={cn("w-4 h-4", config.color.split(" ")[0])} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{doc.name}</p>
                {doc.expiryDate && (
                  <p className="text-xs text-muted-foreground">Expires: {doc.expiryDate}</p>
                )}
              </div>
              {doc.status === "missing" ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => onUpload?.(doc.id)}
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Add
                </Button>
              ) : doc.status === "verified" ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7"
                  onClick={() => onView?.(doc.id)}
                >
                  <Eye className="w-3 h-3" />
                </Button>
              ) : (
                <Badge className={config.color} variant="secondary">
                  {config.label}
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Security Note */}
      <div className="flex items-start gap-2 p-2 rounded-xl bg-primary/5 text-xs">
        <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          Documents are encrypted and stored securely. Only you can access them.
        </p>
      </div>
    </div>
  );
};

export default TravelDocumentsWidget;
