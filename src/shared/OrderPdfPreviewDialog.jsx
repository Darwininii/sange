import { useEffect, useState } from 'react'
import AppDialog from './dialog'
import OrderPdfViewer from './OrderPdfViewer'
import {
  buildOrderServicePdfBytes,
  orderPdfFilename,
} from './buildOrderServicePdf'

function OrderPdfPreviewBody({ data }) {
  const [pdfBytes, setPdfBytes] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const filename = orderPdfFilename(data)

  useEffect(() => {
    let cancelled = false

    buildOrderServicePdfBytes(data)
      .then((bytes) => {
        if (cancelled) return
        setPdfBytes(bytes)
        setError('')
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setPdfBytes(null)
        setError('No se pudo generar el PDF de la orden.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // Generate once when the dialog opens (this body mounts with open=true).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [])

  return (
    <>
      <p className="mt-3 text-sm text-foreground/60">
        Documento PDF real generado desde los datos de la orden. Puedes
        imprimirlo o descargarlo desde la barra del visor.
      </p>

      <div className="mt-4">
        {loading ? (
          <div className="flex h-[min(65svh,680px)] items-center justify-center rounded-2xl bg-neutral-200 text-sm text-foreground/60 dark:bg-neutral-800">
            Generando PDF…
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {!loading && !error && pdfBytes ? (
          <OrderPdfViewer
            key={filename}
            pdfBytes={pdfBytes}
            filename={filename}
          />
        ) : null}
      </div>
    </>
  )
}

function OrderPdfPreviewDialog({ open, onOpenChange, data }) {
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Vista previa del PDF"
      className="max-w-5xl overflow-hidden"
    >
      {open ? <OrderPdfPreviewBody data={data} /> : null}
    </AppDialog>
  )
}

export default OrderPdfPreviewDialog
