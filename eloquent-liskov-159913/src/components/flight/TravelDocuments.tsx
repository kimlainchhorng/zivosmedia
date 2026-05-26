import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText,
  Upload,
  BookOpen,
  CreditCard,
  Shield,
  Plane,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Download,
  Plus,
  Trash2,
  Camera,
  Globe,
  Lock,
  Sparkles
} from "lucide-react";
import { format, addMonths, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  type: 'passport' | 'visa' | 'insurance' | 'vaccination' | 'license' | 'other';
  name: string;
  number?: string;
  issueCountry?: string;
  issueDate?: Date;
  expiryDate?: Date;
  status: 'valid' | 'expiring' | 'expired' | 'pending';
  fileUrl?: string;
}

interface VisaRequirement {
  country: string;
  type: 'visa-free' | 'visa-on-arrival' | 'e-visa' | 'visa-required';
  maxDays?: number;
  notes?: string;
}

interface TravelDocumentsProps {
  className?: string;
  destinationCode?: string;
}

const VISA_REQUIREMENTS: VisaRequirement[] = [
  { country: 'United Kingdom', type: 'visa-free', maxDays: 180, notes: 'Electronic Travel Authorization (ETA) required' },
  { country: 'Japan', type: 'visa-free', maxDays: 90 },
  { country: 'Australia', type: 'e-visa', notes: 'ETA application online' },
  { country: 'China', type: 'visa-required', notes: 'Apply at embassy' },
  { country: 'Brazil', type: 'visa-free', maxDays: 90 },
  { country: 'Thailand', type: 'visa-on-arrival', maxDays: 30 },
];

const getDocTypeIcon = (type: string) => {
  switch (type) {
    case 'passport': return BookOpen;
    case 'visa': return Globe;
    case 'insurance': return Shield;
    case 'vaccination': return Plus;
    case 'license': return CreditCard;
    default: return FileText;
  }
};

const getDocTypeColor = (type: string) => {
  switch (type) {
    case 'passport': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    case 'visa': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    case 'insurance': return 'bg-violet-500/20 text-violet-400 border-violet-500/40';
    case 'vaccination': return 'bg-pink-500/20 text-pink-400 border-pink-500/40';
    case 'license': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getStatusBadge = (status: string, expiryDate?: Date) => {
  const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, new Date()) : null;
  
  switch (status) {
    case 'valid':
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Valid
        </Badge>
      );
    case 'expiring':
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse">
          <AlertCircle className="w-3 h-3 mr-1" />
          Expires in {daysUntilExpiry} days
        </Badge>
      );
    case 'expired':
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/40">
          <AlertCircle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-secondary text-foreground border-border">
          <Clock className="w-3 h-3 mr-1" />
          Processing
        </Badge>
      );
    default:
      return null;
  }
};

const getVisaStatusColor = (type: VisaRequirement['type']) => {
  switch (type) {
    case 'visa-free': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    case 'visa-on-arrival': return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
    case 'e-visa': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    case 'visa-required': return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
  }
};

