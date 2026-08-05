import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { ORDER_PDF_COMPANY } from './orderPdfConstants'
import { downloadPdfBytes, printPdfBytes } from './buildOrderServicePdf'

const PAGE = { width: 612, height: 792 }
const MARGIN_X = 36
const INK = rgb(0.08, 0.12, 0.2)
const MUTED = rgb(0.35, 0.4, 0.48)
const LINE = rgb(0.78, 0.8, 0.84)
const HEADER = rgb(0.1, 0.22, 0.4)
const WHITE = rgb(1, 1, 1)
const ROW_ALT = rgb(0.96, 0.97, 0.98)

function money(value) {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateLong(dateKey) {
  const [year, month, day] = String(dateKey).split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function drawText(page, text, x, y, font, size, color = INK) {
  page.drawText(String(text ?? ''), { x, y, size, font, color })
}

function truncate(font, text, size, maxWidth) {
  const raw = String(text ?? '')
  if (font.widthOfTextAtSize(raw, size) <= maxWidth) {
    return raw
  }

  let next = raw
  while (next.length > 1 && font.widthOfTextAtSize(`${next}…`, size) > maxWidth) {
    next = next.slice(0, -1)
  }
  return `${next}…`
}

export async function buildCajaDailyPdfBytes({
  dateKey,
  movements = [],
  summary = {},
  closedByName = '',
  isClosed = false,
} = {}) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([PAGE.width, PAGE.height])
  let y = PAGE.height - 40

  const ensureSpace = (needed) => {
    if (y - needed > 48) {
      return
    }

    page = pdfDoc.addPage([PAGE.width, PAGE.height])
    y = PAGE.height - 40
    drawTableHeader()
  }

  const drawTableHeader = () => {
    const height = 22
    page.drawRectangle({
      x: MARGIN_X,
      y: y - height,
      width: PAGE.width - MARGIN_X * 2,
      height,
      color: HEADER,
    })
    drawText(page, 'Hora', MARGIN_X + 8, y - 15, fontBold, 8, WHITE)
    drawText(page, 'Descripcion', MARGIN_X + 70, y - 15, fontBold, 8, WHITE)
    drawText(page, 'Medio', MARGIN_X + 300, y - 15, fontBold, 8, WHITE)
    drawText(page, 'Valor', MARGIN_X + 400, y - 15, fontBold, 8, WHITE)
    drawText(page, 'Tipo', MARGIN_X + 490, y - 15, fontBold, 8, WHITE)
    y -= height + 4
  }

  drawText(page, ORDER_PDF_COMPANY.name.toUpperCase(), MARGIN_X, y, fontBold, 16, HEADER)
  y -= 18
  drawText(page, 'EXTRACTO DE CAJA DIARIO', MARGIN_X, y, fontBold, 12, INK)
  y -= 16
  drawText(page, formatDateLong(dateKey), MARGIN_X, y, font, 10, MUTED)
  y -= 14
  drawText(
    page,
    isClosed
      ? `Estado: CERRADA${closedByName ? ` · ${closedByName}` : ''}`
      : 'Estado: ABIERTA (preliminar)',
    MARGIN_X,
    y,
    font,
    9,
    MUTED,
  )
  y -= 18

  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE.width - MARGIN_X, y },
    thickness: 1,
    color: LINE,
  })
  y -= 16

  drawTableHeader()

  if (movements.length === 0) {
    drawText(
      page,
      'No hay movimientos registrados para este dia.',
      MARGIN_X + 8,
      y - 12,
      font,
      9,
      MUTED,
    )
    y -= 28
  } else {
    movements.forEach((row, index) => {
      ensureSpace(20)
      const height = 18
      if (index % 2 === 1) {
        page.drawRectangle({
          x: MARGIN_X,
          y: y - height,
          width: PAGE.width - MARGIN_X * 2,
          height,
          color: ROW_ALT,
          borderWidth: 0,
        })
      }

      const signed =
        row.kind === 'expense' ? `- ${money(row.amount)}` : money(row.amount)
      const tipo = row.kind === 'expense' ? 'Gasto' : 'Ingreso'

      drawText(page, formatTime(row.occurredAt), MARGIN_X + 8, y - 12, font, 8, INK)
      drawText(
        page,
        truncate(font, row.description, 8, 220),
        MARGIN_X + 70,
        y - 12,
        font,
        8,
        INK,
      )
      drawText(
        page,
        truncate(font, row.paymentTypeLabel || '—', 8, 80),
        MARGIN_X + 300,
        y - 12,
        font,
        8,
        INK,
      )
      drawText(page, signed, MARGIN_X + 400, y - 12, font, 8, INK)
      drawText(page, tipo, MARGIN_X + 490, y - 12, font, 8, INK)
      y -= height
    })
  }

  y -= 18
  ensureSpace(90)
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE.width - MARGIN_X, y },
    thickness: 1,
    color: LINE,
  })
  y -= 20

  drawText(page, 'RESUMEN DEL DIA', MARGIN_X, y, fontBold, 11, HEADER)
  y -= 18
  const lines = [
    ['Total ingresos', money(summary.incomeTotal)],
    ['Total gastos', money(summary.expenseTotal)],
    ['Neto del dia', money(summary.netTotal)],
    ['Efectivo', money(summary.cashTotal)],
    ['Banco / transferencias', money(summary.bankTotal)],
  ]

  for (const [label, value] of lines) {
    drawText(page, label, MARGIN_X, y, font, 9, MUTED)
    drawText(page, value, MARGIN_X + 180, y, fontBold, 9, INK)
    y -= 14
  }

  y -= 10
  drawText(
    page,
    `${ORDER_PDF_COMPANY.systemName} · Documento generado automaticamente`,
    MARGIN_X,
    36,
    font,
    8,
    MUTED,
  )

  return pdfDoc.save()
}

export function cajaDailyPdfFilename(dateKey) {
  return `extracto-caja-${dateKey}.pdf`
}

export { downloadPdfBytes, printPdfBytes }
