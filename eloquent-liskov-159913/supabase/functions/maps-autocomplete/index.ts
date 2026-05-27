import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// All US commercial airport codes (FAA Part 139 certified + regional)
const AIRPORT_CODES = new Set([
  // Top 50 busiest
  "ATL","LAX","ORD","DFW","DEN","JFK","SFO","SEA","LAS","MCO",
  "CLT","MIA","PHX","EWR","IAH","MSP","BOS","FLL","DTW","PHL",
  "LGA","BWI","SLC","SAN","IAD","DCA","MDW","TPA","PDX","HNL",
  "STL","BNA","AUS","MSY","RDU","OAK","SMF","SNA","MKE","CLE",
  "SAT","RSW","PIT","IND","CMH","CVG","BDL","JAX","OMA","ABQ",
  // 51-100
  "BUF","OGG","RIC","ONT","BUR","ANC","PBI","TUS","MEM","OKC",
  "RNO","KOA","LIH","SJU","SDF","CHS","GRR","DAY","BOI","ELP",
  "TUL","LIT","DSM","GSO","SYR","ROC","ALB","MSN","PNS","SAV",
  "GSP","BHM","TYS","PWM","COS","MHT","ORF","ICT","LEX","MYR",
  // 101-150
  "HSV","CAK","BTR","AVL","FNT","FAT","SBN","LBB","MDT","SRQ",
  "SGF","XNA","FSD","CRW","TRI","MOB","LFT","AGS","GNV","SHV",
  "EYW","ACY","GPT","JAN","MLI","FAR","PHF","MFE","AZO","EVV",
  "BIS","RAP","GFK","FCA","BZN","MSO","GTF","HLN","IDA","PIH",
  "TWF","SUN","JAC","WYS","CPR","CYS","RKS","GCC","COD","SHR",
  // 151-200
  "BIL","BTM","SDY","OLF","GGW","WLF","ASE","EGE","GUC","DRO",
  "MTJ","HDN","TEX","PUB","ALS","GJT","CEZ","SIT","JNU","KTN",
  "CDV","YAK","ADQ","BET","OTZ","OME","BRW","FAI","AKN","DLG",
  "ADK","SCC","WRG","PSG","GST","HNS","SGY","ACV","RDD","SBP",
  "MRY","MOD","MMH","IYK","PSP","IPL","YUM","FLG","PRC","IGM",
  // 201-250
  "SOW","AEX","MLU","ELM","ITH","BGM","OGS","PBG","SWF","HPN",
  "ISP","EWN","OAJ","ILM","FAY","PGV","CLT","AVP","ABE","LNS",
  "UNV","IPT","JST","AOO","DUJ","ERI","SCE","PIR","ABR","MHE",
  "ATY","HON","SUX","LNK","GRI","EAR","MCK","AIA","BFF","CDR",
  "OFK","LBF","VEL","PVU","OGD","CDC","SGU","CNY","MOA","ENV",
  // 251-300+
  "RFD","CMI","SPI","PIA","BMI","MWA","DEC","UIN","COU","CGI",
  "JLN","TBN","VIH","STJ","MCI","MKC","FOE","TOP","HYS","GBD",
  "SLN","MHK","DDC","LWS","PIH","RDM","EUG","MFR","OTH","LMT",
  "DLS","TTD","CVO","HIO","RDU","ILG","DOV","SBY","HGR","CGX",
  "GYY","SBN","LAF","HUF","BMG","TYR","GGG","SPS","ABI","SJT",
  "ACT","CLL","BPT","LCH","CRP","BRO","HRL","MAF","AMA","LBK",
]);

const airportKeywordPattern = /\b(airport|terminal|gate|concourse|airline|arrivals?|departures?|pickup|pick[\s-]?up|drop[\s-]?off|zone|baggage|claim|parking|taxi|rideshare|ground\s*transport)\b/i;
const iataCodePattern = /^[A-Z]{3}$/;
const US_AIRLINES = [
  "American Airlines",
  "Delta",
  "United Airlines",
  "Southwest Airlines",
  "JetBlue",
  "Spirit Airlines",
  "Frontier Airlines",
  "Alaska Airlines",
  "Allegiant Air",
  "Hawaiian Airlines",
  "Sun Country Airlines",
  "Breeze Airways",
  "Avelo Airlines",
];

