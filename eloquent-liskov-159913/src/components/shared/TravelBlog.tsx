import { BookOpen, Clock, ArrowRight, Heart, MessageCircle, Share2, Palmtree, Landmark, Plane, Leaf } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const blogPosts = [
  {
    id: 1,
    title: "10 Hidden Gems in Southeast Asia You Need to Visit",
    excerpt: "Discover off-the-beaten-path destinations that will take your breath away...",
    category: "Destinations",
    readTime: "5 min",
    icon: Palmtree,
    iconColor: "text-teal-500",
    likes: 342,
    comments: 28,
    featured: true
  },
  {
    id: 2,
    title: "The Ultimate Guide to Budget Travel in Europe",
    excerpt: "How to explore Europe without breaking the bank - expert tips and tricks...",
    category: "Tips & Tricks",
    readTime: "8 min",
    icon: Landmark,
    iconColor: "text-amber-500",
    likes: 567,
    comments: 45
  },
  {
    id: 3,
    title: "Best Times to Book Flights for Maximum Savings",
    excerpt: "Data-driven insights on when to book your flights for the lowest prices...",
    category: "Savings",
    readTime: "4 min",
    icon: Plane,
    iconColor: "text-sky-500",
    likes: 891,
    comments: 67
  },
  {
    id: 4,
    title: "Sustainable Travel: Reducing Your Carbon Footprint",
    excerpt: "Simple ways to make your travels more eco-friendly without sacrificing comfort...",
    category: "Eco Travel",
    readTime: "6 min",
    icon: Leaf,
    iconColor: "text-emerald-500",
    likes: 234,
    comments: 19
  },
];

const TravelBlog = () => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Badge className="mb-3 bg-orange-500/20 text-orange-400 border-orange-500/30">
              <BookOpen className="w-3 h-3 mr-1" /> Travel Blog
            </Badge>
            <h2 className="text-2xl md:text-3xl font-display font-bold">
              Travel Inspiration & Tips
            </h2>
          </div>
          <Button variant="outline" className="hidden md:flex">
            View All Articles <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {blogPosts.map((post, index) => (
            <article
              key={post.id}
              className={`group bg-card/60 backdrop-blur-xl rounded-2xl border border-border/50 overflow-hidden hover:border-border transition-all hover:-translate-y-1 ${
                index === 0 ? "md:col-span-2 md:row-span-2" : ""
              }`}
            >
              <div className={`relative ${index === 0 ? "aspect-video" : "aspect-square"} bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center`}>
                <post.icon className={`${index === 0 ? "w-16 h-16" : "w-10 h-10"} ${post.iconColor}`} />
                {post.featured && (
                  <Badge className="absolute top-3 left-3 bg-orange-500 text-primary-foreground border-0">
                    Featured
                  </Badge>
                )}
              </div>

              <div className={`p-5 ${index === 0 ? "md:p-6" : ""}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> {post.readTime}
                  </span>
                </div>

                <h3 className={`font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors ${
                  index === 0 ? "text-xl" : "text-sm"
                }`}>
                  {post.title}
                </h3>

                {index === 0 && (
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Heart className="w-3 h-3" /> {post.likes}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageCircle className="w-3 h-3" /> {post.comments}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Share article">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 text-center md:hidden">
          <Button variant="outline">
            View All Articles <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TravelBlog;
