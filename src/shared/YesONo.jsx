import AppDialog from '@/shared/dialog'
import ConfirmActions from '@/shared/ConfirmActions'

function YesONo({
  open,
  title,
  description,
  isSubmitting = false,
  confirmLabel = 'Si',
  cancelLabel = 'No',
  onConfirm,
  onOpenChange,
}) {
  return (
    <AppDialog open={open} title={title} onOpenChange={onOpenChange}>
      <div className="mt-5 grid gap-5">
        <div className="rounded-3xl bg-emerald-500/10 px-5 py-4 text-sm text-emerald-800 dark:text-emerald-200">
          <p className="font-bold">¿Estás seguro que quieres hacer esta acción?</p>
          {description ? <p className="mt-2">{description}</p> : null}
        </div>
        <ConfirmActions
          variant="dialog"
          cancelLabel={cancelLabel}
          confirmLabel={confirmLabel}
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange?.(false)}
          onConfirm={onConfirm}
        />
      </div>
    </AppDialog>
  )
}

export default YesONo
