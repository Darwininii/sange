import PageHeader from '../../hooks/PageHeader'
import CustomBadge from '../../shared/CustomBadge'
import AppButton from '../../shared/AppButton'

function StatCard({ stat }) {
  return (
    <article className="rounded-3xl bg-surface p-6 shadow-sm shadow-black/20 ring-1 ring-border">
      <p className="text-sm font-medium text-foreground/55">{stat.label}</p>
      <strong className="mt-3 block font-display text-3xl font-semibold text-foreground">
        {stat.value}
      </strong>
      <span className="mt-2 block text-sm text-primary">{stat.detail}</span>
    </article>
  )
}

function ModuleCard({ module }) {
  return (
    <article className="rounded-3xl border border-border bg-surface p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-black/30">
      <h3 className="font-display text-xl font-semibold text-foreground">
        {module.title}
      </h3>
      <p className="mt-3 leading-7 text-foreground/60">{module.description}</p>
      <AppButton className="mt-6" variant="dark" effect="zoomIn" size="sm">
        Abrir modulo
      </AppButton>
    </article>
  )
}

function RoleDashboard({ dashboard }) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={dashboard.title} />

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {dashboard.stats.map((stat) => (
          <StatCard stat={stat} key={stat.label} />
        ))}
      </section>

      <section className="mt-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Modulos disponibles
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-foreground">
              Accesos del rol
            </h2>
          </div>
          <CustomBadge color="white" label="Control de acceso por rol" />
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {dashboard.modules.map((module) => (
            <ModuleCard module={module} key={module.title} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default RoleDashboard
