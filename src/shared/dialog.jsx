import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@/components/animate-ui/primitives/headless/dialog'
import Close from '@/shared/Close'

function AppDialog({
  open,
  onOpenChange,
  title,
  children,
  className = '',
  hideCloseButton = false,
}) {
  const transition = {
    duration: open ? 0.2 : 0,
    ease: 'easeInOut',
  }

  return (
    <Dialog open={open} onClose={onOpenChange}>
      <DialogBackdrop
        transition={transition}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
        <DialogPanel
          transition={transition}
          className={`relative max-h-[calc(100svh-4rem)] w-full max-w-xl overflow-y-auto rounded-4xl bg-surface p-6 shadow-2xl shadow-black/40 ring-1 ring-border ${className}`}
        >
          <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
            <DialogTitle className="font-display text-2xl font-semibold text-foreground">
              {title}
            </DialogTitle>
            {!hideCloseButton ? (
              <Close
                aria-label="Cerrar dialog"
                tooltip="Cerrar"
                onClick={() => onOpenChange(false)}
              />
            ) : null}
          </div>
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export default AppDialog
