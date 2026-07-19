import { useEffect, useMemo } from 'react'
import { BsFillPrinterFill } from 'react-icons/bs'
import { MdSimCardDownload } from "react-icons/md";
import AppButton from './AppButton'
import { downloadPdfBytes, printPdfBytes } from './buildOrderServicePdf'

function OrderPdfViewer({ pdfBytes, filename }) {
  const previewUrl = useMemo(() => {
    const copy = new Uint8Array(pdfBytes)
    return URL.createObjectURL(
      new Blob([copy], { type: 'application/pdf' }),
    )
  }, [pdfBytes])

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-surface px-3 py-2">
        <p className="text-xs text-foreground/60">
          Vista previa del documento PDF
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <AppButton
            type="button"
            size="sm"
            variant="outline"
            leftIcon={MdSimCardDownload}
            onClick={() => downloadPdfBytes(pdfBytes, filename)}
          >
            Descargar
          </AppButton>
          <AppButton
            type="button"
            size="sm"
            variant="outline"
            leftIcon={BsFillPrinterFill}
            onClick={() => printPdfBytes(pdfBytes)}
          >
            Imprimir
          </AppButton>
        </div>
      </div>

      <iframe
        title={filename}
        src={`${previewUrl}#toolbar=1&navpanes=0`}
        className="h-[min(65svh,680px)] w-full border-0 bg-white"
      />
    </div>
  )
}

export default OrderPdfViewer
