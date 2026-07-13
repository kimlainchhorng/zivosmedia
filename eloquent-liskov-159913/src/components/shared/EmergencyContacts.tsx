import { Phone, Shield, Heart, AlertTriangle, Globe, Building, Siren } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const emergencyNumbers = [
  { name: "Emergency Services", number: "911", icon: Siren, color: "bg-red-500/20 text-red-400", description: "Police, Fire, Ambulance" },
  { name: "Poison Control", number: "1-800-222-1222", icon: AlertTriangle, color: "bg-yellow-500/20 text-yellow-400", description: "24/7 Hotline" },
  { name: "US Embassy", number: "+1-202-501-4444", icon: Building, color: "bg-blue-500/20 text-blue-400", description: "Overseas Assistance" },
  { name: "Travel Insurance", number: "1-800-555-0199", icon: Shield, color: "bg-green-500/20 text-green-400", description: "Claims & Assistance" },
];

const safetyTips = [
  "Keep digital copies of your passport and ID",
  "Share your itinerary with family/friends",
  "Register with your country's embassy abroad",
  "Know basic phrases in local language",
  "Keep emergency cash in a separate location",
];

const EmergencyContacts = () => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-red-500/20 text-red-400 border-red-500/30">
            <Shield className="w-3 h-3 mr-1" /> Safety First
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Emergency Contacts
          </h2>
          <p className="text-muted-foreground">Important numbers to keep handy</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Emergency Numbers */}
          <div className="space-y-3">
            {emergencyNumbers.map((contact, index) => {
              const Icon = contact.icon;
              return (
                <div 
                  key={index}
                  className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/50 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${contact.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-medium">{contact.name}</h3>
                      <p className="text-xs text-muted-foreground">{contact.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`tel:${contact.number.replace(/-/g, '')}`}>
                      <Phone className="w-4 h-4 mr-1" /> Call
                    </a>
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Safety Tips */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20 p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> Travel Safety Tips
            </h3>
            <div className="space-y-3">
              {safetyTips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-amber-400">{index + 1}</span>
                  </div>
                  <p className="text-sm">{tip}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-amber-500/20">
              <Button variant="outline" className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                <Globe className="w-4 h-4 mr-2" /> Download Offline Guide
              </Button>
            </div>
          </div>
        </div>

        {/* Medical Info Note */}
        <div className="mt-6 p-4 rounded-xl bg-card/60 border border-border/50 flex items-start gap-3">
          <Heart className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Medical Information</p>
            <p className="text-xs text-muted-foreground mt-1">
              Consider wearing a medical ID bracelet if you have allergies or conditions. 
              Carry a list of current medications and your doctor's contact information.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EmergencyContacts;
