const dashboardMetrics = [
  { label: 'Active Students', value: '2,486' },
  { label: 'Staff On Duty', value: '184' },
  { label: 'Fee Collection', value: '$184,250' },
  { label: 'Attendance Rate', value: '96.4%' },
];

const DashboardPage = () => {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl bg-brand-navy px-8 py-10 text-white shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-gold">
          Dashboard
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Operational command center</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          Monitor key school performance indicators and route staff quickly into
          academic, financial and student service workflows.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-3xl border border-brand-line bg-white p-6 shadow-panel"
          >
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold text-brand-navy">
              {metric.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default DashboardPage;
