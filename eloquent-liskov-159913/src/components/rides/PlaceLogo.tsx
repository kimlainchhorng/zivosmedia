/**
 * PlaceLogo – Shows brand logos for known chains, Google Places photo for others.
 * Uses locally stored brand logos for reliability.
 */
import { useState, memo } from "react";
import { cn } from "@/lib/utils";

// Local brand logo imports - Restaurants
import logoMcdonalds from "@/assets/brand-logos/mcdonalds.png";
import logoBurgerKing from "@/assets/brand-logos/burgerking.png";
import logoJackInTheBox from "@/assets/brand-logos/jackinthebox.png";
import logoTacoBell from "@/assets/brand-logos/tacobell.png";
import logoWendys from "@/assets/brand-logos/wendys.png";
import logoSubway from "@/assets/brand-logos/subway.png";
import logoStarbucks from "@/assets/brand-logos/starbucks.png";
import logoDunkin from "@/assets/brand-logos/dunkin.png";
import logoChickFilA from "@/assets/brand-logos/chickfila.png";
import logoPopeyes from "@/assets/brand-logos/popeyes.png";
import logoKfc from "@/assets/brand-logos/kfc.png";
import logoPizzaHut from "@/assets/brand-logos/pizzahut.png";
import logoDominos from "@/assets/brand-logos/dominos.png";
import logoArbys from "@/assets/brand-logos/arbys.png";
import logoSonic from "@/assets/brand-logos/sonic.png";
import logoChipotle from "@/assets/brand-logos/chipotle.png";
import logoPandaExpress from "@/assets/brand-logos/pandaexpress.png";
import logoFiveGuys from "@/assets/brand-logos/fiveguys.png";
import logoWingstop from "@/assets/brand-logos/wingstop.png";
import logoIhop from "@/assets/brand-logos/ihop.png";
import logoDennys from "@/assets/brand-logos/dennys.png";
import logoPanera from "@/assets/brand-logos/panera.png";
import logoApplebees from "@/assets/brand-logos/applebees.png";
import logoChilis from "@/assets/brand-logos/chilis.png";
import logoOliveGarden from "@/assets/brand-logos/olivegarden.png";
import logoBWW from "@/assets/brand-logos/buffalowildwings.png";
import logoRaisingCanes from "@/assets/brand-logos/raisingcanes.png";

// Local brand logo imports - Gas Stations
import logoShell from "@/assets/brand-logos/shell.png";
import logoChevron from "@/assets/brand-logos/chevron.png";
import logoExxon from "@/assets/brand-logos/exxon.png";
import logoMobil from "@/assets/brand-logos/mobil.png";
import logoBp from "@/assets/brand-logos/bp.png";
import logoValero from "@/assets/brand-logos/valero.png";
import logoCitgo from "@/assets/brand-logos/citgo.png";
import logoSunoco from "@/assets/brand-logos/sunoco.png";
import logoMarathon from "@/assets/brand-logos/marathon.png";
import logoCircleK from "@/assets/brand-logos/circlek.png";
import logoSpeedway from "@/assets/brand-logos/speedway.png";
import logoWawa from "@/assets/brand-logos/wawa.png";
import logoQuikTrip from "@/assets/brand-logos/quiktrip.png";

// Local brand logo imports - Shops & Grocery
import logoWalmart from "@/assets/brand-logos/walmart.png";
import logoTarget from "@/assets/brand-logos/target.png";
import logoCostco from "@/assets/brand-logos/costco.png";
import logo7Eleven from "@/assets/brand-logos/7eleven.png";
import logoWalgreens from "@/assets/brand-logos/walgreens.png";
import logoCvs from "@/assets/brand-logos/cvs.png";
import logoKroger from "@/assets/brand-logos/kroger.png";
import logoDollarGeneral from "@/assets/brand-logos/dollargeneral.png";
import logoTraderJoes from "@/assets/brand-logos/traderjoes.png";
import logoWholeFoods from "@/assets/brand-logos/wholefoods.png";

