import { forwardRef, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { buildPhoneE164, normalizePhoneDigits } from "@/lib/phone";

interface CountryCode {
  code: string;
  dial: string;
  name: string;
  flag: string;
  placeholder: string;
  digits: string;
}

const COUNTRY_CODES: CountryCode[] = [
  // Popular / Priority
  { code: "US", dial: "+1", name: "United States", flag: "/flags/us.svg", placeholder: "201 555 0123", digits: "10 digits" },
  { code: "KH", dial: "+855", name: "Cambodia", flag: "/flags/kh.svg", placeholder: "12 345 678", digits: "8-9 digits" },
  { code: "CN", dial: "+86", name: "China", flag: "/flags/cn.svg", placeholder: "131 2345 6789", digits: "11 digits" },
  { code: "VN", dial: "+84", name: "Vietnam", flag: "/flags/vn.svg", placeholder: "912 345 678", digits: "9-10 digits" },
  { code: "TH", dial: "+66", name: "Thailand", flag: "/flags/th.svg", placeholder: "81 234 5678", digits: "9 digits" },
  { code: "KR", dial: "+82", name: "South Korea", flag: "/flags/kr.svg", placeholder: "10 1234 5678", digits: "10-11 digits" },
  { code: "JP", dial: "+81", name: "Japan", flag: "/flags/jp.svg", placeholder: "90 1234 5678", digits: "10 digits" },
  { code: "IN", dial: "+91", name: "India", flag: "/flags/in.svg", placeholder: "91234 56789", digits: "10 digits" },
  { code: "GB", dial: "+44", name: "United Kingdom", flag: "/flags/gb.svg", placeholder: "7911 123456", digits: "10-11 digits" },
  { code: "AU", dial: "+61", name: "Australia", flag: "/flags/au.svg", placeholder: "412 345 678", digits: "9 digits" },

  // North America
  { code: "CA", dial: "+1", name: "Canada", flag: "/flags/ca.svg", placeholder: "416 555 0123", digits: "10 digits" },
  { code: "MX", dial: "+52", name: "Mexico", flag: "/flags/mx.svg", placeholder: "55 1234 5678", digits: "10 digits" },
  { code: "DO", dial: "+1", name: "Dominican Republic", flag: "/flags/do.svg", placeholder: "809 234 5678", digits: "10 digits" },
  { code: "JM", dial: "+1", name: "Jamaica", flag: "/flags/jm.svg", placeholder: "876 234 5678", digits: "10 digits" },

  // Southeast Asia
  { code: "SG", dial: "+65", name: "Singapore", flag: "/flags/sg.svg", placeholder: "9123 4567", digits: "8 digits" },
  { code: "MY", dial: "+60", name: "Malaysia", flag: "/flags/my.svg", placeholder: "12 345 6789", digits: "9-10 digits" },
  { code: "ID", dial: "+62", name: "Indonesia", flag: "/flags/id.svg", placeholder: "812 3456 7890", digits: "10-12 digits" },
  { code: "PH", dial: "+63", name: "Philippines", flag: "/flags/ph.svg", placeholder: "917 123 4567", digits: "10 digits" },
  { code: "MM", dial: "+95", name: "Myanmar", flag: "/flags/mm.svg", placeholder: "9 123 4567", digits: "7-10 digits" },
  { code: "LA", dial: "+856", name: "Laos", flag: "/flags/la.svg", placeholder: "20 5678 9012", digits: "8-10 digits" },

  // East Asia
  { code: "TW", dial: "+886", name: "Taiwan", flag: "/flags/tw.svg", placeholder: "912 345 678", digits: "9 digits" },
  { code: "HK", dial: "+852", name: "Hong Kong", flag: "/flags/hk.svg", placeholder: "5123 4567", digits: "8 digits" },

  // South Asia
  { code: "PK", dial: "+92", name: "Pakistan", flag: "/flags/pk.svg", placeholder: "301 234 5678", digits: "10 digits" },
  { code: "BD", dial: "+880", name: "Bangladesh", flag: "/flags/bd.svg", placeholder: "1712 345678", digits: "10 digits" },
  { code: "LK", dial: "+94", name: "Sri Lanka", flag: "/flags/lk.svg", placeholder: "71 234 5678", digits: "9 digits" },
  { code: "NP", dial: "+977", name: "Nepal", flag: "/flags/np.svg", placeholder: "984 123 4567", digits: "10 digits" },

  // Europe
  { code: "FR", dial: "+33", name: "France", flag: "/flags/fr.svg", placeholder: "6 12 34 56 78", digits: "9 digits" },
  { code: "DE", dial: "+49", name: "Germany", flag: "/flags/de.svg", placeholder: "151 2345 6789", digits: "10-11 digits" },
  { code: "IT", dial: "+39", name: "Italy", flag: "/flags/it.svg", placeholder: "312 345 6789", digits: "10 digits" },
  { code: "ES", dial: "+34", name: "Spain", flag: "/flags/es.svg", placeholder: "612 345 678", digits: "9 digits" },
  { code: "PT", dial: "+351", name: "Portugal", flag: "/flags/pt.svg", placeholder: "912 345 678", digits: "9 digits" },
  { code: "NL", dial: "+31", name: "Netherlands", flag: "/flags/nl.svg", placeholder: "6 12345678", digits: "9 digits" },
  { code: "BE", dial: "+32", name: "Belgium", flag: "/flags/be.svg", placeholder: "470 12 34 56", digits: "9 digits" },
  { code: "CH", dial: "+41", name: "Switzerland", flag: "/flags/ch.svg", placeholder: "78 123 45 67", digits: "9 digits" },
  { code: "AT", dial: "+43", name: "Austria", flag: "/flags/at.svg", placeholder: "664 123 4567", digits: "10-11 digits" },
  { code: "IE", dial: "+353", name: "Ireland", flag: "/flags/ie.svg", placeholder: "85 123 4567", digits: "9 digits" },
  { code: "SE", dial: "+46", name: "Sweden", flag: "/flags/se.svg", placeholder: "70 123 45 67", digits: "7-10 digits" },
  { code: "DK", dial: "+45", name: "Denmark", flag: "/flags/dk.svg", placeholder: "20 12 34 56", digits: "8 digits" },
  { code: "NO", dial: "+47", name: "Norway", flag: "/flags/no.svg", placeholder: "412 34 567", digits: "8 digits" },
  { code: "FI", dial: "+358", name: "Finland", flag: "/flags/fi.svg", placeholder: "41 234 5678", digits: "7-10 digits" },
  { code: "PL", dial: "+48", name: "Poland", flag: "/flags/pl.svg", placeholder: "512 345 678", digits: "9 digits" },
  { code: "CZ", dial: "+420", name: "Czech Republic", flag: "/flags/cz.svg", placeholder: "601 123 456", digits: "9 digits" },
  { code: "SK", dial: "+421", name: "Slovakia", flag: "/flags/sk.svg", placeholder: "901 234 567", digits: "9 digits" },
  { code: "RO", dial: "+40", name: "Romania", flag: "/flags/ro.svg", placeholder: "712 345 678", digits: "9 digits" },
  { code: "HU", dial: "+36", name: "Hungary", flag: "/flags/hu.svg", placeholder: "20 123 4567", digits: "9 digits" },
  { code: "HR", dial: "+385", name: "Croatia", flag: "/flags/hr.svg", placeholder: "91 234 5678", digits: "8-9 digits" },
  { code: "BG", dial: "+359", name: "Bulgaria", flag: "/flags/bg.svg", placeholder: "87 123 4567", digits: "8-9 digits" },
  { code: "LT", dial: "+370", name: "Lithuania", flag: "/flags/lt.svg", placeholder: "612 34567", digits: "8 digits" },
  { code: "UA", dial: "+380", name: "Ukraine", flag: "/flags/ua.svg", placeholder: "50 123 4567", digits: "9 digits" },
  { code: "RU", dial: "+7", name: "Russia", flag: "/flags/ru.svg", placeholder: "912 345 67 89", digits: "10 digits" },
  { code: "GR", dial: "+30", name: "Greece", flag: "/flags/gr.svg", placeholder: "691 234 5678", digits: "10 digits" },
  { code: "TR", dial: "+90", name: "Turkey", flag: "/flags/tr.svg", placeholder: "501 234 5678", digits: "10 digits" },

  // Middle East
  { code: "AE", dial: "+971", name: "UAE", flag: "/flags/ae.svg", placeholder: "50 123 4567", digits: "9 digits" },
  { code: "SA", dial: "+966", name: "Saudi Arabia", flag: "/flags/sa.svg", placeholder: "50 123 4567", digits: "9 digits" },
  { code: "QA", dial: "+974", name: "Qatar", flag: "/flags/qa.svg", placeholder: "3312 3456", digits: "8 digits" },
  { code: "KW", dial: "+965", name: "Kuwait", flag: "/flags/kw.svg", placeholder: "5012 3456", digits: "8 digits" },
  { code: "BH", dial: "+973", name: "Bahrain", flag: "/flags/bh.svg", placeholder: "3612 3456", digits: "8 digits" },
  { code: "OM", dial: "+968", name: "Oman", flag: "/flags/om.svg", placeholder: "9212 3456", digits: "8 digits" },
  { code: "JO", dial: "+962", name: "Jordan", flag: "/flags/jo.svg", placeholder: "7 9012 3456", digits: "9 digits" },
  { code: "LB", dial: "+961", name: "Lebanon", flag: "/flags/lb.svg", placeholder: "71 123 456", digits: "7-8 digits" },
  { code: "IL", dial: "+972", name: "Israel", flag: "/flags/il.svg", placeholder: "50 123 4567", digits: "9 digits" },
  { code: "EG", dial: "+20", name: "Egypt", flag: "/flags/eg.svg", placeholder: "100 234 5678", digits: "10 digits" },

  // Africa
  { code: "ZA", dial: "+27", name: "South Africa", flag: "/flags/za.svg", placeholder: "71 234 5678", digits: "9 digits" },
  { code: "NG", dial: "+234", name: "Nigeria", flag: "/flags/ng.svg", placeholder: "802 345 6789", digits: "10 digits" },
  { code: "KE", dial: "+254", name: "Kenya", flag: "/flags/ke.svg", placeholder: "712 345 678", digits: "9 digits" },
  { code: "GH", dial: "+233", name: "Ghana", flag: "/flags/gh.svg", placeholder: "24 123 4567", digits: "9 digits" },
  { code: "TZ", dial: "+255", name: "Tanzania", flag: "/flags/tz.svg", placeholder: "712 345 678", digits: "9 digits" },
  { code: "ET", dial: "+251", name: "Ethiopia", flag: "/flags/et.svg", placeholder: "91 123 4567", digits: "9 digits" },
  { code: "MA", dial: "+212", name: "Morocco", flag: "/flags/ma.svg", placeholder: "6 12 34 56 78", digits: "9 digits" },

  // South America
  { code: "BR", dial: "+55", name: "Brazil", flag: "/flags/br.svg", placeholder: "11 91234 5678", digits: "10-11 digits" },
  { code: "AR", dial: "+54", name: "Argentina", flag: "/flags/ar.svg", placeholder: "11 1234 5678", digits: "10 digits" },
  { code: "CO", dial: "+57", name: "Colombia", flag: "/flags/co.svg", placeholder: "301 234 5678", digits: "10 digits" },
  { code: "CL", dial: "+56", name: "Chile", flag: "/flags/cl.svg", placeholder: "9 1234 5678", digits: "9 digits" },
  { code: "PE", dial: "+51", name: "Peru", flag: "/flags/pe.svg", placeholder: "912 345 678", digits: "9 digits" },

  // Oceania
  { code: "NZ", dial: "+64", name: "New Zealand", flag: "/flags/nz.svg", placeholder: "21 123 4567", digits: "8-10 digits" },
];

const FlagImg = forwardRef<HTMLImageElement, { src: string; alt: string; size?: number }>(function FlagImg(
  { src, alt, size = 22 },
  ref,
) {
  return (
	    <img
	      ref={ref}
	      src={src}
	      alt={alt}
	      className="rounded-[3px] object-cover shadow-sm border border-white/20"
	      loading="lazy"
	      decoding="async"
	      style={{ width: size, height: Math.round(size * 0.68) }}
	    />
  );
});

interface CountryPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
}

