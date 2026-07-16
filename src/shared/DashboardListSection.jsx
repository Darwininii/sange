import PageHeader from '../hooks/PageHeader'
import AppButton from './AppButton'

const CREATE_BUTTON_CLASS =
  'bg-[#1a2340] font-black text-white hover:bg-gray-950 dark:bg-primary/90 dark:text-black'

function DashboardListSection({
  title,
  sectionTitle,
  description,
  createLabel,
  onCreate,
  actions = null,
  children,
  footer = null,
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={title} />

      <section className="mt-8 rounded-4xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl font-semibold text-foreground">
              {sectionTitle}
            </h3>
            <p className="mt-1 text-sm text-foreground/55">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {actions}
            <AppButton
              effect="zoomIn"
              className={CREATE_BUTTON_CLASS}
              onClick={onCreate}
            >
              {createLabel}
            </AppButton>
          </div>
        </div>

        <div className="mt-6">{children}</div>
      </section>

      {footer}
    </div>
  )
}

export default DashboardListSection
