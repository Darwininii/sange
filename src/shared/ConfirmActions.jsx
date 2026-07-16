import AppButton from './AppButton'
import { cn } from '@/lib/utils'

const variants = {
  dialog: {
    cancel:
      'border-x border-y-2 border-border bg-transparent text-foreground/70 hover:bg-surface hover:font-black',
    confirm: '',
    confirmVariant: 'success',
    cancelEffect: 'zoomIn',
    confirmEffect: 'zoomIn',
    className: 'flex justify-end gap-3',
  },
  form: {
    cancel:
      'border-border bg-transparent text-red-500 hover:bg-red-500/10 hover:text-red-600',
    confirm: 'shadow-lg shadow-red-600/30',
    confirmVariant: 'danger',
    cancelEffect: undefined,
    confirmEffect: undefined,
    className: 'flex flex-wrap items-center gap-3',
  },
}

function ConfirmActions({
  variant = 'form',
  cancelLabel = 'Cancelar',
  confirmLabel = 'Confirmar',
  isSubmitting = false,
  onCancel,
  onConfirm,
  className,
}) {
  const styles = variants[variant] ?? variants.form

  return (
    <div className={cn(styles.className, className)}>
      <AppButton
        variant="outline"
        effect={styles.cancelEffect}
        disabled={isSubmitting}
        className={styles.cancel}
        onClick={onCancel}
      >
        {cancelLabel}
      </AppButton>
      <AppButton
        variant={styles.confirmVariant}
        effect={styles.confirmEffect}
        className={styles.confirm}
        isLoading={isSubmitting}
        onClick={onConfirm}
      >
        {confirmLabel}
      </AppButton>
    </div>
  )
}

export default ConfirmActions
