import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getConnectionMode, library, type Category, type DashboardSummary, type LibraryUser, type Playlist, type Resource, type ResourceFilters, type ResourceKind } from '@/lib/library';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { ArrowDownWideNarrow, ArrowLeft, ArrowRight, BookOpen, Clock3, FileText, GraduationCap, Heart, History, LibraryBig, ListMusic, LogIn, LogOut, Menu, Play, Plus, Search, Settings2, Sparkles, X } from 'lucide-react';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 25_000 } } });
const kindNames: Record<ResourceKind, string> = { book: 'Books', video: 'Lecture videos', pyq: 'Past papers' };
const kindLabel: Record<ResourceKind, string> = { book: 'Book', video: 'Video', pyq: 'Past paper' };
const kindPath: Record<ResourceKind, string> = { book: '/library/book', video: '/library/video', pyq: '/library/pyq' };
const qk = { dashboard: ['dashboard'], resources: (k: ResourceKind, f: ResourceFilters) => ['resources', k, f], categories: ['categories'], playlists: ['playlists'], favorites: ['favorites'], history: ['history'], user: ['user'], searches: ['searches'] };

function useAsync<T>(key: unknown[], fn: () => Promise<T>) { return useQuery({ queryKey: key, queryFn: fn }); }
function PageFrame({ children }: { children: ReactNode }) { return <main className="page-enter mx-auto w-full max-w-[1440px] px-5 pb-16 pt-7 sm:px-8 lg:px-12">{children}</main>; }
function PageHeading({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div>{eyebrow && <p className="mb-2 text-[11px] font-bold uppercase tracking-[.19em] text-muted-foreground">{eyebrow}</p>}<h1 className="font-display text-4xl leading-tight tracking-[-.035em] sm:text-[48px]" data-testid="heading-page">{title}</h1>{detail && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{detail}</p>}</div>{action}</div>;
}
function Loading({ label = 'Gathering your library…' }: { label?: string }) { return <div className="space-y-4" role="status" data-testid="status-loading"><span className="sr-only">{label}</span>{[1,2,3].map((i)=><div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/80"/>)}</div>; }
function ErrorState({ message = 'We could not load this just now.', retry }: { message?: string; retry?: () => void }) { return <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6" role="alert" data-testid="status-error"><p className="font-semibold">{message}</p><p className="mt-1 text-sm text-muted-foreground">Give it another try in a moment.</p>{retry && <button onClick={retry} className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" data-testid="button-retry">Try again</button>}</div>; }
function Empty({ title, body, children }: { title: string; body: string; children?: ReactNode }) { return <div className="rounded-3xl border border-dashed border-border bg-card/60 px-6 py-14 text-center" data-testid="status-empty"><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-secondary/50 text-primary"><LibraryBig size={21}/></div><h3 className="font-display text-2xl">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{body}</p>{children && <div className="mt-5">{children}</div>}</div>; }
function ActionButton({ children, onClick, className = '', type = 'button', testId, disabled }: { children: ReactNode; onClick?: () => void; className?: string; type?: 'button'|'submit'; testId: string; disabled?: boolean }) { return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 ${className}`}>{children}</button>; }

function getYouTubeEmbedUrl(sourceUrl: string, sourceType: string | null): string | null {
  if (sourceType?.toLowerCase() !== 'youtube') return null;
  const match = sourceUrl.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  const id = match?.[1] || (/^[a-zA-Z0-9_-]{11}$/.test(sourceUrl) ? sourceUrl : null);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
}

function ResourceCard({ resource, compact = false, onFavorite, favorite }: { resource: Resource; compact?: boolean; onFavorite?: (r: Resource) => void; favorite?: boolean }) {
  const icon = resource.kind === 'video' ? <Play size={17}/> : resource.kind === 'pyq' ? <FileText size={17}/> : <BookOpen size={17}/>;
  return <article className={`group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md ${compact ? 'flex min-h-[114px]' : ''}`} data-testid={`card-resource-${resource.kind}-${resource.id}`}>
    <Link href={`/resource/${resource.kind}/${resource.id}`} className={`block ${compact ? 'flex flex-1 items-center gap-4 p-4' : 'p-4'}`} data-testid={`link-resource-${resource.kind}-${resource.id}`}>
      <div className={`relative overflow-hidden rounded-xl ${compact ? 'h-[82px] w-[82px] shrink-0' : 'mb-4 aspect-[1.65]'} bg-[linear-gradient(135deg,#d9c398,#9bb3aa)]`}>
        {(resource.cover_url || resource.thumbnail_url) && <img src={resource.cover_url || resource.thumbnail_url || ''} alt="" className="h-full w-full object-cover"/>}
        {!resource.cover_url && !resource.thumbnail_url && <div className="absolute inset-0 flex items-center justify-center text-primary/75"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/50 bg-white/25 backdrop-blur-sm">{icon}</div></div>}
        <span className="absolute bottom-2 left-2 rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">{kindLabel[resource.kind]}</span>
      </div>
      <div className="min-w-0">
        <p className="mb-1 truncate text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{resource.category_name || resource.subject_name || 'In the library'}</p>
        <h3 className="line-clamp-2 font-display text-xl leading-snug">{resource.title}</h3>
        {!compact && <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{resource.description || `${resource.author ? `By ${resource.author}` : kindLabel[resource.kind]} · Open to explore this resource.`}</p>}
        {compact && <p className="mt-1 truncate text-xs text-muted-foreground">{resource.author || resource.course_code || resource.subject_name || 'Study resource'}</p>}
        <div className={`mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground ${compact ? 'hidden' : ''}`}>{resource.course_code && <span>{resource.course_code}</span>}{resource.publish_year && <span>· {resource.publish_year}</span>}</div>
      </div>
    </Link>
    {onFavorite && <button aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'} onClick={() => onFavorite(resource)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-border/70 bg-card/90 text-muted-foreground backdrop-blur transition hover:text-rose-600" data-testid={`button-favorite-${resource.kind}-${resource.id}`}><Heart size={17} fill={favorite ? 'currentColor' : 'none'} className={favorite ? 'text-rose-600' : ''}/></button>}
  </article>;
}
function ResourceGrid({ resources, isLoading, isError, onFavorite, favoriteIds }: { resources?: Resource[]; isLoading: boolean; isError: boolean; onFavorite?: (r: Resource) => void; favoriteIds?: Set<string> }) {
  if (isLoading) return <Loading/>;
  if (isError) return <ErrorState/>;
  if (!resources?.length) return <Empty title="A little room to grow" body="There are no resources here yet. Try another subject or check back soon."/>;
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{resources.map(r=><ResourceCard key={`${r.kind}-${r.id}`} resource={r} onFavorite={onFavorite} favorite={favoriteIds?.has(`${r.kind}:${r.id}`)}/>)}</div>;
}

function Shell({ children }: { children: ReactNode }) {
  const [path, setPath] = useLocation(); const { data: user } = useAsync<LibraryUser|null>(qk.user, () => library.getUser()); const [mobileNav, setMobileNav] = useState(false); const connectionMode = getConnectionMode();
  const canManage = user?.role === 'admin' || connectionMode === 'database';
  const nav = [{href:'/',label:'Home',icon:Sparkles},{href:'/library/video',label:'Lecture videos',icon:Play},{href:'/library/book',label:'Books',icon:BookOpen},{href:'/library/pyq',label:'Past papers',icon:FileText},{href:'/playlists',label:'Playlists',icon:ListMusic},{href:'/favorites',label:'Favorites',icon:Heart},{href:'/history',label:'Your history',icon:History},...(canManage?[{href:'/manage',label:'Manage library',icon:Settings2}]:[])];
  const signOut = async () => { await library.signOut(); await queryClient.invalidateQueries({queryKey:qk.user}); setPath('/'); };
  return <div className="app-noise min-h-[100dvh] bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-[hsl(var(--sidebar))] px-5 py-6 text-[hsl(var(--sidebar-foreground))] lg:flex">
      <Link href="/" className="mb-10 flex items-center gap-3 px-2" data-testid="link-brand"><img src={`${import.meta.env.BASE_URL}studyshelf-logo.svg`} alt="StudyShelf" className="h-11 w-11 rounded-xl"/><div><span className="font-display text-[21px] tracking-tight">StudyShelf</span><span className="block text-[10px] tracking-[.16em] text-white/50">YOUR STUDY SPACE</span></div></Link>
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-white/40">Explore</p><nav className="space-y-1">{nav.map(n=>{const active = n.href === '/' ? path === '/' : path.startsWith(n.href); const Icon=n.icon; return <Link key={n.href} href={n.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active?'bg-white/10 text-[hsl(var(--sidebar-primary))]':'text-white/75 hover:bg-white/5 hover:text-white'}`} data-testid={`nav-${n.label.toLowerCase().replaceAll(' ','-')}`}><Icon size={17}/>{n.label}</Link>;})}</nav>
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.04] p-4"><div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]"><GraduationCap size={18}/></div><p className="font-display text-lg">A calmer way to study.</p><p className="mt-1 text-xs leading-5 text-white/55">Keep the material you need close at hand.</p><Link href="/search" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--sidebar-primary))]" data-testid="link-browse-search">Find a resource <ArrowRight size={13}/></Link></div>
    </aside>
    <div className="lg:pl-[248px]">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-4 px-5 sm:px-8 lg:px-12">
          <button className="grid h-10 w-10 place-items-center rounded-full border border-border lg:hidden" onClick={()=>setMobileNav(!mobileNav)} aria-label="Toggle navigation" data-testid="button-mobile-menu">{mobileNav?<X size={18}/>:<Menu size={18}/>}</button>
          <Link href="/" className="flex shrink-0 items-center gap-2.5 lg:hidden" data-testid="link-brand-mobile"><img src={`${import.meta.env.BASE_URL}studyshelf-logo.svg`} alt="" className="h-9 w-9 rounded-lg"/><span className="font-display text-lg">StudyShelf</span></Link>
          <Link href="/search" className="flex h-10 max-w-[450px] flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground transition hover:border-primary/40" data-testid="link-search-header"><Search size={16}/><span className="flex-1">Search books, lectures, papers…</span><kbd className="hidden rounded-md bg-muted px-1.5 py-0.5 text-[10px] sm:inline">Explore</kbd></Link>
          <span className="hidden rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-semibold text-muted-foreground xl:inline" data-testid="badge-connection-mode">Shared database · browser saves</span>
          <div className="ml-auto flex items-center gap-2">{user ? <><span className="hidden text-sm text-muted-foreground sm:block">{user.name}</span><button onClick={signOut} aria-label="Sign out" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card hover:bg-muted" data-testid="button-sign-out"><LogOut size={17}/></button></> : <Link href="/auth" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="link-sign-in"><LogIn size={15}/> Sign in</Link>}</div>
        </div>
        {mobileNav && <nav className="grid grid-cols-2 gap-1 border-t border-border px-5 py-3 lg:hidden">{nav.map(n=>{const Icon=n.icon;return <Link key={n.href} href={n.href} onClick={()=>setMobileNav(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted" data-testid={`mobile-nav-${n.label.toLowerCase().replaceAll(' ','-')}`}><Icon size={16}/>{n.label}</Link>})}</nav>}
      </header>
      {children}
    </div>
  </div>;
}

function HomePage() {
  const {data: dashboard,isLoading,isError,refetch} = useAsync<DashboardSummary>(qk.dashboard,()=>library.getDashboard());
  const {data: favorites=[]} = useAsync<Resource[]>(qk.favorites,()=>library.listFavorites());
  const qc=useQueryClient(); const favMutation=useMutation({mutationFn:(r:Resource)=>library.toggleFavorite(r.kind,r.id),onSuccess:()=>qc.invalidateQueries({queryKey:qk.favorites})});
  return <PageFrame>
    <section className="relative mb-11 overflow-hidden rounded-[28px] bg-[hsl(var(--primary))] px-7 py-9 text-[hsl(var(--primary-foreground))] sm:px-11 sm:py-12">
      <div className="absolute -right-10 -top-20 h-72 w-72 rounded-full border border-white/10"/><div className="absolute -right-1 top-5 h-52 w-52 rounded-full border border-white/10"/><div className="absolute bottom-[-80px] right-[20%] h-52 w-52 rounded-full bg-[hsl(var(--secondary))]/10 blur-2xl"/>
      <div className="relative max-w-[700px]"><p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-white/75"><Sparkles size={13}/> Your learning, in one place</p><h1 className="font-display text-[42px] leading-[1.08] tracking-[-.04em] sm:text-[62px]">Make space for<br/><span className="text-[hsl(var(--secondary))]">what you’re learning.</span></h1><p className="mt-4 max-w-lg text-sm leading-6 text-white/70 sm:text-base">Lecture recordings, course books, and past papers. All the pieces of your study life, finally together.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/search" className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--secondary))] px-5 py-3 text-sm font-bold text-[hsl(var(--secondary-foreground))] transition hover:-translate-y-0.5" data-testid="link-hero-explore">Explore the library <ArrowRight size={16}/></Link><Link href="/playlists" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10" data-testid="link-hero-playlists">My study collections</Link></div></div>
      <div className="relative mt-9 grid max-w-[600px] grid-cols-3 border-t border-white/15 pt-5 sm:mt-12">{[['Books',dashboard?.total_books],['Lectures',dashboard?.total_videos],['Past papers',dashboard?.total_pyqs]].map(([label,value])=><div key={label as string}><p className="font-display text-2xl sm:text-3xl">{isLoading?'—':value ?? '—'}</p><p className="mt-1 text-xs text-white/55">{label}</p></div>)}</div>
      <div className="pointer-events-none absolute bottom-0 right-7 hidden h-[88%] w-[250px] items-end justify-center lg:flex"><div className="relative mb-[-20px] h-[250px] w-[200px] rotate-[-7deg] rounded-t-[90px] border border-white/10 bg-white/[.035]"><div className="absolute left-1/2 top-8 grid h-24 w-24 -translate-x-1/2 place-items-center rounded-full border border-white/10 bg-white/[.05]"><BookOpen size={38} strokeWidth={1}/></div><div className="absolute bottom-8 left-8 right-8 space-y-2"><div className="h-1 rounded-full bg-white/20"/><div className="h-1 w-3/4 rounded-full bg-white/15"/></div></div></div>
    </section>
    <div className="mb-10 grid gap-4 sm:grid-cols-3">{([{kind:'video',title:'Watch and learn',desc:'Pick up where your lectures left off.',count:dashboard?.total_videos,icon:<Play size={18}/>,tint:'bg-[#dfece6] text-[#446c5a]'}, {kind:'book',title:'Read at your pace',desc:'Your course books, all together.',count:dashboard?.total_books,icon:<BookOpen size={18}/>,tint:'bg-[#f3e8d3] text-[#80643b]'}, {kind:'pyq',title:'Practice with purpose',desc:'Get ready with papers from past years.',count:dashboard?.total_pyqs,icon:<FileText size={18}/>,tint:'bg-[#f1dfd7] text-[#895849]'}] as const).map(item=><Link key={item.kind} href={kindPath[item.kind]} className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md" data-testid={`card-category-${item.kind}`}><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${item.tint}`}>{item.icon}</span><span className="min-w-0 flex-1"><span className="block font-display text-xl">{item.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.desc}</span></span><span className="text-right"><span className="block text-lg font-semibold">{isLoading?'—':item.count ?? '—'}</span><span className="text-[10px] uppercase tracking-widest text-muted-foreground">items</span></span></Link>)}</div>
    {isError ? <ErrorState retry={()=>refetch()}/> : <>
      <section className="mb-11"><div className="mb-5 flex items-end justify-between"><div><p className="mb-1 text-[11px] font-bold uppercase tracking-[.17em] text-muted-foreground">Fresh in your space</p><h2 className="font-display text-3xl">Recently added</h2></div><Link href="/library/book" className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="link-recent-all">See library <ArrowRight size={15}/></Link></div>{isLoading?<Loading/>:<ResourceGrid resources={dashboard?.recent} isLoading={false} isError={false} onFavorite={(r)=>favMutation.mutate(r)} favoriteIds={new Set(favorites.map(f=>`${f.kind}:${f.id}`))}/>}</section>
      <section><div className="mb-5"><p className="mb-1 text-[11px] font-bold uppercase tracking-[.17em] text-muted-foreground">Loved by learners</p><h2 className="font-display text-3xl">Popular this week</h2></div>{isLoading?<Loading/>:<ResourceGrid resources={dashboard?.popular} isLoading={false} isError={false} onFavorite={(r)=>favMutation.mutate(r)} favoriteIds={new Set(favorites.map(f=>`${f.kind}:${f.id}`))}/>}</section>
    </>}
  </PageFrame>;
}

function LibraryPage({kind}: {kind:ResourceKind}) {
  const [query,setQuery]=useState(''); const [category,setCategory]=useState(''); const [semester,setSemester]=useState(''); const [course,setCourse]=useState(''); const [exam,setExam]=useState(''); const [sort,setSort]=useState<'newest'|'title'>('newest');
  const filters=useMemo<ResourceFilters>(()=>({query:query||undefined,categoryId:category?Number(category):undefined,semester:semester||undefined,courseCode:course||undefined,examType:exam||undefined,sort}),[query,category,semester,course,exam,sort]);
  const {data:resources,isLoading,isError,refetch}=useAsync<Resource[]>(qk.resources(kind,filters),()=>library.listResources(kind,filters));
  const {data:semesterResources=[]}=useAsync<Resource[]>(['semester-options',kind],()=>library.listResources(kind));
  const semesters=useMemo(()=>Array.from(new Set(semesterResources.map(r=>r.semester).filter((value):value is string=>Boolean(value)))).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),[semesterResources]);
  const {data:categories=[]}=useAsync<Category[]>(qk.categories,()=>library.listCategories(kind));
  const {data:favorites=[]}=useAsync<Resource[]>(qk.favorites,()=>library.listFavorites()); const qc=useQueryClient();
  const favorite=useMutation({mutationFn:(r:Resource)=>library.toggleFavorite(r.kind,r.id),onSuccess:()=>qc.invalidateQueries({queryKey:qk.favorites})});
  return <PageFrame><PageHeading eyebrow="The library" title={kindNames[kind]} detail={kind==='pyq'?'Practice with real exam papers and find the patterns that matter.':kind==='video'?'A home for your lectures, explainers, and course recordings.':'Keep your course reading close and easy to find.'} action={<span className="rounded-full bg-secondary/40 px-3 py-1.5 text-xs font-semibold">{resources?.length ?? '—'} resources</span>}/>
    <form className="mb-7 rounded-2xl border border-border bg-card p-4" onSubmit={e=>e.preventDefault()}><div className="flex flex-col gap-3 lg:flex-row"><label className="relative flex min-h-11 flex-1 items-center"><Search size={17} className="absolute left-3.5 text-muted-foreground"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search ${kindNames[kind].toLowerCase()}…`} className="h-11 w-full rounded-full border border-input bg-background pl-10 pr-4 text-sm outline-none focus:border-ring" aria-label="Search library" data-testid="input-library-search"/></label><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><select aria-label="Category" value={category} onChange={e=>setCategory(e.target.value)} className="h-11 rounded-full border border-input bg-background px-3 text-sm" data-testid="select-category"><option value="">All subjects</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select aria-label="Semester" value={semester} onChange={e=>setSemester(e.target.value)} className="h-11 rounded-full border border-input bg-background px-3 text-sm" data-testid="select-semester"><option value="">All semesters</option>{semesters.map(value=><option key={value} value={value}>{value}</option>)}</select>{kind==='pyq'&&<input value={exam} onChange={e=>setExam(e.target.value)} placeholder="Exam type" className="h-11 rounded-full border border-input bg-background px-3 text-sm" data-testid="input-exam-type"/>}{kind==='pyq'&&<input value={course} onChange={e=>setCourse(e.target.value)} placeholder="Course code" className="h-11 rounded-full border border-input bg-background px-3 text-sm" data-testid="input-course-code"/>}<label className="relative flex items-center"><ArrowDownWideNarrow size={14} className="absolute left-3 text-muted-foreground"/><select value={sort} onChange={e=>setSort(e.target.value as 'newest'|'title')} className="h-11 w-full rounded-full border border-input bg-background pl-8 pr-3 text-sm" aria-label="Sort resources" data-testid="select-sort"><option value="newest">Newest</option><option value="title">Title A–Z</option></select></label></div></div></form>
    {isError?<ErrorState retry={()=>refetch()}/>:<ResourceGrid resources={resources} isLoading={isLoading} isError={false} onFavorite={r=>favorite.mutate(r)} favoriteIds={new Set(favorites.map(f=>`${f.kind}:${f.id}`))}/>}
  </PageFrame>;
}

function DetailPage() {
  const params=useParams<{kind:string;id:string}>(); const kind=params.kind as ResourceKind; const id=Number(params.id); const qc=useQueryClient();
  const valid=['book','video','pyq'].includes(kind)&&Number.isFinite(id);
  const {data:resource,isLoading,isError,refetch}=useAsync<Resource|null>(['resource',kind,id],()=>library.getResource(kind,id));
  const {data:favorites=[]}=useAsync<Resource[]>(qk.favorites,()=>library.listFavorites()); const isFav=favorites.some(r=>r.kind===kind&&r.id===id);
  const fav=useMutation({mutationFn:()=>library.toggleFavorite(kind,id),onSuccess:()=>qc.invalidateQueries({queryKey:qk.favorites})});
  useEffect(()=>{if(valid&&resource) library.recordHistory(kind,id).then(()=>qc.invalidateQueries({queryKey:qk.history})).catch(()=>{});},[valid,resource?.id,kind,id,qc]);
  if(!valid)return <PageFrame><ErrorState message="This resource address is not valid."/></PageFrame>;
  if(isLoading)return <PageFrame><Loading/></PageFrame>;
  if(isError)return <PageFrame><ErrorState retry={()=>refetch()}/></PageFrame>;
  if(!resource)return <PageFrame><Empty title="Resource not found" body="It may have moved or is no longer available."><Link href={kindPath[kind]} className="text-sm font-semibold underline">Back to {kindNames[kind]}</Link></Empty></PageFrame>;
  const primary=kind==='video'?'Watch lecture':kind==='pyq'?'View paper pages':'Open reading';
  const target=resource.source_url || resource.file_urls?.[0] || '';
  const videoEmbedUrl = kind === 'video' ? getYouTubeEmbedUrl(target, resource.source_type) : null;
  return <PageFrame><Link href={kindPath[kind]} className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="link-back-library"><ArrowLeft size={16}/> Back to {kindNames[kind]}</Link>
    <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_330px]">
       <div><div className="mb-7 flex min-h-[300px] items-center justify-center overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#d9c398,#88a99f)] p-8 text-primary/80 sm:min-h-[420px]">{videoEmbedUrl?<iframe src={videoEmbedUrl} title={resource.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="h-full min-h-[300px] w-full rounded-2xl bg-black sm:min-h-[420px]"/>:<div className="grid h-28 w-28 place-items-center rounded-[28px] border border-white/60 bg-white/25 backdrop-blur"><span className="scale-[2]">{kind==='video'?<Play/>:kind==='book'?<BookOpen/>:<FileText/>}</span></div>}</div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[.17em] text-muted-foreground">{resource.category_name || resource.subject_name || kindLabel[kind]}</p><h1 className="font-display text-4xl leading-tight tracking-[-.025em] sm:text-5xl" data-testid="text-resource-title">{resource.title}</h1><p className="mt-3 text-sm text-muted-foreground">{[resource.author,resource.course_code,resource.publish_year,resource.semester].filter(Boolean).join(' · ')}</p>
        <div className="prose prose-stone mt-7 max-w-none text-foreground"><p className="whitespace-pre-wrap leading-7 text-muted-foreground">{resource.description || 'A useful addition to your study collection. Open the source to explore the material.'}</p></div>
         {resource.tags?.length>0&&<div className="mt-6 flex flex-wrap gap-2">{resource.tags.map(tag=><span key={tag} className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">{tag}</span>)}</div>}
         {kind==='pyq'&&resource.file_urls.length>0&&<section className="mt-8 rounded-2xl border border-border bg-card p-5"><h2 className="font-display text-2xl">Paper files</h2><div className="mt-3 flex flex-wrap gap-2">{resource.file_urls.map((url,index)=><a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted" data-testid={`link-paper-file-${index+1}`}><FileText size={15}/>Open paper {index+1}<ArrowRight size={14}/></a>)}</div></section>}
        {kind==='book'&&resource.total_pages&&<p className="mt-5 text-sm text-muted-foreground">{resource.preview_pages?`${resource.preview_pages} page preview · `:''}{resource.total_pages} pages</p>}
      </div>
       <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-muted-foreground">Ready when you are</p><h2 className="mt-2 font-display text-2xl">{kind==='video'?'Pick up a new idea.':kind==='pyq'?'See what you know.':'Find your next page.'}</h2>{target?<a href={target} target="_blank" rel="noreferrer" className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground" data-testid="link-resource-open">{primary}<ArrowRight size={16}/></a>:<p className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">A source link is not available for this item yet.</p>}<ActionButton onClick={()=>fav.mutate()} testId="button-resource-favorite" className={`mt-3 w-full border ${isFav?'border-rose-300 bg-rose-50 text-rose-700':'border-border bg-background text-foreground'}`}><Heart size={16} fill={isFav?'currentColor':'none'}/>{isFav?'Saved to favorites':'Save to favorites'}</ActionButton><div className="mt-5 border-t border-border pt-4 text-xs leading-6 text-muted-foreground"><p className="flex justify-between"><span>Type</span><span className="font-semibold text-foreground">{kindLabel[kind]}</span></p>{resource.language&&<p className="flex justify-between"><span>Language</span><span className="font-semibold text-foreground">{resource.language}</span></p>}{resource.view_count>0&&<p className="flex justify-between"><span>Study sessions</span><span className="font-semibold text-foreground">{resource.view_count}</span></p>}</div></aside>
    </div>
  </PageFrame>;
}

function CollectionPage({which}: {which:'favorites'|'history'}) {
  const {data:resources,isLoading,isError,refetch}=useAsync<Resource[]>(which==='favorites'?qk.favorites:qk.history,()=>which==='favorites'?library.listFavorites():library.listHistory());
  return <PageFrame><PageHeading eyebrow="Your space" title={which==='favorites'?'Saved for later':'Recently visited'} detail={which==='favorites'?'A personal shelf for the resources you want to come back to.':'Pick up your studies right where you left off.'}/>{isError?<ErrorState retry={()=>refetch()}/>:resources?.length?<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{resources.map(r=><ResourceCard key={`${r.kind}-${r.id}`} resource={r} compact/>)}</div>:isLoading?<Loading/>:<Empty title={which==='favorites'?'Your shelf is waiting':'A fresh start'} body={which==='favorites'?'Tap the heart on any resource to keep it close.':'Resources you open will appear here so you can find your way back.'}><Link href="/library/book" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="link-empty-browse">Explore resources <ArrowRight size={15}/></Link></Empty>}</PageFrame>;
}

function SearchPage() {
  const [query,setQuery]=useState(''); const [kind,setKind]=useState<ResourceKind|'all'>('all'); const [submitted,setSubmitted]=useState(''); const qc=useQueryClient();
  const results=useQuery({queryKey:['search-results',submitted,kind],enabled:!!submitted,queryFn:async()=>{await library.saveSearch(submitted,kind);const kinds:ResourceKind[]=kind==='all'?['book','video','pyq']:[kind];const lists=await Promise.all(kinds.map(k=>library.listResources(k,{query:submitted})));await qc.invalidateQueries({queryKey:qk.searches});return lists.flat();}});
  const {data:history=[],isLoading:historyLoading,isError:historyError,refetch}=useAsync<Array<{query:string;created_at:string}>>(qk.searches,()=>library.listSearchHistory());
  const submit=(e:FormEvent)=>{e.preventDefault();const value=query.trim();if(value)setSubmitted(value);};
  return <PageFrame><PageHeading eyebrow="Find your next step" title="Search the space" detail="One search across course books, lectures, and past papers."/>
    <form onSubmit={submit} className="mb-8 flex flex-col gap-3 rounded-[24px] border border-border bg-card p-3 sm:flex-row"><label className="flex flex-1 items-center gap-3 px-3"><Search size={20} className="text-muted-foreground"/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try a subject, course code, or concept…" className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none" aria-label="Search all resources" data-testid="input-search-all"/></label><select value={kind} onChange={e=>setKind(e.target.value as ResourceKind|'all')} className="h-11 rounded-full border border-input bg-background px-4 text-sm" aria-label="Search type" data-testid="select-search-kind"><option value="all">Everything</option><option value="book">Books</option><option value="video">Lecture videos</option><option value="pyq">Past papers</option></select><ActionButton type="submit" testId="button-search" className="bg-primary text-primary-foreground"><Search size={16}/> Search</ActionButton></form>
    {submitted ? (
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">Results for “{submitted}”</h2>
          <button onClick={() => { setSubmitted(''); setQuery(''); }} className="text-sm text-muted-foreground underline" data-testid="button-clear-search">Clear search</button>
        </div>
        {results.isLoading ? <Loading/> : results.isError ? <ErrorState retry={() => results.refetch()}/> : <ResourceGrid resources={results.data} isLoading={false} isError={false}/>}
      </section>
    ) : (
      <section className="max-w-3xl">
        <div className="mb-4 flex items-center gap-2"><Clock3 size={16} className="text-muted-foreground"/><h2 className="font-display text-2xl">Your recent searches</h2></div>
        {historyError ? <ErrorState retry={() => refetch()}/> : historyLoading ? <Loading/> : history.length ? (
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {history.map((item, i) => <button key={`${item.query}-${i}`} onClick={() => { setQuery(item.query); setSubmitted(item.query); }} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm hover:bg-muted/60" data-testid={`button-recent-search-${i}`}><span className="flex items-center gap-3"><Search size={15} className="text-muted-foreground"/>{item.query}</span><ArrowRight size={15} className="text-muted-foreground"/></button>)}
          </div>
        ) : <Empty title="Your search story starts here" body="The things you look up will be easy to find again."/>}
      </section>
    )}
  </PageFrame>;
}

function PlaylistsPage() {
  const {data:playlists,isLoading,isError,refetch}=useAsync<Playlist[]>(qk.playlists,()=>library.listPlaylists());
  const [showCreate,setShowCreate]=useState(false); const [createError,setCreateError]=useState(''); const qc=useQueryClient();
  const create=useMutation({mutationFn:(input:{title:string;description:string;kind:'book'|'video'})=>library.createPlaylist({...input,is_public:true}),onSuccess:async()=>{setShowCreate(false);setCreateError('');await qc.invalidateQueries({queryKey:qk.playlists})},onError:e=>setCreateError(e instanceof Error?e.message:'Could not create the playlist.')});
  const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const fd=new FormData(e.currentTarget);const title=String(fd.get('title')||'').trim();if(!title){setCreateError('Give your playlist a title.');return}create.mutate({title,description:String(fd.get('description')||'').trim(),kind:String(fd.get('kind')||'video') as 'book'|'video'})};
  return <PageFrame><PageHeading eyebrow="Study collections" title="Playlists" detail="Thoughtful sequences of reading and watching, made for your study rhythm." action={<ActionButton onClick={()=>setShowCreate(!showCreate)} testId="button-create-playlist" className="bg-primary text-primary-foreground"><Plus size={16}/> New playlist</ActionButton>}/>
    {showCreate&&<form onSubmit={submit} className="mb-6 grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2" data-testid="form-create-playlist"><label className="text-sm font-semibold">Playlist title<input name="title" required maxLength={100} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 font-normal" placeholder="e.g. Week 4 revision" data-testid="input-playlist-title"/></label><label className="text-sm font-semibold">Collection type<select name="kind" className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 font-normal" data-testid="select-playlist-kind"><option value="video">Videos</option><option value="book">Books</option></select></label><label className="text-sm font-semibold sm:col-span-2">Description<textarea name="description" rows={2} className="mt-1.5 w-full rounded-xl border border-input bg-background p-3 font-normal" placeholder="What are you collecting these for?" data-testid="input-playlist-description"/></label>{createError&&<p role="alert" className="text-sm text-destructive sm:col-span-2" data-testid="status-playlist-error">{createError}</p>}<div className="flex gap-2 sm:col-span-2"><ActionButton type="submit" disabled={create.isPending} testId="button-save-playlist" className="bg-primary text-primary-foreground">{create.isPending?'Creating…':'Create playlist'}</ActionButton><ActionButton onClick={()=>setShowCreate(false)} testId="button-cancel-playlist" className="bg-muted">Cancel</ActionButton></div></form>}
    {isError?<ErrorState retry={()=>refetch()}/>:isLoading?<Loading/>:playlists?.length?<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{playlists.map(p=><Link href={`/playlists/${p.id}`} key={p.id} className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-md" data-testid={`card-playlist-${p.id}`}><div className="relative flex aspect-[1.8] items-center justify-center bg-[linear-gradient(135deg,#d9c398,#94afa3)]">{p.thumbnail_url&&<img src={p.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover"/>}<span className="relative grid h-14 w-14 place-items-center rounded-full bg-background/85"><Play size={21}/></span><span className="absolute bottom-3 left-3 rounded-full bg-background/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">{p.kind} collection</span></div><div className="p-5"><h2 className="font-display text-2xl">{p.title}</h2><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description || 'A curated collection for a little more focus.'}</p><div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{p.item_count} {p.item_count===1?'resource':'resources'}</span><span className="flex items-center gap-1 font-semibold text-foreground">Open <ArrowRight size={14}/></span></div></div></Link>)}</div>:<Empty title="No collections just yet" body="Playlists will gather useful resources into a sequence that makes sense for your next study session."/>}</PageFrame>;
}
function PlaylistDetail() {
  const params=useParams<{id:string}>(); const id=Number(params.id); const {data:detail,isLoading,isError,refetch}=useAsync<{playlist:Playlist;items:Resource[]}|null>(['playlist',id],()=>library.getPlaylist(id));
  const qc=useQueryClient(); const [selected,setSelected]=useState(''); const [addError,setAddError]=useState('');
  const {data:candidates=[]}=useAsync<Resource[]>(['playlist-candidates',detail?.playlist.kind],()=>detail?library.listResources(detail.playlist.kind):Promise.resolve([]));
  const add=useMutation({mutationFn:()=>library.addPlaylistItem(id,detail!.playlist.kind,Number(selected)),onSuccess:async()=>{setSelected('');setAddError('');await qc.invalidateQueries({queryKey:['playlist',id]});await qc.invalidateQueries({queryKey:qk.playlists})},onError:e=>setAddError(e instanceof Error?e.message:'Could not add this resource.')});
  const remove=useMutation({mutationFn:(resourceId:number)=>library.removePlaylistItem(id,resourceId),onSuccess:async()=>{await qc.invalidateQueries({queryKey:['playlist',id]});await qc.invalidateQueries({queryKey:qk.playlists})}});
  let content: ReactNode;
  if (isLoading) content = <Loading/>;
  else if (isError) content = <ErrorState retry={() => refetch()}/>;
  else if (!detail) content = <Empty title="Collection not found" body="This study collection is no longer available."><Link href="/playlists" className="underline">All playlists</Link></Empty>;
  else content = <>
    <Link href="/playlists" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground" data-testid="link-playlist-back"><ArrowLeft size={16}/> All playlists</Link>
    <PageHeading eyebrow={`${detail.playlist.kind} collection · ${detail.playlist.item_count} resources`} title={detail.playlist.title} detail={detail.playlist.description || 'A curated collection for your next study session.'}/>
    <form onSubmit={e=>{e.preventDefault();if(selected)add.mutate()}} className="mb-6 flex max-w-3xl flex-col gap-2 rounded-2xl border border-border bg-card p-3 sm:flex-row" data-testid="form-playlist-add"><select aria-label="Choose a resource to add" value={selected} onChange={e=>setSelected(e.target.value)} className="h-11 min-w-0 flex-1 rounded-full border border-input bg-background px-4 text-sm" data-testid="select-playlist-resource"><option value="">Add a {detail.playlist.kind}…</option>{candidates.filter(c=>!detail.items.some(r=>r.id===c.id)).map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select><ActionButton type="submit" disabled={!selected||add.isPending} testId="button-add-playlist-item" className="bg-primary text-primary-foreground"><Plus size={15}/> Add resource</ActionButton></form>
    {addError&&<p role="alert" className="mb-4 max-w-3xl text-sm text-destructive" data-testid="status-playlist-add-error">{addError}</p>}
    {detail.items.length ? <div className="max-w-3xl space-y-3">{detail.items.map((r,i)=><div className="flex items-center gap-3" key={`${r.kind}-${r.id}`}><span className="w-7 text-center font-mono text-xs text-muted-foreground">{String(i+1).padStart(2,'0')}</span><div className="flex-1"><ResourceCard resource={r} compact/></div><button onClick={()=>{if(window.confirm(`Remove “${r.title}” from this playlist?`))remove.mutate(r.playlist_item_id ?? r.id)}} aria-label={`Remove ${r.title}`} className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-destructive" data-testid={`button-remove-playlist-item-${r.id}`}><X size={15}/></button></div>)}</div> : <Empty title="This collection is still taking shape" body="Add resources from the menu above to build your playlist."/>}
  </>;
  return <PageFrame>{content}</PageFrame>;
}

function AuthPage() {
  return <PageFrame>
    <section className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-7 sm:p-10">
      <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Accounts</p>
      <h1 className="font-display text-3xl">No account needed</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        The shared library is open to browse. Favorites, history, and playlists are saved only in this browser; account sign-in is not enabled.
      </p>
      <Link href="/" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground" data-testid="link-auth-home">Back to the library</Link>
    </section>
  </PageFrame>;
}

function ManagePage() {
  const [kind, setKind] = useState<ResourceKind>("book");
  const { data: resources, isLoading, isError, refetch } = useAsync<Resource[]>(
    ["manage-resources", kind],
    () => library.listResources(kind),
  );
  const { data: categories = [] } = useAsync<Category[]>(qk.categories, () => library.listCategories());

  return <PageFrame>
    <PageHeading eyebrow="Database records" title="Manage the library" detail="This is a read-only view of the shared library."/>
    <div role="status" className="mb-6 rounded-xl border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
      Add or edit shared resources in the Replit Database pane: <code className="font-semibold text-foreground">public.library_resources</code>. Set <code className="font-semibold text-foreground">status</code> to <code className="font-semibold text-foreground">published</code> to show a record in the app.
    </div>
    <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4">
      {(["book", "video", "pyq"] as ResourceKind[]).map((value) => (
        <button key={value} onClick={() => setKind(value)} className={`rounded-full px-4 py-2 text-sm font-semibold ${kind === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`} data-testid={`button-manage-kind-${value}`}>
          {kindNames[value]}
        </button>
      ))}
    </div>
    <section className="mb-10">
      <h2 className="mb-4 font-display text-2xl">{kindNames[kind]}</h2>
      {isError ? <ErrorState retry={() => refetch()}/> : isLoading ? <Loading/> : resources?.length ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {resources.map((resource) => (
            <div key={resource.id} className="grid gap-2 border-b border-border px-4 py-4 last:border-0 sm:grid-cols-[1fr_130px_110px] sm:items-center" data-testid={`row-manage-resource-${resource.id}`}>
              <div>
                <p className="font-semibold">{resource.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{resource.category_name || "Uncategorized"}{resource.author ? ` · ${resource.author}` : ""}</p>
              </div>
              <span className="w-fit rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">{resource.status}</span>
              <span className="text-xs text-muted-foreground">{resource.course_code || kindLabel[kind]}</span>
            </div>
          ))}
        </div>
      ) : <Empty title="No published resources" body="Add a row to public.library_resources and set its status to published."/>}
    </section>
    <section className="rounded-2xl border border-border bg-card p-5">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Resource categories</p>
      <h2 className="mb-4 font-display text-2xl">Categories</h2>
      {categories.length ? <div className="flex flex-wrap gap-2">
        {categories.map((category) => <span key={category.id} className="rounded-full bg-muted px-3 py-2 text-sm" data-testid={`chip-category-${category.id}`}>{category.name}</span>)}
      </div> : <p className="text-sm text-muted-foreground">Categories are derived from resource records.</p>}
    </section>
  </PageFrame>;
}

function RoutedErrorBoundary({children}:{children:ReactNode}) { const [location]=useLocation(); return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }
function AppRoutes() {
  return <Shell><RoutedErrorBoundary><Switch>
    <Route path="/" component={HomePage}/>
    <Route path="/library/:kind">{params=>['book','video','pyq'].includes(params.kind)?<LibraryPage kind={params.kind as ResourceKind}/>:<NotFoundPage/>}</Route>
    <Route path="/resource/:kind/:id" component={DetailPage}/>
    <Route path="/playlists" component={PlaylistsPage}/>
    <Route path="/playlists/:id" component={PlaylistDetail}/>
    <Route path="/favorites">{()=> <CollectionPage which="favorites"/>}</Route>
    <Route path="/history">{()=> <CollectionPage which="history"/>}</Route>
    <Route path="/search" component={SearchPage}/>
    <Route path="/auth" component={AuthPage}/>
    <Route path="/manage" component={ManagePage}/>
    <Route component={NotFoundPage}/>
  </Switch></RoutedErrorBoundary></Shell>;
}
function NotFoundPage(){return <PageFrame><Empty title="This page wandered off" body="The link may have changed. Let’s get you back to the good stuff."><Link href="/" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="link-not-found-home"><ArrowLeft size={15}/> Go home</Link></Empty></PageFrame>}
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/,'')}><AppRoutes/></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>; }
export default App;
