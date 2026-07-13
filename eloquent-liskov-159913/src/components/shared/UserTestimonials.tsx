import { useState } from "react";
import { Quote, Star, ChevronLeft, ChevronRight, Verified, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    id: 1,
    name: "Sarah M.",
    location: "New York, USA",
    avatar: "👩",
    rating: 5,
    service: "Flights",
    date: "2 weeks ago",
    verified: true,
    quote: "ZIVO saved me over $400 on my round-trip to Tokyo! The price alerts feature is incredible - I got notified the moment prices dropped and booked instantly.",
    highlight: "Saved $400"
  },
  {
    id: 2,
    name: "James L.",
    location: "London, UK",
    avatar: "👨",
    rating: 5,
    service: "Hotels",
    date: "1 month ago",
    verified: true,
    quote: "Found a 5-star hotel in Paris for the price of a 3-star. The comparison tools made it so easy to find hidden gems. Will never book anywhere else!",
    highlight: "5-star for 3-star price"
  },
  {
    id: 3,
    name: "Maria G.",
    location: "Sydney, Australia",
    avatar: "👩",
    rating: 5,
    service: "Car Rental",
    date: "3 weeks ago",
    verified: true,
    quote: "Renting a car for our road trip was seamless. The upgrade offer saved us money and we got a much nicer car than expected. Highly recommend!",
    highlight: "Seamless experience"
  },
  {
    id: 4,
    name: "David K.",
    location: "Toronto, Canada",
    avatar: "👨",
    rating: 5,
    service: "Flights",
    date: "1 week ago",
    verified: true,
    quote: "The bundle deals are unbeatable. Booked flights + hotel together and saved 25% compared to booking separately. Customer support was fantastic too.",
    highlight: "25% bundle savings"
  },
];

const UserTestimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextTestimonial = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <Badge className="mb-3 bg-amber-500/20 text-amber-400 border-amber-500/30">
            <Star className="w-3 h-3 mr-1 fill-current" /> Customer Stories
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Loved by Travelers Worldwide
          </h2>
          <p className="text-muted-foreground">Join millions of happy customers</p>
        </div>

        {/* Featured Testimonial */}
        <div className="relative bg-gradient-to-br from-amber-500/10 via-card/60 to-orange-500/10 backdrop-blur-xl rounded-3xl border border-amber-500/20 p-8 md:p-12 mb-8">
          <Quote className="absolute top-6 left-6 w-12 h-12 text-amber-500/20" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-1 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-6 h-6 fill-amber-400 text-amber-400" />
              ))}
            </div>

            <blockquote className="text-lg md:text-xl text-center mb-8 font-medium leading-relaxed">
              "{testimonials[activeIndex].quote}"
            </blockquote>

            <div className="flex flex-col items-center">
              <div className="text-4xl mb-3">{testimonials[activeIndex].avatar}</div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold">{testimonials[activeIndex].name}</p>
                {testimonials[activeIndex].verified && (
                  <Verified className="w-4 h-4 text-foreground" />
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {testimonials[activeIndex].location}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">{testimonials[activeIndex].service}</Badge>
                <span className="text-xs text-muted-foreground">{testimonials[activeIndex].date}</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="absolute top-1/2 -translate-y-1/2 left-2 md:-left-4">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous testimonial"
              className="rounded-full bg-background/80 backdrop-blur-sm"
              onClick={prevTestimonial}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 right-2 md:-right-4">
            <Button
              variant="outline"
              size="icon"
              aria-label="Next testimonial"
              className="rounded-full bg-background/80 backdrop-blur-sm"
              onClick={nextTestimonial}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Highlight Badge */}
          <Badge className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-primary-foreground border-0">
            {testimonials[activeIndex].highlight}
          </Badge>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2">
          {testimonials.map((_, index) => (
            <button type="button"
              key={index}
              aria-label={`Go to testimonial ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === activeIndex
                  ? "w-8 bg-amber-400"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>

        {/* Stats */}
        <div className="mt-10 grid grid-cols-3 gap-4">
          {[
            { value: "4.9", label: "Average Rating" },
            { value: "2M+", label: "Happy Customers" },
            { value: "98%", label: "Would Recommend" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-4 bg-card/60 rounded-xl border border-border/50">
              <p className="text-2xl font-display font-bold text-amber-400">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UserTestimonials;
