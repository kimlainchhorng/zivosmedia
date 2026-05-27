import { Calendar, Sparkles, ArrowRight, Star, ExternalLink, ChefHat, Footprints, Wine, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AFFILIATE_LINKS, AFFILIATE_DISCLOSURE_TEXT, openAffiliateLink } from "@/config/affiliateLinks";

const experiences = [
  {
    title: "Local Cooking Class",
    category: "Culinary",
    duration: "3 hours",
    rating: 4.9,
    price: 89,
    icon: ChefHat,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    title: "City Walking Tour",
    category: "Cultural",
    duration: "4 hours",
    rating: 4.8,
    price: 45,
    icon: Footprints,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  {
    title: "Wine Tasting",
    category: "Food & Drink",
    duration: "2 hours",
    rating: 4.7,
    price: 65,
    icon: Wine,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    title: "Photography Tour",
    category: "Adventure",
    duration: "3 hours",
    rating: 4.9,
    price: 75,
    icon: Camera,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
];

const LocalExperiences = () => {
  const handleBookExperience = () => {
    openAffiliateLink("activities");
  };

  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-secondary text-foreground border-border">
            <Sparkles className="w-3 h-3 mr-1" /> Experiences
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Explore Like a Local
          </h2>
          <p className="text-muted-foreground">
            Unique activities curated by local experts
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {experiences.map((exp) => (
            <div
              key={exp.title}
              onClick={handleBookExperience}
              className="group p-4 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl hover:border-border transition-all cursor-pointer"
            >
              <div className={`w-14 h-14 rounded-2xl ${exp.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <exp.icon className={`w-7 h-7 ${exp.color}`} />
              </div>
              <Badge className="mb-2 text-xs" variant="secondary">{exp.category}</Badge>
              <h3 className="font-bold mb-1">{exp.title}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Calendar className="w-3 h-3" />
                {exp.duration}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-bold">{exp.rating}</span>
                </div>
                <span className="font-bold text-foreground">${exp.price}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button 
            variant="outline" 
            size="lg"
            onClick={handleBookExperience}
            className="gap-2"
          >
            View All Experiences 
            <ExternalLink className="w-4 h-4" />
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            {AFFILIATE_DISCLOSURE_TEXT.short}
          </p>
        </div>
      </div>
    </section>
  );
};

export default LocalExperiences;
