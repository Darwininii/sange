import AppDialog from '@/shared/dialog'
import AppButton from '@/shared/AppButton'

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
        <div className="flex justify-end gap-3">
          <AppButton
            variant="outline"
            effect="zoomIn"
            disabled={isSubmitting}
            className="border-x border-y-2 border-border bg-transparent text-foreground/70 hover:bg-surface hover:font-black"
            onClick={() => onOpenChange?.(false)}
          >
            {cancelLabel}
          </AppButton>
          <AppButton
            variant="success"
            effect="zoomIn"
            isLoading={isSubmitting}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AppButton>
        </div>
      </div>
    </AppDialog>
  )
}

export default YesONo