export function CountryPhoneInput({ value, onChange, onBlur, name }: CountryPhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [localNumber, setLocalNumber] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sync external value prop → internal localNumber (only on external changes)
  const lastEmittedRef = useRef<string>("");

  useEffect(() => {
    // Skip if this value was emitted by us (avoid loop)
    if (value === lastEmittedRef.current) return;

    if (!value) {
      setLocalNumber("");
      return;
    }

    const sorted = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);
    const match = sorted.find((country) => value.startsWith(country.dial));

    if (match) {
      const incomingLocalNumber = value.slice(match.dial.length).trim();
      setSelectedCountry(match);
      setLocalNumber(incomingLocalNumber);
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;

    searchRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const closeDropdown = () => {
    setIsOpen(false);
    setSearch("");
  };

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    const e164 = buildPhoneE164(country.dial, localNumber);
    lastEmittedRef.current = e164;
    onChange(e164);
    closeDropdown();
  };

  const handleNumberChange = (num: string) => {
    const cleaned = num
      .normalize("NFKD")
      .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 65248))
      .replace(/[^\d\s\-]/g, "");

    setLocalNumber(cleaned);
    const e164 = buildPhoneE164(selectedCountry.dial, cleaned);
    lastEmittedRef.current = e164;
    onChange(e164);
  };

  const filtered = search
    ? COUNTRY_CODES.filter(
        (country) =>
          country.name.toLowerCase().includes(search.toLowerCase()) ||
          country.dial.includes(search) ||
          country.code.toLowerCase().includes(search.toLowerCase()),
      )
    : COUNTRY_CODES;

  const dropdownContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            onClick={closeDropdown}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.92)",
              zIndex: 9998,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "calc(100vw - 2rem)",
                maxWidth: "24rem",
                maxHeight: "75vh",
                borderRadius: "1rem",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.15)",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)",
              }}
              className="bg-slate-950"
            >
              <div className="relative overflow-hidden bg-slate-950">
              <div className="absolute -right-6 -top-6 h-44 w-44 opacity-[0.07] pointer-events-none select-none">
	                <img
	                  src={selectedCountry.flag}
	                  alt=""
	                  className="h-full w-full rounded-3xl object-cover blur-[2px]"
	                  loading="lazy"
	                  decoding="async"
	                  style={{ transform: "rotate(-15deg) scale(1.3)" }}
	                />
              </div>

              <div className="relative z-10 border-b border-white/10 p-2.5">
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search country..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-primary/40 backdrop-blur-sm"
                />
              </div>

              <div className="relative z-10 max-h-[65vh] overflow-y-auto overscroll-contain">
                {filtered.map((country, idx) => {
                  const isSelected = selectedCountry.code === country.code && selectedCountry.dial === country.dial;

                  return (
                    <motion.button
                      key={`${country.code}-${country.dial}`}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(idx * 0.012, 0.18), duration: 0.15 }}
                      className={cn(
                        "relative flex w-full items-center gap-3 overflow-hidden px-3 py-2.5 text-sm transition-all touch-manipulation group",
                        isSelected ? "bg-primary/20 text-primary font-semibold" : "text-white/90 hover:bg-white/10",
                      )}
                    >
                      <div className="absolute right-1 top-1/2 h-12 w-12 -translate-y-1/2 opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-[0.08]">
	                        <img
	                          src={country.flag}
	                          alt=""
	                          className="h-full w-full rounded-md object-cover"
	                          loading="lazy"
	                          decoding="async"
	                        />
                      </div>

                      <div className="relative shrink-0">
                        <FlagImg src={country.flag} alt={country.name} size={26} />
                        {isSelected && (
                          <motion.div
                            layoutId="phoneSelectedFlag"
                            className="absolute -inset-1 rounded-md border-2 border-primary/50 shadow-sm shadow-primary/20"
                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                          />
                        )}
                      </div>

                      <span className="w-6 shrink-0 text-[10px] font-bold uppercase tracking-widest text-white/40">{country.code}</span>

                      <div className="min-w-0 flex-1 text-left">
                        <span className="block truncate">{country.name}</span>
                        <span className="block text-[10px] text-white/40">{country.digits}</span>
                      </div>

                      <span className="text-xs font-mono tabular-nums text-white/60">{country.dial}</span>
                    </motion.button>
                  );
                })}

                {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-white/50">No country found</p>}
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative" ref={rootRef}>
      <div className="flex">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex shrink-0 items-center gap-2 rounded-l-xl border border-border bg-muted/50 px-3 py-2 text-sm text-foreground transition-all touch-manipulation active:scale-[0.97] hover:bg-muted"
        >
          <FlagImg src={selectedCountry.flag} alt={selectedCountry.name} size={24} />
          <span className="text-xs font-semibold tracking-tight text-foreground/70">{selectedCountry.dial}</span>
          <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
        </button>

        <input
          type="tel"
          inputMode="numeric"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          name={name}
          placeholder={selectedCountry.placeholder}
          autoComplete="off"
          value={localNumber}
          onChange={(e) => handleNumberChange(e.target.value)}
          onInput={(e) => {
            // Catch browser autofill / iOS paste that may bypass React onChange
            const target = e.target as HTMLInputElement;
            if (target.value !== localNumber) {
              handleNumberChange(target.value);
            }
          }}
          onBlur={onBlur}
          className="w-full rounded-r-xl border border-border border-l-0 bg-muted/50 py-2 pl-2 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          style={{ WebkitAppearance: "none" }}
        />
      </div>

      <p className="ml-1 mt-1 text-[11px] text-muted-foreground">
        {selectedCountry.name} • {selectedCountry.digits}
      </p>

      {typeof document !== "undefined" ? createPortal(dropdownContent, document.body) : null}
    </div>
  );
}
