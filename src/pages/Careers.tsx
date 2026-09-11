import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { useI18n } from '@/hooks/useI18n';
import { supabase } from '@/integrations/supabase/client';

export default function Careers() {
  const { currentLanguage } = useI18n();
  const km = currentLanguage === 'km';
  const id = useRef(crypto.randomUUID());
  const submitting = useRef(false);
  const [state,setState] = useState<'idle'|'sending'|'sent'|'error'>('idle');
  const field = 'min-h-11 w-full rounded-xl border bg-background px-3 py-2 text-base';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current) return;
    submitting.current = true; setState('sending');
    const data = new FormData(event.currentTarget);
    try {
      const { data: result, error } = await supabase.functions.invoke('media-operations', { body: {
        action:'apply', id:id.current, full_name:data.get('full_name'), contact:data.get('contact'),
        employment_type:data.get('employment_type'), availability:data.get('availability'), experience:data.get('experience'),
        consent:data.get('consent') === 'on', website:data.get('website'),
      }});
      if (error || result?.accepted !== true || result?.id !== id.current) throw new Error('Application not confirmed');
      setState('sent');
    } catch { setState('error'); } finally { submitting.current = false; }
  }
  return <div className="min-h-screen bg-background text-foreground">
    <SEOHead title={km ? 'ការងារជាមួយ ZIVO នៅភ្នំពេញ' : 'Jobs in Phnom Penh | ZIVO'} description={km ? 'ចូលរួមជាមួយ ZIVO នៅទួលគោក ភ្នំពេញ។ ការងារពេញម៉ោង និងក្រៅម៉ោង។' : 'Join ZIVO in Toul Kork, Phnom Penh. Full-time and part-time opportunities. Apply online or contact our hiring team on Telegram.'} canonical="https://zivosmedia.com/jobs" />
    <Header />
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-safe-header">
      <div className="py-10"><p className="mb-3 font-semibold text-primary">{km ? 'ទួលគោក · ភ្នំពេញ · កម្ពុជា' : 'Toul Kork · Phnom Penh · Cambodia'}</p><h1 className="text-4xl font-bold sm:text-5xl">{km ? 'ចូលរួមជាមួយក្រុម ZIVO' : 'Build your future with ZIVO'}</h1><p className="mt-5 max-w-2xl text-lg text-muted-foreground">{km ? 'យើងកំពុងទទួលពាក្យសម្រាប់ការងារពេញម៉ោង និងក្រៅម៉ោងនៅទួលគោក។ ទាក់ទងក្រុមការងាររបស់យើងសម្រាប់មុខតំណែង និងកាលវិភាគ។' : 'We are accepting applications for full-time and part-time work in Toul Kork. Contact our hiring team for role details and schedules.'}</p><a href="https://t.me/Zivo_Media" target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground">{km ? 'ដាក់ពាក្យតាម Telegram' : 'Apply on Telegram'}</a></div>
      <div className="mb-10 grid gap-4 sm:grid-cols-2">{['full-time','part-time'].map(type => <article key={type} className="rounded-2xl border p-6"><h2 className="text-xl font-semibold">{type === 'full-time' ? km ? 'ការងារពេញម៉ោង' : 'Full-time opportunities' : km ? 'ការងារក្រៅម៉ោង' : 'Part-time opportunities'}</h2><p className="mt-2 text-muted-foreground">{type === 'full-time' ? km ? 'ប្រាក់ខែ $250 ក្នុងមួយខែ' : '$250 per month' : km ? 'សូមទាក់ទងសម្រាប់ម៉ោងធ្វើការ និងប្រាក់ឈ្នួល។' : 'Ask the hiring team about hours and pay.'}</p><p className="mt-3 text-sm">{km ? 'ទីតាំង៖ ទួលគោក ភ្នំពេញ' : 'Location: Toul Kork, Phnom Penh'}</p></article>)}</div>
      <section aria-labelledby="apply-title" className="rounded-2xl border p-5 sm:p-8"><h2 id="apply-title" className="mb-5 text-2xl font-semibold">{km ? 'ផ្ញើពាក្យស្នើសុំរបស់អ្នក' : 'Send your application'}</h2>
        {state === 'sent' ? <div role="status"><p className="font-semibold">{km ? 'ពាក្យស្នើសុំរបស់អ្នកត្រូវបានទទួល។' : 'Your application has been received.'}</p><p className="mt-2 text-muted-foreground">{km ? 'ក្រុមការងារនឹងពិនិត្យព័ត៌មានរបស់អ្នក។ អ្នកក៏អាចទាក់ទងតាម Telegram បាន។' : 'Our team will review your details. You can also contact us on Telegram.'}</p><p className="mt-3 break-all text-xs">{km ? 'លេខយោង៖' : 'Reference:'} {id.current}</p></div> : <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1"><span>{km ? 'ឈ្មោះពេញ' : 'Full name'}</span><input name="full_name" autoComplete="name" required minLength={2} maxLength={100} className={field} /></label>
          <label className="block space-y-1"><span>{km ? 'អ៊ីមែល លេខទូរសព្ទ ឬឈ្មោះ Telegram' : 'Email, phone number, or @Telegram username'}</span><input name="contact" required minLength={5} maxLength={160} className={field} /></label>
          <label className="block space-y-1"><span>{km ? 'ប្រភេទការងារ' : 'Working time'}</span><select name="employment_type" className={field}><option value="full-time">{km ? 'ពេញម៉ោង' : 'Full-time'}</option><option value="part-time">{km ? 'ក្រៅម៉ោង' : 'Part-time'}</option></select></label>
          <label className="block space-y-1"><span>{km ? 'ពេលដែលអាចចាប់ផ្តើម និងម៉ោងទំនេរ' : 'When can you start, and what hours are you available?'}</span><input name="availability" required minLength={2} maxLength={300} className={field} /></label>
          <label className="block space-y-1"><span>{km ? 'បទពិសោធន៍ ឬមុខតំណែងដែលអ្នកចាប់អារម្មណ៍ (ស្រេចចិត្ត)' : 'Experience or roles you are interested in (optional)'}</span><textarea name="experience" rows={4} maxLength={1500} className={field} /></label>
          <div aria-hidden="true" className="hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" name="consent" required className="mt-1 h-5 w-5 shrink-0" /><span>{km ? 'ខ្ញុំយល់ព្រមឱ្យ ZIVO រក្សាទុកពាក្យស្នើសុំនេះ និងទាក់ទងខ្ញុំអំពីការងារ។' : 'I agree that ZIVO may store this application and contact me about employment.'} <Link to="/legal/privacy" className="underline">{km ? 'គោលការណ៍ឯកជនភាព' : 'Privacy policy'}</Link></span></label>
          {state === 'error' && <p role="alert" className="text-sm text-destructive">{km ? 'មិនទាន់អាចបញ្ជាក់ការទទួលពាក្យបានទេ។ ព័ត៌មានរបស់អ្នកនៅទីនេះ។ សូមព្យាយាមម្ដងទៀត ឬប្រើ Telegram។' : 'We could not confirm your application. Your details are still here. Try again or apply on Telegram.'}</p>}
          <button type="submit" disabled={state === 'sending'} className="min-h-12 rounded-xl bg-primary px-6 font-semibold text-primary-foreground disabled:opacity-60">{state === 'sending' ? km ? 'កំពុងផ្ញើ…' : 'Sending…' : km ? 'ផ្ញើពាក្យស្នើសុំ' : 'Send application'}</button>
        </form>}
      </section>
    </main><Footer />
  </div>;
}
