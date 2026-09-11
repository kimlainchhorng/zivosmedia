import { useEffect, useState } from 'react';
import { CardReadError } from '@/lib/walletCardRead';
import { useI18n } from '@/hooks/useI18n';

export function WalletReadRecovery({ error, pending, retry }: { error: unknown; pending: boolean; retry: () => void }) {
  const { currentLanguage } = useI18n();
  const km = currentLanguage === 'km';
  const [now, setNow] = useState(Date.now);
  const limited = error instanceof CardReadError && error.kind === 'rate-limited';
  const denied = error instanceof CardReadError && ['unauthorized', 'forbidden'].includes(error.kind);
  const retryAt = limited ? error.retryAt : 0;
  useEffect(() => {
    if (retryAt <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [retryAt]);
  const waiting = pending || retryAt > now;
  return <div role="status" className="rounded-2xl border border-border bg-card p-5 space-y-3">
    <p className="font-semibold">{limited ? km ? 'សូមរង់ចាំបន្តិច' : 'Please wait a moment' : km ? 'មិនអាចផ្ទុកកាតបានទេ' : 'Cards could not be loaded'}</p>
    <p className="text-sm text-muted-foreground">{denied
      ? km ? 'សូមចូលគណនីម្ដងទៀតដើម្បីមើលកាតរបស់អ្នក។' : 'Please sign in again to access your cards.'
      : limited ? km ? 'សូមរង់ចាំបន្តិច រួចព្យាយាមម្ដងទៀត។ កាបូបរបស់អ្នកនៅតែអាចប្រើបាន។' : 'Wait briefly, then retry. You can still use the rest of your wallet.'
      : km ? 'សូមព្យាយាមម្ដងទៀត។ ព័ត៌មានកាបូបផ្សេងទៀតនៅតែមាននៅទីនេះ។' : 'Try again. The rest of your wallet remains available here.'}</p>
    {denied ? <a href="/login" className="inline-flex min-h-11 items-center font-semibold underline">{km ? 'ចូលគណនី' : 'Sign in'}</a>
      : <button type="button" onClick={retry} disabled={waiting} className="min-h-11 rounded-xl border px-4 font-semibold disabled:opacity-50">{waiting ? km ? 'សូមរង់ចាំ…' : 'Please wait…' : km ? 'ព្យាយាមម្ដងទៀត' : 'Retry'}</button>}
  </div>;
}
