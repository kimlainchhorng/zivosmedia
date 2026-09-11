/** Connection recovery for the offline fallback route. */
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Home,
  Plane,
  Hotel,
  Car,
  UtensilsCrossed,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const Offline = () => {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const { locale } = useI18n();
  const khmer = locale === "km";
  const reducedMotion = useReducedMotion();
  const [checkedOffline, setCheckedOffline] = useState(false);
  const ConnectionIcon = online ? Wifi : WifiOff;

  const handleRetry = () => {
    // Recheck the device signal at click time; do not reload /offline into itself.
    if (navigator.onLine) navigate("/", { replace: true });
    else setCheckedOffline(true);
  };

  const links = [
    { href: "/", icon: Home, label: khmer ? "ទំព័រដើម" : "Home" },
    { href: "/rides/hub", icon: Car, label: khmer ? "ការធ្វើដំណើរ" : "Rides" },
    { href: "/eats", icon: UtensilsCrossed, label: khmer ? "អាហារ" : "Eats" },
    { href: "/flights", icon: Plane, label: khmer ? "ជើងហោះហើរ" : "Flights" },
    { href: "/hotels", icon: Hotel, label: khmer ? "សណ្ឋាគារ" : "Hotels" },
  ];

  return (
    <main
      data-no-auto-translate
      className="min-h-[100dvh] bg-background safe-area-top safe-area-bottom flex flex-col items-center justify-center px-6 py-10 text-center"
    >
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
          <ConnectionIcon
            className="w-10 h-10 text-muted-foreground"
            aria-hidden="true"
          />
        </div>

        <div role="status" aria-live="polite" aria-atomic="true">
          <h1 className="text-2xl font-bold mb-3">
            {online
              ? khmer
                ? "អាចសាកល្បងភ្ជាប់ឡើងវិញ"
                : "Ready to try again"
              : khmer
                ? "អ្នកកំពុងនៅក្រៅបណ្ដាញ"
                : "You're offline"}
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            {online
              ? khmer
                ? "ឧបករណ៍របស់អ្នកបង្ហាញថាមានការតភ្ជាប់។ សូមត្រឡប់ទៅ ZIVO ដើម្បីសាកល្បងផ្ទុកព័ត៌មានថ្មី។"
                : "Your device reports a connection. Return to ZIVO to try loading the latest information."
              : khmer
                ? "សូមពិនិត្យ Wi-Fi ឬទិន្នន័យទូរសព្ទរបស់អ្នក។ ទំព័រនេះនឹងបង្ហាញនៅពេលឧបករណ៍របស់អ្នកភ្ជាប់ឡើងវិញ។"
                : "Check your Wi-Fi or mobile data. This page will update when your device reconnects."}
          </p>
        </div>

        <Button
          onClick={handleRetry}
          className="w-full min-h-12 h-auto whitespace-normal gap-2 rounded-xl py-3"
        >
          {online ? (
            <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <RefreshCw className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
          {online
            ? khmer
              ? "ត្រឡប់ទៅ ZIVO"
              : "Return to ZIVO"
            : khmer
              ? "ពិនិត្យការតភ្ជាប់"
              : "Check connection"}
        </Button>
        <p
          role="status"
          aria-live="polite"
          className="min-h-12 mt-3 mb-4 text-sm leading-relaxed text-muted-foreground"
        >
          {checkedOffline && !online
            ? khmer
              ? "ឧបករណ៍របស់អ្នកនៅតែក្រៅបណ្ដាញ។ សូមភ្ជាប់អ៊ីនធឺណិត រួចសាកល្បងម្តងទៀត។"
              : "Your device is still offline. Reconnect, then try again."
            : ""}
        </p>

        <section
          aria-labelledby="offline-other-pages"
          className="bg-muted/30 border border-border/50 rounded-2xl p-5"
        >
          <h2 id="offline-other-pages" className="text-sm font-semibold mb-2">
            {khmer ? "សាកល្បងទំព័រផ្សេង" : "Try another page"}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground mb-4">
            {khmer
              ? "ព័ត៌មានថ្មី និងសកម្មភាពអនឡាញត្រូវការការតភ្ជាប់។"
              : "Live information and online actions need a connection."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {links.map(({ href, icon: Icon, label }) => (
              <Button
                key={href}
                variant="ghost"
                size="sm"
                className="flex-col min-h-16 h-auto py-3 px-3 rounded-xl"
                onClick={() => navigate(href, { replace: true })}
              >
                <Icon className="w-5 h-5 mb-1" aria-hidden="true" />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
        </section>
      </motion.div>
    </main>
  );
};

export default Offline;
