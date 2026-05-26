import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plane,
  Link2,
  Unlink,
  Search,
  ArrowLeftRight,
  Globe,
  Star,
  Check,
  ChevronRight,
  Plus,
  RefreshCw,
  Coins
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AirlinePartner {
  id: string;
  name: string;
  code: string;
  alliance: 'Star Alliance' | 'oneworld' | 'SkyTeam' | 'Independent';
  logo: string;
  transferRate: number; // Miles you get per 1000 ZIVO miles
  minTransfer: number;
  linked?: boolean;
  memberNumber?: string;
  miles?: number;
}

const AIRLINE_PARTNERS: AirlinePartner[] = [
  { id: '1', name: 'United Airlines', code: 'UA', alliance: 'Star Alliance', logo: 'plane', transferRate: 1000, minTransfer: 5000, linked: true, memberNumber: 'UA123456789', miles: 45000 },
  { id: '2', name: 'Emirates', code: 'EK', alliance: 'Independent', logo: 'plane', transferRate: 800, minTransfer: 10000, linked: true, memberNumber: 'EK987654321', miles: 28000 },
  { id: '3', name: 'Lufthansa', code: 'LH', alliance: 'Star Alliance', logo: 'plane', transferRate: 1000, minTransfer: 5000 },
  { id: '4', name: 'British Airways', code: 'BA', alliance: 'oneworld', logo: 'plane', transferRate: 900, minTransfer: 5000 },
  { id: '5', name: 'Air France', code: 'AF', alliance: 'SkyTeam', logo: 'plane', transferRate: 850, minTransfer: 5000 },
  { id: '6', name: 'Singapore Airlines', code: 'SQ', alliance: 'Star Alliance', logo: 'plane', transferRate: 1100, minTransfer: 10000 },
  { id: '7', name: 'Qantas', code: 'QF', alliance: 'oneworld', logo: 'plane', transferRate: 950, minTransfer: 5000 },
  { id: '8', name: 'Delta Air Lines', code: 'DL', alliance: 'SkyTeam', logo: 'plane', transferRate: 1000, minTransfer: 5000 },
  { id: '9', name: 'Japan Airlines', code: 'JL', alliance: 'oneworld', logo: 'plane', transferRate: 900, minTransfer: 10000 },
  { id: '10', name: 'KLM', code: 'KL', alliance: 'SkyTeam', logo: 'plane', transferRate: 850, minTransfer: 5000 },
];

const ALLIANCES = ['All', 'Star Alliance', 'oneworld', 'SkyTeam', 'Independent'];

interface AirlinePartnersHubProps {
  className?: string;
  zivoMiles?: number;
}

export const AirlinePartnersHub = ({ className, zivoMiles = 45680 }: AirlinePartnersHubProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlliance, setSelectedAlliance] = useState('All');
  const [partners, setPartners] = useState(AIRLINE_PARTNERS);
  const [transferAmount, setTransferAmount] = useState(10000);
  const [selectedPartner, setSelectedPartner] = useState<AirlinePartner | null>(null);

  const linkedPartners = partners.filter(p => p.linked);
  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAlliance = selectedAlliance === 'All' || p.alliance === selectedAlliance;
    return matchesSearch && matchesAlliance;
  });

  const handleLink = (partnerId: string) => {
    setPartners(prev => prev.map(p => 
      p.id === partnerId ? { ...p, linked: true, memberNumber: `${p.code}000000000`, miles: 0 } : p
    ));
  };

  const handleUnlink = (partnerId: string) => {
    setPartners(prev => prev.map(p => 
      p.id === partnerId ? { ...p, linked: false, memberNumber: undefined, miles: undefined } : p
    ));
  };

  return (
    <Card className={cn("overflow-hidden border-border/50 bg-card/50 backdrop-blur", className)}>
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl border border-border flex items-center justify-center bg-secondary">
              <Globe className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">Airline Partners</CardTitle>
              <p className="text-sm text-muted-foreground">
                Link & transfer miles to {AIRLINE_PARTNERS.length}+ airlines
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Coins className="w-3 h-3" />
            {zivoMiles.toLocaleString()} ZIVO Miles
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Linked Accounts Summary */}
        {linkedPartners.length > 0 && (
          <div className="p-4 border-b border-border/50 bg-muted/20">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-emerald-400" />
              Linked Accounts ({linkedPartners.length})
            </h4>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {linkedPartners.map(partner => (
                <motion.div
                  key={partner.id}
                  whileHover={{ scale: 1.02 }}
                  className="flex-shrink-0 p-3 rounded-xl bg-card/50 border border-border/50 min-w-[180px]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary">
                      <Plane className="w-4 h-4 text-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{partner.code}</p>
                      <p className="text-xs text-muted-foreground">{partner.memberNumber}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold">{partner.miles?.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Partner Miles</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="p-4 border-b border-border/50 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search airlines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ALLIANCES.map(alliance => (
              <button type="button"
                key={alliance}
                onClick={() => setSelectedAlliance(alliance)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all",
                  selectedAlliance === alliance
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {alliance}
              </button>
            ))}
          </div>
        </div>

        {/* Partners List */}
        <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
          {filteredPartners.map((partner, i) => (
            <motion.div
              key={partner.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border transition-all",
                partner.linked 
                  ? "bg-emerald-500/5 border-emerald-500/30" 
                  : "bg-muted/30 border-border/50 hover:border-border"
              )}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-secondary">
                <Plane className="w-5 h-5 text-foreground" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{partner.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {partner.code}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">{partner.alliance}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs">
                    <span className="text-primary">{partner.transferRate}</span> miles per 1,000 ZIVO
                  </span>
                </div>
              </div>

              {partner.linked ? (
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="gap-1"
                        onClick={() => setSelectedPartner(partner)}
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                        Transfer
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          Transfer to {partner.name}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                          <div className="flex justify-between mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground">From ZIVO</p>
                              <p className="text-2xl font-bold">{zivoMiles.toLocaleString()}</p>
                            </div>
                            <ArrowLeftRight className="w-6 h-6 text-muted-foreground self-center" />
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">To {partner.code}</p>
                              <p className="text-2xl font-bold">{partner.miles?.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Transfer Amount</label>
                          <Input
                            type="number"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(Number(e.target.value))}
                            min={partner.minTransfer}
                            step={1000}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Minimum: {partner.minTransfer.toLocaleString()} miles
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                          <p className="text-sm">
                            You'll receive <span className="font-bold text-primary">
                              {Math.floor(transferAmount * partner.transferRate / 1000).toLocaleString()}
                            </span> {partner.name} miles
                          </p>
                        </div>

                        <Button className="w-full" size="lg">
                          Confirm Transfer
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    variant="ghost" 
                    size="icon"
                    aria-label="Unlink partner"
                    onClick={() => handleUnlink(partner.id)}
                  >
                    <Unlink className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-1"
                  onClick={() => handleLink(partner.id)}
                >
                  <Plus className="w-4 h-4" />
                  Link
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AirlinePartnersHub;
