import toast from 'react-hot-toast'
import ToastCard from '@/hooks/ToastCard'

export const TOAST_TIMEOUT = 4000
export const TOAST_MAX_VISIBLE = 3

function pushToast(message, options = {}, variant = 'default') {
  const {
    description,
    duration = variant === 'loading' ? Infinity : TOAST_TIMEOUT,
    id,
    isLoading = false,
  } = options

  return toast.custom(
    (t) => (
      <ToastCard
        message={message}
        description={description}
        variant={variant === 'loading' ? 'default' : variant}
        isLoading={isLoading || variant === 'loading'}
        visible={t.visible}
        onClose={() => toast.dismiss(t.id)}
      />
    ),
    {
      duration,
      id,
    },
  )
}

function show(message, options = {}) {
  return pushToast(message, options, options.variant ?? 'default')
}

function success(message, options = {}) {
  return pushToast(message, options, 'success')
}

function danger(message, options = {}) {
  return pushToast(message, options, 'danger')
}

function warning(message, options = {}) {
  return pushToast(message, options, 'warning')
}

function info(message, options = {}) {
  return pushToast(message, options, 'accent')
}

async function promise(promiseOrFn, options = {}) {
  const run = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn

  const loadingId = pushToast(
    options.loading ?? 'Procesando...',
    {
      duration: Infinity,
      isLoading: true,
    },
    'loading',
  )

  try {
    const data = await run
    toast.dismiss(loadingId)

    const successMessage =
      typeof options.success === 'function' ? options.success(data) : options.success

    success(successMessage ?? 'Operacion completada.')
    return data
  } catch (error) {
    toast.dismiss(loadingId)

    const errorMessage =
      typeof options.error === 'function'
        ? options.error(error)
        : options.error ??
          (error instanceof Error ? error.message : 'Ocurrio un error inesperado.')

    danger(errorMessage)
    throw error
  }
}

const appToast = {
  show,
  success,
  danger,
  warning,
  info,
  promise,
  close: toast.dismiss,
  clear: () => toast.dismiss(),
}

export default appToast
