import { ArrowUpRight, CarFront, UtensilsCrossed, Hotel, Plane, Package, BriefcaseBusiness } from "lucide-react";
const cambodia = "/images/cambodia-home.jpg";
const services = [
  { en: "Get a ride", km: "ហៅរថយន្ត", detail: "Your next stop, with ZIVO Ride.", detailKm: "ធ្វើដំណើរទៅកាន់គោលដៅជាមួយ ZIVO Ride។", href: "https://ride.zivosmedia.com", icon: CarFront, color: "bg-sky-50 text-sky-700" },
  { en: "Order food", km: "កម្មង់អាហារ", detail: "Find something delicious nearby.", detailKm: "ស្វែងរកអាហារឆ្ងាញ់នៅជិតអ្នក។", href: "/eats", icon: UtensilsCrossed, color: "bg-orange-50 text-orange-700" },
  { en: "Book hotels", km: "កក់សណ្ឋាគារ", detail: "Find a place to make yourself at home.", detailKm: "ស្វែងរកកន្លែងស្នាក់នៅសម្រាប់ដំណើររបស់អ្នក។", href: "/hotels", icon: Hotel, color: "bg-amber-50 text-amber-700" },
  { en: "Search flights", km: "ស្វែងរកជើងហោះហើរ", detail: "Start planning your next adventure.", detailKm: "ចាប់ផ្ដើមរៀបចំដំណើរកម្សាន្តបន្ទាប់របស់អ្នក។", href: "/flights", icon: Plane, color: "bg-blue-50 text-blue-700" },
  { en: "Send a delivery", km: "ផ្ញើទំនិញ", detail: "Explore delivery options in your area.", detailKm: "ស្វែងរកជម្រើសដឹកជញ្ជូនក្នុងតំបន់របស់អ្នក។", href: "/delivery", icon: Package, color: "bg-violet-50 text-violet-700" },
  { en: "For business", km: "សម្រាប់អាជីវកម្ម", detail: "Bring your business to ZIVO.", detailKm: "ភ្ជាប់អាជីវកម្មរបស់អ្នកជាមួយ ZIVO។", href: "https://zivobusiness.com", icon: BriefcaseBusiness, color: "bg-emerald-50 text-emerald-700" },
];

