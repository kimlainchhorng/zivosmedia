import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Star, 
  Quote, 
  ThumbsUp, 
  CheckCircle, 
  MapPin,
  Plane,
  ChevronLeft,
  ChevronRight,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FlightTestimonialsSectionProps {
  className?: string;
}

export default function FlightTestimonialsSection({ className }: FlightTestimonialsSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const testimonials = [
    {
      id: 1,
      name: "Sarah Mitchell",
      role: "Business Traveler",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      location: "New York, USA",
      rating: 5,
      route: "NYC → London",
      airline: "British Airways",
      date: "2 weeks ago",
      review: "ZIVO made booking my business trip incredibly easy. Found a great deal on a direct flight with lounge access included. The price tracking feature saved me over $300!",
      verified: true,
      helpful: 128,
      tier: "Platinum",
    },
    {
      id: 2,
      name: "Marcus Chen",
      role: "Family Vacation",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      location: "San Francisco, USA",
      rating: 5,
      route: "SFO → Tokyo",
      airline: "ANA",
      date: "1 month ago",
      review: "Best flight booking experience ever! The multi-city planner helped us create the perfect Asia trip for our family of 4. Excellent customer support when we needed to change dates.",
      verified: true,
      helpful: 94,
      tier: "Gold",
    },
    {
      id: 3,
      name: "Emma Thompson",
      role: "Solo Adventurer",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      location: "London, UK",
      rating: 5,
      route: "London → Bali",
      airline: "Singapore Airlines",
      date: "3 weeks ago",
      review: "The AI trip suggestions feature is amazing! It recommended destinations I never would have considered. Booked an incredible deal to Bali with all the extras included.",
      verified: true,
      helpful: 156,
      tier: "Silver",
    },
    {
      id: 4,
      name: "James Rodriguez",
      role: "Digital Nomad",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      location: "Miami, USA",
      rating: 5,
      route: "MIA → Dubai",
      airline: "Emirates",
      date: "1 week ago",
      review: "As someone who flies weekly, ZIVO has become my go-to platform. The ZIVO Miles program gives amazing rewards, and the real-time price alerts have saved me thousands!",
      verified: true,
      helpful: 203,
      tier: "Platinum",
    },
  ];

  const stats = [
    { value: "4.9", label: "Average Rating", icon: Star },
    { value: "2.5M+", label: "Happy Customers", icon: ThumbsUp },
    { value: "98%", label: "Would Recommend", icon: CheckCircle },
    { value: "500K+", label: "5-Star Reviews", icon: Award },
  ];

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className={cn("py-16 relative overflow-hidden", className)}>
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-transparent" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-secondary rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 px-4 py-2 text-foreground border-border bg-secondary">
            <Star className="w-4 h-4 mr-2 fill-sky-500" />
            Customer Reviews
          </Badge>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Trusted by Millions of Travelers
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See why travelers worldwide choose ZIVO for their flight bookings
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center p-4 rounded-xl bg-card/50 backdrop-blur-xl border border-border/50 animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex justify-center mb-2">
                <stat.icon className="w-6 h-6 text-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Featured Testimonial */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="relative overflow-hidden border-0 bg-card/80 backdrop-blur-2xl shadow-2xl">
            {/* Gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" />
            
            <CardContent className="p-8 md:p-10">
              {/* Quote Icon */}
              <div className="absolute top-6 right-6 w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                <Quote className="w-8 h-8 text-foreground/50" />
              </div>

              {/* Testimonial Content */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <Avatar className="w-20 h-20 ring-4 ring-sky-500/20">
                    <AvatarImage src={testimonials[activeIndex].avatar} />
                    <AvatarFallback>{testimonials[activeIndex].name[0]}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1">
                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-5 h-5",
                          i < testimonials[activeIndex].rating
                            ? "text-amber-400 fill-amber-400"
                            : "text-muted-foreground"
                        )}
                      />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-lg md:text-xl text-foreground leading-relaxed mb-4">
                    "{testimonials[activeIndex].review}"
                  </p>

                  {/* User Info */}
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-foreground">{testimonials[activeIndex].name}</h4>
                        {testimonials[activeIndex].verified && (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        )}
                        <Badge variant="outline" className="text-xs">
                          {testimonials[activeIndex].tier}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{testimonials[activeIndex].role}</p>
                    </div>
                  </div>

                  {/* Trip Details */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {testimonials[activeIndex].location}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Plane className="w-4 h-4" />
                      {testimonials[activeIndex].route}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>{testimonials[activeIndex].airline}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ThumbsUp className="w-4 h-4" />
                      {testimonials[activeIndex].helpful} found helpful
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous slide"
              onClick={prevSlide}
              className="rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              {testimonials.map((_, index) => (
                <button type="button"
                  key={index}
                  aria-label={`Go to testimonial ${index + 1}`}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all",
                    index === activeIndex
                      ? "bg-sky-500 w-8"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              aria-label="Next slide"
              onClick={nextSlide}
              className="rounded-full"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Mini Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {testimonials.filter((_, i) => i !== activeIndex).slice(0, 3).map((testimonial, index) => (
            <Card
              key={testimonial.id}
              className="cursor-pointer hover:border-border transition-all duration-200 bg-card/50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${(index + 4) * 100}ms` }}
              onClick={() => setActiveIndex(testimonials.findIndex(t => t.id === testimonial.id))}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={testimonial.avatar} />
                    <AvatarFallback>{testimonial.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  "{testimonial.review}"
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
