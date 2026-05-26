import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Car, UtensilsCrossed, Plane, Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const slides = [
  {
    icon: Car,
    title: "Ride Anywhere Easily",
    description: "Your ride, one tap away",
  },
  {
    icon: UtensilsCrossed,
    title: "Order Food & Delivery Fast",
    description: "Meals and packages delivered",
  },
  {
    icon: Plane,
    title: "Book Flights, Hotels & Rentals",
    description: "Travel the world with ZIVO",
  },
  {
    icon: Gift,
    title: "Earn Rewards & Save Money",
    description: "Credits, cashback, and perks",
  },
] as const;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const finish = useCallback(() => {
    localStorage.setItem("hizovo-onboarding-seen", "1");
    navigate("/setup", { replace: true });
  }, [navigate]);

  const next = useCallback(() => {
    if (current === slides.length - 1) {
      finish();
    } else {
      setDirection(1);
      setCurrent((c) => c + 1);
    }
  }, [current, finish]);

  const isLast = current === slides.length - 1;
  const SlideIcon = slides[current].icon;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-6">
      {/* Skip */}
      <button type="button"
        onClick={finish}
        className="absolute top-6 right-6 text-sm text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        Skip
      </button>

      <div className="w-full max-w-md flex flex-col items-center gap-10 flex-1 justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col items-center text-center gap-8"
          >
            {/* Icon container */}
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center shadow-lg">
              <SlideIcon className="w-14 h-14 text-primary-foreground" />
            </div>

            {/* Text */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-ig-gradient tracking-tight">
                {slides[current].title}
              </h1>
              <p className="text-lg text-muted-foreground">
                {slides[current].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-200 ${
                i === current
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Action button */}
        <Button
          onClick={next}
          className="w-full max-w-xs h-14 text-lg rounded-2xl bg-gradient-to-r from-primary to-emerald-400 hover:opacity-90 text-primary-foreground shadow-lg"
        >
          {isLast ? "Get Started" : "Next"}
          {!isLast && <ArrowRight className="ml-2 w-5 h-5" />}
        </Button>
      </div>
    </div>
  );
}
