/**
 * ServiceFlowBanner - Cross-service connection with accent-colored icons
 */
import { motion } from "framer-motion";
import Plane from "lucide-react/dist/esm/icons/plane";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import CarFront from "lucide-react/dist/esm/icons/car-front";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Zap from "lucide-react/dist/esm/icons/zap";
import { Link } from "react-router-dom";

const flowSteps = [
  { icon: Plane, label: "Flights", href: "/flights", colorVar: "--flights" },
  { icon: Hotel, label: "Hotels", href: "/hotels", colorVar: "--hotels" },
  { icon: CarFront, label: "Rentals", href: "/rent-car", colorVar: "--cars" },
  { icon: Car, label: "Rides", href: "/rides/hub", colorVar: "--rides" },
  { icon: UtensilsCrossed, label: "Eats", href: "/eats", colorVar: "--eats" },
];

export default function ServiceFlowBanner() {
  return (
    <section className="section-padding bg-muted/30" aria-label="Connected travel services">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">Connected Experience</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            One trip, <span className="text-primary">all services</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            Book your flight, hotel, rental car, ride, and food — all in one seamless flow.
          </p>
        </motion.div>

        {/* Flow visualization */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap max-w-3xl mx-auto">
          {flowSteps.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-2 sm:gap-4"
            >
              <Link
                to={step.href}
                className="group flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-2xl bg-card/80 border border-border/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 touch-manipulation active:scale-[0.97]"
                style={{ "--step-color": `hsl(var(${step.colorVar}))` } as React.CSSProperties}
              >
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border transition-colors group-hover:scale-110 transition-transform duration-200"
                  style={{
                    backgroundColor: `hsl(var(${step.colorVar}) / 0.1)`,
                    borderColor: `hsl(var(${step.colorVar}) / 0.2)`,
                  }}
                >
                  <step.icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: `hsl(var(${step.colorVar}))` }} />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold">{step.label}</span>
              </Link>
              {i < flowSteps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground/40 hidden sm:block" />
              )}
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
        >
          <Link
            to="/flights"
            className="inline-flex items-center gap-2 px-6 py-3 bg-ig-gradient text-white rounded-xl font-bold hover:opacity-90 hover:shadow-lg hover:shadow-rose-500/25 transition-all active:scale-[0.97] touch-manipulation"
          >
            Start Planning Your Trip
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
