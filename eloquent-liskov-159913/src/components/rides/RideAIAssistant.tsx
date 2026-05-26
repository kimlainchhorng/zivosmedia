/**
 * RideAIAssistant — Voice booking, smart suggestions, predictive destinations, NLP commands
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Sparkles, MapPin, Clock, Zap, MessageSquare, Navigation, TrendingUp, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const predictions = [
  { id: "1", place: "Office — 123 Business Ave", confidence: 94, time: "8:15 AM usual", icon: "🏢" },
  { id: "2", place: "Gym — FitLife Center", confidence: 78, time: "6 PM Tuesdays", icon: "💪" },
  { id: "3", place: "Home — 456 Oak Street", confidence: 88, time: "5:30 PM usual", icon: "🏠" },
];

const smartSuggestions = [
  { text: "Your usual morning commute leaves in 12 min", action: "Book now", type: "timing" },
  { text: "Surge dropping in 8 min near you", action: "Set alert", type: "price" },
  { text: "Share ride with Alex? Same route detected", action: "Invite", type: "social" },
];

const exampleCommands = [
  "Book a ride to the airport",
  "Schedule pickup at 3pm tomorrow",
  "Find cheapest ride to downtown",
  "Split fare with Sarah",
];

export default function RideAIAssistant() {
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [command, setCommand] = useState("");
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);

  const toggleVoice = () => {
    if (listening) {
      setListening(false);
      setTranscript("Book me a ride to the airport for 3pm");
      setProcessing(true);
      setTimeout(() => {
        setProcessing(false);
        toast.success("Found 4 rides to JFK Airport at 3:00 PM");
      }, 1500);
    } else {
      setListening(true);
      setTranscript("");
    }
  };

  const handleCommand = () => {
    if (!command.trim()) return;
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      toast.success("Processing: " + command);
      setCommand("");
    }, 1000);
  };

  return (
    <div className="space-y-4">
      {/* Voice Input */}
      <Card className="overflow-hidden">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleVoice}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              listening
                ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30"
                : "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
            }`}
          >
            {listening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </motion.button>

          {listening && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [1, 2, 1] }}
                  transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                  className="w-1 h-4 bg-destructive rounded-full"
                />
              ))}
              <span className="text-sm text-muted-foreground ml-2">Listening...</span>
            </motion.div>
          )}

          {transcript && (
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">"{transcript}"</p>
              {processing && <Badge variant="secondary" className="text-xs"><Sparkles className="w-3 h-3 mr-1" /> Processing...</Badge>}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {listening ? "Tap to stop" : "Tap to speak a command"}
          </p>
        </CardContent>
      </Card>

      {/* Text Command */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Type a command..."
              onKeyDown={(e) => e.key === "Enter" && handleCommand()}
              className="text-sm"
            />
            <Button size="sm" onClick={handleCommand} disabled={!command.trim()}>
              <Zap className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {exampleCommands.map((cmd) => (
              <button type="button"
                key={cmd}
                onClick={() => { setCommand(cmd); toast.info("Try pressing Enter!"); }}
                className="text-[10px] px-2 py-1 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
              >
                {cmd}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Smart Suggestions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" /> Smart Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {smartSuggestions.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs">{s.text}</span>
              </div>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary" onClick={() => {
                if (s.type === "timing") navigate("/rides/hub");
                else if (s.type === "price") {
                  try { localStorage.setItem("zivo_surge_alert", JSON.stringify({ set: true, ts: Date.now() })); } catch {}
                  toast.success("Surge alert set — we'll notify you!");
                } else if (s.type === "social") navigate("/chat");
              }}>
                {s.action}
              </Button>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Predictive Destinations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Predicted Destinations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {predictions.map((p) => (
            <button type="button"
              key={p.id}
              onClick={() => navigate("/rides/hub", { state: { initialDestinationAddress: p.place.split("—")[0].trim() } })}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{p.icon}</span>
                <div>
                  <span className="text-sm font-medium">{p.place}</span>
                  <p className="text-[10px] text-muted-foreground">{p.time}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">{p.confidence}%</Badge>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
