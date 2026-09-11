import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useI18n } from "@/hooks/useI18n";
import SEOHead from "@/components/SEOHead";
import { cambodiaGuides, travelFaqs } from "@/content/cambodiaGuides";
import CambodiaGuideView from "./CambodiaGuideView";
export default function CambodiaGuide() {
  const { pathname } = useLocation();
  const { locale } = useI18n();
  const guide = cambodiaGuides.find(item => item.path === pathname)!;
  const i = locale === "km" ? 1 : 0;
  useEffect(() => {
    const links = ["en", "km", "x-default"].map(lang => {
      const link = document.createElement("link"); link.rel = "alternate"; link.hreflang = lang;
      link.href = `https://zivosmedia.com${pathname}${lang === "x-default" ? "" : `?lang=${lang}`}`;
      document.head.append(link); return link;
    });
    return () => links.forEach(link => link.remove());
  }, [pathname]);
  if (!guide) return null;
  return <><SEOHead title={`${guide.title[i]} | ZIVO`} description={guide.intro[i]} canonical={guide.path} structuredData={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: travelFaqs.map(faq => ({ "@type": "Question", name: faq.question[i], acceptedAnswer: { "@type": "Answer", text: faq.answer[i] } })) }} /><CambodiaGuideView guide={guide} km={i === 1} /></>;
}
