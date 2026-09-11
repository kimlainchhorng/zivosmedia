import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { publicHomeLanguage, syncPublicHomeLanguage } from "@/lib/publicHomeLanguage";
import SEOHead from "@/components/SEOHead";
import CambodiaHomeView from "./CambodiaHomeView";

export default function CambodiaHome() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("lang");
  const locale = publicHomeLanguage(requested);
  // A `?lang=` in the URL only gets there by following a language link or using
  // the switch below, so it is a choice; a bare visit is not, and must stay open
  // to the browser locale.
  const chosen = requested === "en" || requested === "km";
  useEffect(() => { syncPublicHomeLanguage(locale, chosen); }, [locale, chosen]);
  const km = locale === "km";
  const text = (en: string, kh: string) => km ? kh : en;
  useEffect(() => {
    const links = ["en", "km", "x-default"].map((lang) => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = lang;
      link.href = `https://zivosmedia.com/${lang === "x-default" ? "" : `?lang=${lang}`}`;
      document.head.appendChild(link);
      return link;
    });
    return () => links.forEach((link) => link.remove());
  }, []);
  return <>
    <SEOHead title={text("One app for Cambodia | Zivo - Media", "កម្មវិធីតែមួយសម្រាប់កម្ពុជា | Zivo - Media")}
      description={text("Explore rides, food, delivery, hotels, flights and business with ZIVO. Start your next journey in Cambodia.", "ស្វែងរកការធ្វើដំណើរ អាហារ ការដឹកជញ្ជូន សណ្ឋាគារ ជើងហោះហើរ និងអាជីវកម្មជាមួយ ZIVO។")}
      canonical="/" structuredData={{ "@context": "https://schema.org", "@type": "WebSite", name: "Zivo - Media", url: "https://zivosmedia.com/", inLanguage: km ? "km" : "en" }} />
    <CambodiaHomeView km={km} onLanguageChange={() => {
      const next = km ? "en" : "km";
      const query = new URLSearchParams(params); query.set("lang", next); setParams(query, { replace: true });
    }} />
  </>;
}