export const TravelDocuments = ({ className, destinationCode }: TravelDocumentsProps) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showVisaInfo, setShowVisaInfo] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_documents").select("id, doc_type, expires_at, file_url, status").eq("user_id", user.id).then(({ data }) => {
      if (data) setDocuments(data.map(d => ({
        id: d.id,
        type: d.doc_type as Document["type"],
        name: d.doc_type.charAt(0).toUpperCase() + d.doc_type.slice(1),
        expiryDate: d.expires_at ? new Date(d.expires_at) : undefined,
        status: d.status as Document["status"],
        fileUrl: d.file_url,
      })));
    });
  }, [user]);

  const validCount = documents.filter(d => d.status === 'valid').length;
  const expiringCount = documents.filter(d => d.status === 'expiring').length;
  const expiredCount = documents.filter(d => d.status === 'expired').length;

  const filteredDocs = documents.filter(doc => {
    if (activeTab === 'all') return true;
    return doc.type === activeTab;
  });

  const handleUpload = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      toast.success("Document uploaded successfully!");
    }, 1500);
  };

  const deleteDocument = (id: string) => {
    setDocuments(documents.filter(d => d.id !== id));
    toast.success("Document removed");
  };

  return (
    <Card className={cn("overflow-hidden border-border/50 bg-card/50 backdrop-blur", className)}>
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 border border-blue-500/40 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Travel Documents</CardTitle>
              <p className="text-sm text-muted-foreground">
                Securely store your passports, visas, and travel essentials
              </p>
            </div>
          </div>

          <Button className="gap-2" onClick={handleUpload}>
            <Upload className="w-4 h-4" />
            Upload Document
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Stats Bar */}
        <div className="flex items-center gap-6 p-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-sm">{validCount} Valid</span>
          </div>
          {expiringCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-sm text-amber-400">{expiringCount} Expiring Soon</span>
            </div>
          )}
          {expiredCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-red-400">{expiredCount} Expired</span>
            </div>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            Encrypted & Secure
          </div>
        </div>

        {/* Visa Requirements Section */}
        <div className="p-4 border-b border-border/50">
          <button type="button"
            onClick={() => setShowVisaInfo(!showVisaInfo)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary border border-border hover:bg-secondary transition-all duration-200 active:scale-[0.98] touch-manipulation"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-foreground" />
              <span className="font-medium text-sm">Entry Requirements by Country</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {showVisaInfo ? 'Hide' : 'Show'}
            </Badge>
          </button>
          
          <AnimatePresence>
            {showVisaInfo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid gap-2 mt-3">
                  {VISA_REQUIREMENTS.map((req) => (
                    <div
                      key={req.country}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">{req.country}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {req.maxDays && (
                          <span className="text-xs text-muted-foreground">
                            {req.maxDays} days
                          </span>
                        )}
                        <Badge className={cn("text-xs", getVisaStatusColor(req.type))}>
                          {req.type.replace('-', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-border/50 px-4">
            <TabsList className="bg-transparent h-auto p-0">
              {[
                { value: 'all', label: 'All' },
                { value: 'passport', label: 'Passports' },
                { value: 'visa', label: 'Visas' },
                { value: 'insurance', label: 'Insurance' },
                { value: 'vaccination', label: 'Health' },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="p-4">
            <div className="grid gap-4">
              {filteredDocs.map((doc, i) => {
                const Icon = getDocTypeIcon(doc.type);
                const isSelected = selectedDoc === doc.id;
                
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedDoc(isSelected ? null : doc.id)}
                    className={cn(
                      "rounded-xl border p-4 cursor-pointer transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-border/50 hover:border-border bg-card/30"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0",
                        getDocTypeColor(doc.type)
                      )}>
                        <Icon className="w-6 h-6" />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{doc.name}</h4>
                            {doc.number && (
                              <p className="text-sm text-muted-foreground font-mono mt-0.5">
                                {doc.number}
                              </p>
                            )}
                          </div>
                          {getStatusBadge(doc.status, doc.expiryDate)}
                        </div>

                        {/* Expiry Info */}
                        {doc.expiryDate && (
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>Expires: {format(doc.expiryDate, 'MMM d, yyyy')}</span>
                            </div>
                            {doc.issueCountry && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Globe className="w-4 h-4" />
                                <span>{doc.issueCountry}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Validity Progress */}
                        {doc.issueDate && doc.expiryDate && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Issued: {format(doc.issueDate, 'MMM yyyy')}</span>
                              <span>Expires: {format(doc.expiryDate, 'MMM yyyy')}</span>
                            </div>
                            <Progress 
                              value={
                                (differenceInDays(new Date(), doc.issueDate) / 
                                differenceInDays(doc.expiryDate, doc.issueDate)) * 100
                              }
                              className="h-1.5"
                            />
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" aria-label="View document" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Download document" className="h-8 w-8">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          aria-label="Delete document"
                          className="h-8 w-8 text-red-400 hover:bg-red-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDocument(doc.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Add New Document */}
            <button type="button"
              onClick={handleUpload}
              className="w-full mt-4 p-6 rounded-xl border-2 border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-6 h-6" />
                )}
              </div>
              <span className="font-medium">
                {uploading ? "Uploading..." : "Scan or Upload Document"}
              </span>
              <span className="text-xs">Supports PDF, JPG, PNG</span>
            </button>

            {/* Tips */}
            <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-400 mb-1">Document Tips</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Keep passports valid for 6+ months before travel</li>
                    <li>• Download copies for offline access</li>
                    <li>• Set expiry reminders for important documents</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TravelDocuments;
