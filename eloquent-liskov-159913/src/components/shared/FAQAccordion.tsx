import { useState } from "react";
import { ChevronDown, HelpCircle, MessageCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

interface FAQAccordionProps {
  faqs: FAQItem[];
  title?: string;
  subtitle?: string;
  accentColor?: string;
}

const FAQAccordion = ({ 
  faqs, 
  title = "Frequently Asked Questions", 
  subtitle = "Find answers to common questions",
  accentColor = "primary"
}: FAQAccordionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(faqs.map((faq) => faq.category))];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getAccentClasses = () => {
    switch (accentColor) {
      case "amber": return { badge: "bg-amber-500/20 text-amber-400 border-amber-500/30", ring: "ring-amber-500/50" };
      case "violet": return { badge: "bg-violet-500/20 text-violet-400 border-violet-500/30", ring: "ring-violet-500/50" };
      case "green": return { badge: "bg-green-500/20 text-green-400 border-green-500/30", ring: "ring-green-500/50" };
      default: return { badge: "bg-primary/20 text-primary border-primary/30", ring: "ring-primary/50" };
    }
  };

  const accent = getAccentClasses();

  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Badge className={`mb-3 ${accent.badge}`}>
            <HelpCircle className="w-3 h-3 mr-1" /> FAQ
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            {title}
          </h2>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions..."
            className={`w-full h-12 pl-12 pr-4 bg-card/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 ${accent.ring}`}
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-3">
          {filteredFaqs.map((faq, index) => (
            <div
              key={index}
              className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden"
            >
              <button type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-[10px]">
                    {faq.category}
                  </Badge>
                  <span className="font-medium">{faq.question}</span>
                </div>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-muted-foreground transition-transform",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              {openIndex === index && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-muted-foreground text-sm leading-relaxed pl-[72px]">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredFaqs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No questions found matching your search.</p>
          </div>
        )}

        {/* Contact Support */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground mb-3">
            Can't find what you're looking for?
          </p>
          <Button variant="outline">
            <MessageCircle className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FAQAccordion;