function isAirportCode(input: string): string | null {
  const upper = input.trim().toUpperCase();
  // Match known US airport codes first, then fallback to any IATA-like 3-letter code
  for (const word of upper.split(/\s+/)) {
    if (AIRPORT_CODES.has(word) || iataCodePattern.test(word)) return word;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: { user }, error: authErr } = await createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  ).auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { input, proximity, country } = await req.json();

    if (!input || typeof input !== "string" || input.trim().length < 2 || input.length > 200) {
      return new Response(JSON.stringify({ error: "Input must be 2-200 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!key) {
      console.error("[maps-autocomplete] GOOGLE_MAPS_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Maps service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedInput = input.trim();
    const matchedCode = isAirportCode(normalizedInput);
    const isAirportSearch = airportKeywordPattern.test(normalizedInput) || !!matchedCode;

    // Build query variants for airport searches
    const queryInputs: string[] = [normalizedInput];

    if (isAirportSearch) {
      const base = normalizedInput;
      if (matchedCode && !/\bairport\b/i.test(base)) queryInputs.push(`${matchedCode} airport`);
      if (!/\bterminal\b/i.test(base)) queryInputs.push(`${base} terminal`);
      if (!/\bterminal\s*[0-9a-z]\b/i.test(base)) {
        queryInputs.push(`${base} terminal 1`);
        queryInputs.push(`${base} terminal a`);
      }
      if (!/\b(zone|pickup|pick[\s-]?up)\b/i.test(base)) queryInputs.push(`${base} pickup zone`);
      if (!/\b(drop[\s-]?off)\b/i.test(base)) queryInputs.push(`${base} drop off zone`);
      if (!/\b(arrivals?)\b/i.test(base)) queryInputs.push(`${base} arrivals`);
      if (!/\b(departures?)\b/i.test(base)) queryInputs.push(`${base} departures`);
      if (!/\b(ground\s*transport)\b/i.test(base)) queryInputs.push(`${base} ground transportation`);
      if (!/\b(baggage|claim)\b/i.test(base)) queryInputs.push(`${base} baggage claim`);
      // Airlines
      const hasAirline = /\b(american|delta|united|southwest|jetblue|spirit|frontier|alaska|allegiant|hawaiian|sun\s*country|breeze|avelo|airline)\b/i.test(base);
      if (!hasAirline) {
        for (const airline of US_AIRLINES) {
          queryInputs.push(`${base} ${airline}`);
        }
      }
      // Deduplicate
      const unique = Array.from(new Set(queryInputs.filter(Boolean)));
      queryInputs.length = 0;
      queryInputs.push(...unique);
    }

    // Determine country restriction — support US + KH (Cambodia)
    const countryParam = country?.toLowerCase() === "kh" ? "country:kh" : 
                         country?.toLowerCase() === "all" ? "" : "country:us|country:kh";

    const fetchPredictions = async (query: string) => {
      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
        `?input=${encodeURIComponent(query)}` +
        `&key=${encodeURIComponent(key)}`;

      if (countryParam) {
        url += `&components=${countryParam}`;
      }

      if (proximity?.lat && proximity?.lng) {
        url += `&location=${proximity.lat},${proximity.lng}&radius=80000`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.error("[maps-autocomplete] Google API error:", data.status, data.error_message, "for query:", query);
        return [];
      }

      return data.predictions ?? [];
    };

    console.log(`[maps-autocomplete] Fetching suggestions for: "${normalizedInput}" (airport=${isAirportSearch})`);

    // Phase 1: Fetch initial queries
    const phase1Groups = await Promise.all(queryInputs.map(fetchPredictions));
    let mergedPredictions = phase1Groups.flat();

    // Phase 2: If airport search, detect airport code from results and fetch code-specific queries
    if (isAirportSearch) {
      let detectedCode = matchedCode;

      if (!detectedCode) {
        for (const prediction of mergedPredictions) {
          const desc = String(prediction?.description ?? "");
          const match = desc.match(/\(([A-Z]{3})\)/);
          if (match?.[1] && iataCodePattern.test(match[1])) {
            detectedCode = match[1];
            break;
          }
        }
      }

      if (detectedCode) {
        const codeQueries = [
          `${detectedCode} terminal`,
          `${detectedCode} arrivals`,
          `${detectedCode} departures`,
          `${detectedCode} pickup zone`,
          `${detectedCode} drop off zone`,
          `${detectedCode} ground transportation`,
          `${detectedCode} baggage claim`,
          `${detectedCode} rideshare pickup`,
          `${detectedCode} taxi stand`,
          ...US_AIRLINES.map((airline) => `${detectedCode} ${airline}`),
        ];
        const phase2Groups = await Promise.all(codeQueries.map(fetchPredictions));
        mergedPredictions = [...mergedPredictions, ...phase2Groups.flat()];
      }
    }

    // Deduplicate by place_id
    const uniquePredictions = Array.from(
      new Map(mergedPredictions.map((p: any) => [p.place_id, p])).values()
    );

    // Score and rank results
    const scoreSuggestion = (text: string): number => {
      const v = text.toLowerCase();
      const isAirportRelated = v.includes("airport") || v.includes("terminal") || v.includes("gate") ||
        v.includes("concourse") || v.includes("arrivals") || v.includes("departures") ||
        v.includes("airline") || v.includes("baggage") || v.includes("claim") ||
        v.includes("ground transport") || v.includes("rideshare") || v.includes("taxi stand") ||
        AIRPORT_CODES.has(v.match(/\(([A-Z]{3})\)/)?.[1] ?? "");

      let score = 0;

      // Highest: zone / pickup / drop-off at airport
      if ((v.includes("zone") || v.includes("pickup") || v.includes("pick up") || v.includes("pick-up") || v.includes("drop off") || v.includes("drop-off")) && isAirportRelated) score += 8;

      // High: arrivals / departures
      if (v.includes("arrivals") || v.includes("departures")) score += 7;

      // High: terminal / concourse / gate
      if (v.includes("terminal") || v.includes("concourse") || v.includes("gate")) score += 6;

      // Medium-high: baggage / ground transport / taxi / rideshare
      if (v.includes("baggage") || v.includes("claim") || v.includes("ground transport") || v.includes("taxi") || v.includes("rideshare")) score += 5;

      // Medium: specific airlines at airport
      if ((v.includes("american") || v.includes("delta") || v.includes("united") || v.includes("southwest") || v.includes("jetblue") || v.includes("spirit") || v.includes("frontier") || v.includes("alaska") || v.includes("allegiant") || v.includes("hawaiian") || v.includes("sun country") || v.includes("breeze") || v.includes("avelo")) && isAirportRelated) score += 4;

      // Rideshare / taxi pickup
      if ((v.includes("rideshare") || v.includes("taxi stand") || v.includes("uber") || v.includes("lyft")) && isAirportRelated) score += 5;

      // Base: airport mention
      if (v.includes("airport")) score += 2;

      // Penalize non-airport results in airport search
      if (v.includes("hotel") || v.includes("inn") || v.includes("suites") || v.includes("rental") || v.includes("restaurant") || v.includes("parking")) score -= 4;
      if (isAirportSearch && !isAirportRelated) score -= 6;

      return score;
    };

    const baseSuggestions = uniquePredictions
      .map((p: any) => {
        const description = p.description ?? "";
        const mainText = p.structured_formatting?.main_text ?? description.split(",")[0] ?? "";
        const score = scoreSuggestion(`${mainText} ${description}`);
        return { description, place_id: p.place_id, main_text: mainText, score };
      })
      .sort((a, b) => b.score - a.score);

    // Generate synthetic zone suggestions if Google didn't return any
    const hasRealZoneSuggestion = baseSuggestions.some((item) => {
      const v = `${item.main_text} ${item.description}`.toLowerCase();
      const hasZone = v.includes("pickup") || v.includes("drop off") || v.includes("drop-off") || v.includes("arrivals") || v.includes("departures") || v.includes("zone") || v.includes("baggage") || v.includes("ground transport");
      const hasAirport = v.includes("airport") || v.includes("terminal") || v.includes("gate") || v.includes("concourse") || /\([A-Z]{3}\)/.test(item.description);
      return hasZone && hasAirport;
    });

    // Find the main airport (not an airline desk) for synthetic zones
    const primaryAirport = baseSuggestions.find((item) => {
      const v = `${item.main_text} ${item.description}`.toLowerCase();
      const isMainAirport = v.includes("international airport") || v.includes("airport (") || (v.includes("airport") && !v.includes("shuttle") && !v.includes("hotel") && !v.includes("inn"));
      const isAirlineDesk = v.includes("american airlines") || v.includes("delta air") || v.includes("united airlines") || v.includes("southwest airlines") || v.includes("jetblue") || v.includes("spirit airlines") || v.includes("frontier airlines");
      return isMainAirport && !isAirlineDesk;
    }) ?? baseSuggestions.find((item) => /\([A-Z]{3}\)/.test(item.description));

    const syntheticZones = isAirportSearch && primaryAirport
      ? [
          {
            description: `${primaryAirport.description} — Pickup (Arrivals Zone)`,
            main_text: "✈ Pickup — Arrivals Zone",
            place_id: `${primaryAirport.place_id}::pickup`,
            canonical_place_id: primaryAirport.place_id,
            score: 100,
          },
          {
            description: `${primaryAirport.description} — Drop-off (Departures Zone)`,
            main_text: "✈ Drop-off — Departures Zone",
            place_id: `${primaryAirport.place_id}::dropoff`,
            canonical_place_id: primaryAirport.place_id,
            score: 99,
          },
          {
            description: `${primaryAirport.description} — Terminal`,
            main_text: "✈ Terminal",
            place_id: `${primaryAirport.place_id}::terminal`,
            canonical_place_id: primaryAirport.place_id,
            score: 98,
          },
          {
            description: `${primaryAirport.description} — Rideshare / Taxi Pickup`,
            main_text: "✈ Rideshare / Taxi Pickup",
            place_id: `${primaryAirport.place_id}::rideshare`,
            canonical_place_id: primaryAirport.place_id,
            score: 97,
          },
          {
            description: `${primaryAirport.description} — Ground Transportation`,
            main_text: "✈ Ground Transportation",
            place_id: `${primaryAirport.place_id}::ground`,
            canonical_place_id: primaryAirport.place_id,
            score: 96,
          },
          {
            description: `${primaryAirport.description} — Baggage Claim`,
            main_text: "✈ Baggage Claim",
            place_id: `${primaryAirport.place_id}::baggage`,
            canonical_place_id: primaryAirport.place_id,
            score: 95,
          },
        ]
      : [];

    const syntheticAirlines = isAirportSearch && primaryAirport
      ? US_AIRLINES.map((airline, index) => ({
          description: `${primaryAirport.description} — ${airline}`,
          main_text: `✈ ${airline}`,
          place_id: `${primaryAirport.place_id}::airline-${index}`,
          canonical_place_id: primaryAirport.place_id,
          score: 90 - index,
        }))
      : [];

    // Deduplicate synthetic + real by place_id, keep highest score
    const allSuggestions = [...syntheticZones, ...syntheticAirlines, ...baseSuggestions];
    const deduped = Array.from(
      new Map(allSuggestions.map((s) => [s.place_id, s])).values()
    ).sort((a, b) => b.score - a.score);

    const suggestions = deduped
      .slice(0, 25)
      .map(({ score: _score, ...item }) => item);

    console.log(`[maps-autocomplete] Returning ${suggestions.length} suggestions`);

    return new Response(JSON.stringify({ ok: true, suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[maps-autocomplete] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
