/**
 * RideDriverComm — Enhanced driver communication: messaging, voice notes, pre-ride instructions, translation
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquare, Mic, Globe, Send, Phone, MapPin, Clock, CheckCheck, Languages, Volume2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const quickReplies = [
  "I'm on my way",
  "Please wait, coming in 2 min",
  "I'm at the pickup point",
  "Can you meet me at the entrance?",
  "Running late, 5 more minutes",
];

type ChatMessage = { id: string; sender: string; text: string; translated?: string; time: string; read: boolean };

const TRANSLATION_MAP: Record<string, Record<string, string>> = {
  "I'm on my way":       { es: "Estoy en camino", fr: "Je suis en route", zh: "我在路上", ar: "أنا في الطريق" },
  "Please wait":         { es: "Por favor espera", fr: "Veuillez patienter", zh: "请等一下", ar: "من فضلك انتظر" },
  "I'm at the pickup":   { es: "Estoy en el punto", fr: "Je suis au point", zh: "我在接送点", ar: "أنا عند نقطة الالتقاء" },
};

const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "zh", name: "中文" },
  { code: "ar", name: "العربية" },
];

export default function RideDriverComm() {
  const navigate = useNavigate();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [showLangs, setShowLangs] = useState(false);
  const [instructions, setInstructions] = useState([
    { icon: MapPin, text: "Meet at main lobby entrance", active: true },
    { icon: Clock, text: "I have luggage, may need extra time", active: false },
  ]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: "user", text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), read: false },
    ]);
    setInputText("");
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      toast.success("Voice note sent");
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: "user", text: "🎤 Voice note (0:04)", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), read: false },
      ]);
    } else {
      setIsRecording(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Driver info bar */}
      <Card className="border-primary/20">
        <CardContent className="pt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">D</div>
            <div>
              <p className="text-sm font-bold text-foreground">Your Driver</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" /> En route
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("/rides/hub")}>
            <Phone className="w-3.5 h-3.5" /> Call
          </Button>
        </CardContent>
      </Card>

      {/* Chat */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> Chat
          </CardTitle>
          <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs" onClick={() => setShowLangs(!showLangs)}>
            <Globe className="w-3.5 h-3.5" /> {languages.find((l) => l.code === selectedLang)?.name}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Language selector */}
          {showLangs && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex flex-wrap gap-1.5">
              {languages.map((lang) => (
                <Badge
                  key={lang.code}
                  variant={selectedLang === lang.code ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedLang(lang.code);
                    setAutoTranslate(lang.code !== "en");
                    setShowLangs(false);
                    if (lang.code !== "en") toast.info(`Auto-translating to ${lang.name}`);
                  }}
                >
                  {lang.name}
                </Badge>
              ))}
            </motion.div>
          )}

          {/* Messages */}
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  <p>{msg.text}</p>
                  <div className={`flex items-center gap-1 mt-0.5 text-[10px] ${msg.sender === "user" ? "text-primary-foreground/60 justify-end" : "text-muted-foreground"}`}>
                    {msg.time}
                    {msg.sender === "user" && msg.read && <CheckCheck className="w-3 h-3" />}
                  </div>
                  {autoTranslate && msg.sender === "driver" && (
                    <button type="button"
                      className="flex items-center gap-1 mt-1 text-[10px] text-primary underline"
                      onClick={() => {
                        const key = Object.keys(TRANSLATION_MAP).find((k) => msg.text.includes(k));
                        const translated = key && TRANSLATION_MAP[key][selectedLang];
                        if (translated) {
                          setChatMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, translated } : m));
                        } else {
                          const url = `https://translate.google.com/?sl=auto&tl=${selectedLang}&text=${encodeURIComponent(msg.text)}&op=translate`;
                          window.open(url, "_blank", "noopener");
                        }
                      }}
                    >
                      <Languages className="w-3 h-3" /> {msg.translated ? "Translated" : "Translate"}
                    </button>
                  )}
                  {(msg as ChatMessage).translated && (
                    <p className="mt-1 text-[11px] italic opacity-80">{(msg as ChatMessage).translated}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick replies */}
          <div className="flex overflow-x-auto gap-1.5 scrollbar-none pb-1">
            {quickReplies.map((reply) => (
              <Button key={reply} size="sm" variant="outline" className="text-xs whitespace-nowrap shrink-0 h-7" onClick={() => sendMessage(reply)}>
                {reply}
              </Button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isRecording ? "destructive" : "outline"}
              className="shrink-0 w-9 h-9 p-0"
              onClick={toggleRecording}
            >
              {isRecording ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Input
              placeholder="Type a message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(inputText)}
              className="h-9 text-sm"
            />
            <Button size="sm" className="shrink-0 w-9 h-9 p-0" onClick={() => sendMessage(inputText)} disabled={!inputText.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pre-ride instructions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pre-Ride Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {instructions.map((instr, i) => (
            <button type="button"
              key={i}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm text-left transition-colors ${
                instr.active ? "bg-primary/10 border-primary/30 text-foreground" : "bg-muted/20 border-border/50 text-muted-foreground"
              }`}
              onClick={() => {
                setInstructions((prev) => prev.map((it, idx) => idx === i ? { ...it, active: !it.active } : it));
                if (!instr.active) toast.success(`Instruction sent: "${instr.text}"`);
              }}
            >
              <instr.icon className="w-4 h-4 shrink-0" />
              {instr.text}
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
