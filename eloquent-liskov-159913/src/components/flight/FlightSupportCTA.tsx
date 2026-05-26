/**
 * Flight Support CTA
 * Visible support entry point for Flights pages
 * Shows email contact and future live chat placeholder
 */

import { Mail, MessageCircle, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface FlightSupportCTAProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export default function FlightSupportCTA({ className, variant = 'default' }: FlightSupportCTAProps) {
  const isCompact = variant === 'compact';
  
  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200",
      isCompact ? "py-2.5 px-3" : "py-3 px-4",
      className
    )}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="w-4 h-4 text-primary" />
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Need help? </span>
          <a 
            href="mailto:support@hizivo.com" 
            className="font-medium text-primary hover:underline"
          >
            support@hizivo.com
          </a>
        </div>
      </div>
      
      <div className="h-4 w-px bg-border hidden sm:block" />
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="text-muted-foreground hover:text-foreground gap-1.5 cursor-not-allowed opacity-70"
        disabled
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Live Chat</span>
        <Badge variant="outline" className="text-[9px] py-0 px-1.5 ml-1 border-primary/30 text-primary">
          Soon
        </Badge>
      </Button>
      
      <div className="h-4 w-px bg-border hidden sm:block" />
      
      <Link 
        to="/security/scams" 
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Shield className="w-3 h-3" />
        <span className="hidden sm:inline">Beware of scams</span>
      </Link>
    </div>
  );
}
