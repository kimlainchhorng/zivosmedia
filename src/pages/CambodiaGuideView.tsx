import { cambodiaGuides, travelFaqs, type CambodiaGuide } from "@/content/cambodiaGuides";
export default function CambodiaGuideView({ guide, km }: { guide: CambodiaGuide; km: boolean }) {
  const i = km ? 1 : 0;
  const text = (en: string, kh: string) => km ? kh : en;
  const suffix = `lang=${km ? "km" : "en"}`;
  const flight = guide.path === "/flights/phnom-penh-siem-reap" ? `/flights?from=KTI&to=SAI&${suffix}` : `/flights?${guide.airport ? `to=${guide.airport}&` : ""}${suffix}`;
  return <div className="min-h-dvh bg-white text-slate-900" translate="no" data-no-auto-translate>
    <header className="border-b"><nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5" aria-label={text("Main navigation", "ម៉ឺនុយចម្បង")}><a className="text-2xl font-black text-rose-600" href={`/?${suffix}`}>ZIVO</a><a className="rounded-full border px-5 py-3" href={`${guide.path}?lang=${km ? "en" : "km"}`}>{km ? "English" : "ភាសាខ្មែរ"}</a></nav></header>
    <main className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      <a className="text-sm font-semibold text-rose-700" href={`/cambodia?${suffix}`}>{text("Explore Cambodia", "ស្វែងយល់ពីកម្ពុជា")}</a>
      <h1 className="mt-5 text-4xl font-extrabold leading-normal">{guide.title[i]}</h1>
      <p className="mt-6 max-w-3xl text-lg leading-loose text-slate-600">{guide.intro[i]}</p>
      <section className="mt-10 rounded-3xl bg-slate-50 p-6 sm:p-9"><h2 className="text-2xl font-bold">{text("Before you book", "មុនពេលអ្នកកក់")}</h2><p className="mt-4 max-w-3xl leading-loose">{guide.planning[i]}</p><div className="mt-6 flex flex-wrap gap-3"><a className="rounded-full bg-slate-900 px-6 py-3 font-semibold text-white" href={flight}>{text("Plan flights", "រៀបចំជើងហោះហើរ")}</a><a className="rounded-full border border-slate-400 px-6 py-3 font-semibold" href={`/hotels?${guide.hotelCity ? `city=${encodeURIComponent(guide.hotelCity)}&` : ""}${suffix}`}>{text("Explore places to stay", "ស្វែងរកកន្លែងស្នាក់នៅ")}</a></div></section>
      <section className="mt-12"><h2 className="text-2xl font-bold">{text("Questions about planning", "សំណួរអំពីការរៀបចំដំណើរ")}</h2>{travelFaqs.map(faq => <details key={faq.question[0]} className="mt-4 rounded-2xl border p-5"><summary className="cursor-pointer font-semibold">{faq.question[i]}</summary><p className="mt-4 leading-loose text-slate-600">{faq.answer[i]}</p></details>)}</section>
      <section className="mt-12"><h2 className="text-2xl font-bold">{text("Continue exploring", "បន្តស្វែងយល់")}</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{cambodiaGuides.filter(item => item.path !== guide.path).map(item => <a className="rounded-xl border px-4 py-4 font-medium hover:bg-slate-50" key={item.path} href={`${item.path}?${suffix}`}>{item.title[i]}</a>)}</div></section>
      <p className="mt-10 text-sm text-slate-500">{text("Airport and destination reference", "ប្រភពព័ត៌មានអាកាសយានដ្ឋាន និងគោលដៅ")}: <a href={guide.source} className="underline" target="_blank" rel="noreferrer">{text("Official information", "ព័ត៌មានផ្លូវការ")}</a></p>
    </main>
    <footer className="border-t px-5 py-8"><nav className="mx-auto flex max-w-5xl flex-wrap gap-6" aria-label={text("Footer", "តំណភ្ជាប់បន្ថែម")}><a href={`/contact?${suffix}`}>{text("Contact", "ទំនាក់ទំនង")}</a><a href={`/legal/privacy?${suffix}`}>{text("Privacy", "ឯកជនភាព")}</a><a href={`/legal/terms?${suffix}`}>{text("Terms", "លក្ខខណ្ឌ")}</a></nav></footer>
  </div>;
}
