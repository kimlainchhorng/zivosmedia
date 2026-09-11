import { useEffect } from "react";

export default function ConfigurationUnavailable() {
  const khmer = new URLSearchParams(window.location.search).get("lang") === "km";
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = khmer ? "km" : "en";
    return () => { document.documentElement.lang = previous; };
  }, [khmer]);
  return (
    <main lang={khmer ? "km" : "en"} className="min-h-dvh flex items-center justify-center bg-background p-6 text-foreground">
      <section role="alert" className="w-full max-w-lg space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
        <p className="font-semibold">Zivo - Media</p>
        <h1 className="text-2xl font-bold">
          {khmer ? "សេវាកម្មមិនអាចប្រើបានជាបណ្ដោះអាសន្ន" : "ZIVO is temporarily unavailable"}
        </h1>
        <p>{khmer
          ? "យើងត្រូវធ្វើបច្ចុប្បន្នភាពគេហទំព័រ មុនពេលអ្នកអាចចូលគណនី និងប្រើសេវាកម្មបាន។ សូមព្យាយាមម្ដងទៀតនៅពេលក្រោយ។"
          : "This version of the site needs a configuration update before sign-in and online services can work. Please try again later."}</p>
        <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground">
          {khmer ? "ផ្ទុកឡើងវិញ" : "Reload page"}
        </button>
      </section>
    </main>
  );
}