export default function CambodiaHomeView({ km, onLanguageChange }: { km: boolean; onLanguageChange?: () => void }) {
  const text = (en: string, kh: string) => km ? kh : en;
  const local = (href: string) => `${href}${href.includes("?") ? "&" : "?"}lang=${km ? "km" : "en"}`;
  return <div translate="no" data-no-auto-translate className="min-h-dvh bg-white text-slate-900">
    <header className="border-b border-slate-100">
      <nav aria-label={text("Main navigation", "ម៉ឺនុយចម្បង")} className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <a href={local("/")} className="bg-ig-gradient bg-clip-text text-3xl font-black tracking-tight text-transparent" aria-label="Zivo - Media">ZIVO</a>
        <div className="flex items-center gap-2 sm:gap-6">
          <a href="#services" className="hidden py-3 text-sm font-semibold sm:inline">{text("Explore services", "ស្វែងរកសេវាកម្ម")}</a>
          <a className="min-h-11 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold" lang={km ? "en" : "km"} href={`/?lang=${km ? "en" : "km"}`} onClick={onLanguageChange ? (event) => { event.preventDefault(); onLanguageChange(); } : undefined}>{km ? "English" : "ភាសាខ្មែរ"}</a>
          <a href={local("/login")} className="min-h-11 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">{text("Log in", "ចូលគណនី")}</a>
        </div>
      </nav>
    </header>
    <main id="main-content" tabIndex={-1}>
      <section className="mx-auto grid max-w-6xl items-center gap-9 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-2 lg:gap-14 lg:py-20">
        <div>
          <h1 className={`font-extrabold tracking-tight ${km ? "text-4xl leading-normal sm:text-5xl" : "text-5xl leading-[1.08] sm:text-6xl"}`}>{text("One app for Cambodia", "កម្មវិធីតែមួយសម្រាប់កម្ពុជា")}</h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-600">{text("Your everyday journeys. Your next adventure. Rides, food, delivery and travel — together with ZIVO.", "ដំណើរប្រចាំថ្ងៃ និងដំណើរកម្សាន្តបន្ទាប់របស់អ្នក។ ការធ្វើដំណើរ អាហារ ការដឹកជញ្ជូន និងទេសចរណ៍ ជាមួយ ZIVO។")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="https://ride.zivosmedia.com" className="inline-flex min-h-12 items-center gap-3 rounded-full bg-ig-gradient px-6 py-3 font-bold text-white">{text("Get a ride", "ហៅរថយន្ត")}<ArrowUpRight size={19} aria-hidden="true" /></a>
            <a href="#services" className="inline-flex min-h-12 items-center rounded-full border border-slate-300 px-6 py-3 font-semibold">{text("Explore ZIVO", "ស្វែងយល់ពី ZIVO")}</a>
          </div>
          <p className="mt-5 text-sm text-slate-500">{text("Available services depend on your location.", "សេវាកម្មដែលអាចប្រើបានអាស្រ័យលើទីតាំងរបស់អ្នក។")}</p>
        </div>
        <figure className="relative overflow-hidden rounded-[2rem] bg-slate-100">
          <img src={cambodia} alt={text("Angkor temples in Siem Reap, Cambodia", "ប្រាសាទអង្គរនៅខេត្តសៀមរាប ប្រទេសកម្ពុជា")} width={640} height={480} fetchPriority="high" className="aspect-[4/3] w-full object-cover" />
          <figcaption className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 to-transparent px-7 pb-6 pt-14 text-lg font-semibold text-white">{text("Start here. Go anywhere.", "ចាប់ផ្ដើមទីនេះ។ ធ្វើដំណើរទៅគ្រប់ទីកន្លែង។")}</figcaption>
        </figure>
      </section>
      <section id="services" className="mx-auto max-w-6xl scroll-mt-6 px-5 pb-16 sm:px-8">
        <h2 className="text-2xl font-bold sm:text-3xl">{text("What would you like to do?", "តើអ្នកចង់ធ្វើអ្វី?")}</h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{services.map(({ en, km: labelKm, detail, detailKm, href, icon: Icon, color }) => {
          const content = <><div className="flex items-center justify-between"><span className={`rounded-2xl p-3 ${color}`}><Icon size={25} aria-hidden="true" /></span><ArrowUpRight size={20} className="text-slate-400" aria-hidden="true" /></div><h3 className="mt-5 text-lg font-bold">{text(en, labelKm)}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{text(detail, detailKm)}</p></>;
          const className = "rounded-3xl border border-slate-200 p-6 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4";
          return href.startsWith("https:") ? <a key={href} href={href} className={className}>{content}</a> : <a key={href} href={local(href)} className={className}>{content}</a>;
        })}</div>
      </section>
      <section className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8"><h2 className="text-2xl font-bold sm:text-3xl">{text("A simple way to get started", "ចាប់ផ្ដើមប្រើប្រាស់យ៉ាងងាយស្រួល")}</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">{[
            ["Choose a service", "ជ្រើសរើសសេវាកម្ម", "Explore what you need, from your daily ride to your next stay.", "ស្វែងរកអ្វីដែលអ្នកត្រូវការ ពីការធ្វើដំណើរប្រចាំថ្ងៃដល់កន្លែងស្នាក់នៅ។"],
            ["Log in to continue", "ចូលគណនីដើម្បីបន្ត", "Use your ZIVO account when you are ready to book or order.", "ប្រើគណនី ZIVO នៅពេលអ្នកត្រៀមកក់ ឬកម្មង់។"],
            ["Review and confirm", "ពិនិត្យ និងបញ្ជាក់", "Check availability, prices and details before you confirm.", "ពិនិត្យភាពទំនេរ តម្លៃ និងព័ត៌មានលម្អិត មុនពេលបញ្ជាក់។"],
          ].map(([en, kh, detail, detailKm], i) => <li key={en}><span className="text-sm font-bold text-rose-600">0{i + 1}</span><h3 className="mt-3 font-bold">{text(en, kh)}</h3><p className="mt-2 leading-relaxed text-slate-600">{text(detail, detailKm)}</p></li>)}</ol>
        </div>
      </section>
      <section className="mx-auto flex max-w-6xl flex-col justify-between gap-7 px-5 py-14 sm:px-8 md:flex-row md:items-center">
        <div><h2 className="text-2xl font-bold">{text("Take ZIVO with you", "យក ZIVO ទៅជាមួយអ្នក")}</h2><p className="mt-3 text-slate-600">{text("Add ZIVO to your home screen for easy access.", "បន្ថែម ZIVO ទៅអេក្រង់ដើមរបស់អ្នក ដើម្បីងាយស្រួលប្រើប្រាស់។")}</p></div>
        <a href={local("/install")} className="self-start rounded-full bg-slate-900 px-6 py-4 font-semibold text-white">{text("Add to home screen", "បន្ថែមទៅអេក្រង់ដើម")}</a>
      </section>
    </main>
    <section className="mx-auto max-w-6xl px-5 pb-12 sm:px-8"><a href={local("/cambodia")} className="text-lg font-bold text-rose-700 underline">{text("Explore Cambodia: cities, airports and trip planning", "ស្វែងយល់ពីកម្ពុជា៖ ទីក្រុង អាកាសយានដ្ឋាន និងការរៀបចំដំណើរ")}</a></section>
    <footer className="border-t border-slate-200 px-5 py-9 sm:px-8"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 text-sm text-slate-600"><p>© {new Date().getFullYear()} Zivo - Media</p><nav aria-label={text("Footer", "តំណភ្ជាប់បន្ថែម")} className="flex flex-wrap gap-x-6 gap-y-3">
      <a href="https://zivodriver.com" className="py-2">{text("Drive with ZIVO", "បើកបរជាមួយ ZIVO")}</a>
      <a href={local("/about")} className="py-2">{text("About", "អំពីយើង")}</a><a href={local("/contact")} className="py-2">{text("Contact", "ទំនាក់ទំនង")}</a><a href={local("/legal/privacy")} className="py-2">{text("Privacy", "ឯកជនភាព")}</a><a href={local("/legal/terms")} className="py-2">{text("Terms", "លក្ខខណ្ឌ")}</a>
    </nav></div></footer>
  </div>;
}
