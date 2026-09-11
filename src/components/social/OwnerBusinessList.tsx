import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/hooks/useI18n';
import { BUSINESS_PAGE_SIZE, useOwnerBusinessPage } from '@/hooks/useOwnerBusinessPage';
import { resolveBusinessDashboardRoute } from '@/lib/business/dashboardRoute';

export default function OwnerBusinessList() {
  const { user } = useAuth();
  const { currentLanguage } = useI18n();
  const km = currentLanguage === 'km';
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  useEffect(() => { setInput(''); setSearch(''); setPage(0); }, [user?.id]);
  useEffect(() => { const id = setTimeout(() => { setSearch(input); setPage(0); }, 250); return () => clearTimeout(id); }, [input]);
  const result = useOwnerBusinessPage(user?.id, search, page);
  if (!user) return null;
  const total = result.data?.total ?? 0;
  return <section className="space-y-2 px-3" aria-label={km ? 'អាជីវកម្មរបស់អ្នក' : 'Your business pages'}>
    <h2 className="text-xs font-semibold text-muted-foreground">{km ? 'អាជីវកម្មរបស់អ្នក' : 'Your business pages'}</h2>
    <input type="search" value={input} onChange={e => setInput(e.target.value)} maxLength={80} aria-label={km ? 'ស្វែងរកអាជីវកម្មរបស់អ្នក' : 'Search your businesses'} placeholder={km ? 'ស្វែងរកអាជីវកម្ម' : 'Search businesses'} className="min-h-11 w-full rounded-lg border bg-background px-3 text-sm" />
    {result.isPending ? <p role="status" className="text-sm">{km ? 'កំពុងផ្ទុក…' : 'Loading…'}</p> : result.isError ? <div role="alert" className="text-sm"><p>{km ? 'មិនអាចផ្ទុកអាជីវកម្មបាន។' : 'Business pages could not load.'}</p><button className="min-h-11 underline" disabled={result.isFetching} onClick={() => void result.refetch()}>{km ? 'ព្យាយាមម្ដងទៀត' : 'Retry'}</button></div> : <>
      {result.data?.rows.map(store => {
        const unfinished = !store.name || ['Untitled Store','Untitled page'].includes(store.name);
        return <button type="button" key={store.id} className="flex min-h-11 w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-muted/50" onClick={() => { const target = resolveBusinessDashboardRoute(store.category, store.id); if (target.externalUrl) window.location.assign(target.externalUrl); else navigate(target.path); }}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary" aria-hidden="true">{unfinished ? '!' : store.name?.charAt(0)}</span>
          <span className="min-w-0"><span className="block truncate text-sm font-medium">{unfinished ? km ? 'រៀបចំអាជីវកម្ម' : 'Setup' : store.name}</span><span className="block truncate text-xs text-muted-foreground">{unfinished ? km ? 'បញ្ចប់ការរៀបចំ' : 'Finish setup' : store.category}</span></span>
        </button>;
      })}
      {total === 0 && <p className="text-sm text-muted-foreground">{km ? 'រកមិនឃើញអាជីវកម្មទេ។' : 'No matching business pages.'}</p>}
      {total > 0 && <div className="flex items-center justify-between gap-1 text-xs"><button className="min-h-11 px-1 disabled:opacity-40" disabled={page === 0} onClick={() => setPage(p => p - 1)}>{km ? 'មុន' : 'Previous'}</button><span aria-live="polite">{Math.min(page * BUSINESS_PAGE_SIZE + 1,total)}–{Math.min((page + 1) * BUSINESS_PAGE_SIZE,total)} / {total}</span><button className="min-h-11 px-1 disabled:opacity-40" disabled={(page + 1) * BUSINESS_PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>{km ? 'បន្ទាប់' : 'Next'}</button></div>}
    </>}
    <Link to="/business/new?new=1" className="flex min-h-11 items-center text-sm font-medium text-primary">{km ? 'បន្ថែមអាជីវកម្ម' : 'Add business'}</Link>
  </section>;
}