// Brand keyword → local logo (ordered longest-key-first for specificity)
const BRAND_LOGOS: [string, string][] = [
  // Multi-word matches first
  ["jack in the box", logoJackInTheBox],
  ["buffalo wild wing", logoBWW],
  ["raising cane", logoRaisingCanes],
  ["olive garden", logoOliveGarden],
  ["panda express", logoPandaExpress],
  ["dollar general", logoDollarGeneral],
  ["whole foods", logoWholeFoods],
  ["trader joe", logoTraderJoes],
  ["five guys", logoFiveGuys],
  ["chick-fil-a", logoChickFilA],
  ["pizza hut", logoPizzaHut],
  ["burger king", logoBurgerKing],
  ["taco bell", logoTacoBell],
  ["exxonmobil", logoExxon],
  ["circle k", logoCircleK],
  ["7-eleven", logo7Eleven],
  ["quiktrip", logoQuikTrip],
  // Single-word matches
  ["mcdonald", logoMcdonalds],
  ["wendy", logoWendys],
  ["subway", logoSubway],
  ["starbucks", logoStarbucks],
  ["dunkin", logoDunkin],
  ["popeyes", logoPopeyes],
  ["domino", logoDominos],
  ["chipotle", logoChipotle],
  ["wingstop", logoWingstop],
  ["applebee", logoApplebees],
  ["chili's", logoChilis],
  ["chilis", logoChilis],
  ["panera", logoPanera],
  ["arby", logoArbys],
  ["sonic", logoSonic],
  ["ihop", logoIhop],
  ["denny", logoDennys],
  ["chevron", logoChevron],
  ["marathon", logoMarathon],
  ["speedway", logoSpeedway],
  ["walgreens", logoWalgreens],
  ["walmart", logoWalmart],
  ["costco", logoCostco],
  ["target", logoTarget],
  ["kroger", logoKroger],
  ["shell", logoShell],
  ["exxon", logoExxon],
  ["mobil", logoMobil],
  ["valero", logoValero],
  ["citgo", logoCitgo],
  ["sunoco", logoSunoco],
  ["wawa", logoWawa],
  ["kfc", logoKfc],
  ["cvs", logoCvs],
  ["bp ", logoBp],
];

function getBrandLogoUrl(name: string): string | null {
  const lower = name.toLowerCase().trim();
  for (const [key, url] of BRAND_LOGOS) {
    if (lower.includes(key.trim())) return url;
  }
  return null;
}

interface PlaceLogoProps {
  name: string;
  googlePhotoUrl: string;
  categoryType: string;
  className?: string;
}

// Color palette for letter avatars
const CATEGORY_COLORS: Record<string, string> = {
  restaurant: "bg-orange-100 text-orange-600",
  shop: "bg-blue-100 text-blue-600",
  gas: "bg-emerald-100 text-emerald-600",
};

function PlaceLogoInner({ name, googlePhotoUrl, categoryType, className }: PlaceLogoProps) {
  const brandUrl = getBrandLogoUrl(name);
  const [brandFailed, setBrandFailed] = useState(false);
  const [googleFailed, setGoogleFailed] = useState(false);

  const initial = name.charAt(0).toUpperCase();
  const fallbackColor = CATEGORY_COLORS[categoryType] || "bg-muted text-muted-foreground";

  // Determine what to show
  const showBrand = brandUrl && !brandFailed;
  const showGoogle = !showBrand && googlePhotoUrl && !googleFailed;
  const showLetter = !showBrand && !showGoogle;

  return (
    <div className={cn(
      "w-11 h-11 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-border/10",
      className
    )}>
      {showBrand && (
        <img
          src={brandUrl}
	          alt={name}
	          className="w-8 h-8 object-contain"
	          loading="lazy"
	          decoding="async"
	          onError={() => setBrandFailed(true)}
        />
      )}
      {showGoogle && (
        <img
          src={googlePhotoUrl}
	          alt={name}
	          className="w-full h-full object-cover"
	          loading="lazy"
	          decoding="async"
	          onError={() => setGoogleFailed(true)}
        />
      )}
      {showLetter && (
        <div className={cn("w-full h-full flex items-center justify-center font-bold text-sm", fallbackColor)}>
          {initial}
        </div>
      )}
    </div>
  );
}

export const PlaceLogo = memo(PlaceLogoInner);
export default PlaceLogo;
