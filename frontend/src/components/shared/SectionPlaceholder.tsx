interface SectionPlaceholderProps {
  title: string;
  description: string;
}

const SectionPlaceholder = ({
  title,
  description,
}: SectionPlaceholderProps) => {
  return (
    <section className="rounded-3xl border border-brand-line bg-white p-6 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            EDUOVA
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-navy">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
        <div className="rounded-2xl bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy">
          Module Ready
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-brand-mist p-4">
          <p className="text-sm text-slate-500">Workflow status</p>
          <p className="mt-2 text-lg font-semibold text-brand-navy">Scaffolded</p>
        </div>
        <div className="rounded-2xl bg-brand-mist p-4">
          <p className="text-sm text-slate-500">API integration</p>
          <p className="mt-2 text-lg font-semibold text-brand-navy">Connect endpoints</p>
        </div>
        <div className="rounded-2xl bg-brand-mist p-4">
          <p className="text-sm text-slate-500">UI state</p>
          <p className="mt-2 text-lg font-semibold text-brand-navy">Ready for expansion</p>
        </div>
      </div>
    </section>
  );
};

export default SectionPlaceholder;
