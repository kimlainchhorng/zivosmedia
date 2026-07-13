import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

interface FAQSectionProps {
  title?: string;
  subtitle?: string;
  faqs: FAQItem[];
  variant?: "default" | "flight" | "hotel" | "car";
}

const variantColors = {
  default: {
    badge: "bg-primary/10 text-primary border-primary/20",
    active: "border-primary/30 bg-primary/5",
  },
  flight: {
    badge: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    active: "border-sky-500/30 bg-sky-500/5",
  },
  hotel: {
    badge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    active: "border-amber-500/30 bg-amber-500/5",
  },
  car: {
    badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    active: "border-emerald-500/30 bg-emerald-500/5",
  },
};

const FAQSection = ({ 
  title = "Frequently Asked Questions",
  subtitle = "Find answers to common questions",
  faqs,
  variant = "default"
}: FAQSectionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchTerm, setSearchTerm] = useState("");
  
  const colors = variantColors[variant];

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Badge className={cn("mb-3", colors.badge)}>
            <HelpCircle className="w-3 h-3 mr-1" /> FAQ
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            {title}
          </h2>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card/50 border-border/50"
          />
        </div>

        {/* FAQ Items */}
        <div className="space-y-3">
          {filteredFAQs.map((faq, index) => (
            <div
              key={index}
              className={cn(
                "rounded-2xl border transition-all duration-200",
                openIndex === index
                  ? colors.active
                  : "border-border/50 bg-card/50 hover:border-primary/20"
              )}
            >
              <button type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {faq.category}
                  </Badge>
                  <span className="font-semibold text-foreground">
                    {faq.question}
                  </span>
                </div>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
              </button>
              
              {openIndex === index && (
                <div className="px-5 pb-5 pt-0 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-muted-foreground text-sm leading-relaxed pl-[52px]">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredFAQs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No matching questions found</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default FAQSection;
