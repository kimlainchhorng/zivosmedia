import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileCheck, AlertTriangle, CheckCircle, Clock, ExternalLink, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const visaRequirements: Record<string, { status: string; type: string; duration: string; notes: string }> = {
  "US-UK": { status: "visa-free", type: "Visa Waiver", duration: "6 months", notes: "No visa required for tourism" },
  "US-JP": { status: "visa-free", type: "Visa Waiver", duration: "90 days", notes: "Return ticket required" },
  "US-CN": { status: "visa-required", type: "Tourist Visa (L)", duration: "10 years multi-entry", notes: "Apply 4-6 weeks in advance" },
  "US-IN": { status: "e-visa", type: "e-Tourist Visa", duration: "30-180 days", notes: "Apply online 4 days before" },
  "US-BR": { status: "visa-free", type: "Visa Exemption", duration: "90 days", notes: "Valid passport required" },
  "US-AU": { status: "e-visa", type: "ETA", duration: "3 months", notes: "Quick online approval" },
};

const countries = [
  { code: "UK", name: "United Kingdom" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "AU", name: "Australia" },
];

export default function FlightVisaChecker() {
  const [passport, setPassport] = useState("US");
  const [destination, setDestination] = useState("");

  const requirement = destination ? visaRequirements[`${passport}-${destination}`] : null;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Visa Requirements</CardTitle>
            <p className="text-sm text-muted-foreground">Check entry requirements</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Your Passport</label>
            <Select value={passport} onValueChange={setPassport}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">US · United States</SelectItem>
                <SelectItem value="UK">GB · United Kingdom</SelectItem>
                <SelectItem value="CA">CA · Canada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Destination</label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.code} · {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {requirement && (
          <div
            className={cn(
              "p-4 rounded-xl border",
              requirement.status === "visa-free" && "bg-emerald-500/10 border-emerald-500/30",
              requirement.status === "e-visa" && "bg-blue-500/10 border-blue-500/30",
              requirement.status === "visa-required" && "bg-amber-500/10 border-amber-500/30"
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              {requirement.status === "visa-free" && (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              )}
              {requirement.status === "e-visa" && (
                <Globe className="w-5 h-5 text-blue-400" />
              )}
              {requirement.status === "visa-required" && (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
              <span className="font-medium">
                {requirement.status === "visa-free" && "No Visa Required"}
                {requirement.status === "e-visa" && "E-Visa Available"}
                {requirement.status === "visa-required" && "Visa Required"}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "ml-auto",
                  requirement.status === "visa-free" && "text-emerald-400 border-emerald-500/30",
                  requirement.status === "e-visa" && "text-blue-400 border-blue-500/30",
                  requirement.status === "visa-required" && "text-amber-400 border-amber-500/30"
                )}
              >
                {requirement.type}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Stay Duration:</span>
                <span className="font-medium">{requirement.duration}</span>
              </div>
              <p className="text-muted-foreground">{requirement.notes}</p>
            </div>

            {requirement.status !== "visa-free" && (
              <Button size="sm" className="w-full mt-3 gap-2">
                <ExternalLink className="w-4 h-4" />
                Apply for Visa
              </Button>
            )}
          </div>
        )}

        {!destination && (
          <div className="text-center py-6 text-muted-foreground">
            <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a destination to check visa requirements</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
