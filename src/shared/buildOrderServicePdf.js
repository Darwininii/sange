import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import {
  SERVICE_CONDITION_LABELS,
  SERVICE_TYPE_LABELS,
} from './orderConstants'
import { ORDER_PDF_COMPANY } from './orderPdfConstants'

const PAGE = { width: 612, height: 792 }
const MARGIN_X = 28
const MARGIN_Y = 18
const CUT_GAP = 14

const INK = rgb(0, 0, 0)
const HEADER_FILL = rgb(0.72, 0.84, 0.93)
const SECTION_FILL = rgb(0.12, 0.22, 0.38)
const WHITE = rgb(1, 1, 1)
const RULE = rgb(0.45, 0.45, 0.45)

function textOr(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function wrapText(text, font, size, maxWidth) {
  const raw = String(text ?? '').trim()
  if (!raw) return []

  const words = raw.split(/\s+/)
  const lines = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word
  }

  if (current) lines.push(current)
  return lines
}

function drawText(page, text, x, y, font, size, color = INK) {
  if (!text) return
  page.drawText(String(text), { x, y, size, font, color })
}

function drawLine(page, x1, y1, x2, y2, thickness = 0.6, color = INK) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness,
    color,
  })
}

function drawRect(page, x, y, width, height, { fill, border = INK, borderWidth = 0.75 } = {}) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: border,
    borderWidth,
    color: fill,
  })
}

function drawCell(page, fonts, cell) {
  const {
    x,
    y,
    width,
    height,
    label = '',
    value = '',
    header = false,
    align = 'left',
    valueSize = 7.5,
    labelSize = 6.5,
    fill,
  } = cell

  drawRect(page, x, y, width, height, {
    fill: fill ?? (header ? HEADER_FILL : undefined),
  })

  const padX = 3
  const contentWidth = width - padX * 2

  if (header) {
    const labelWidth = fonts.bold.widthOfTextAtSize(label, labelSize)
    const labelX =
      align === 'center' ? x + (width - labelWidth) / 2 : x + padX
    drawText(
      page,
      label,
      labelX,
      y + height / 2 - labelSize / 2.5,
      fonts.bold,
      labelSize,
    )
    return
  }

  if (label) {
    drawText(page, label, x + padX, y + height - 9, fonts.bold, labelSize)
  }

  const lines = wrapText(value, fonts.regular, valueSize, contentWidth)
  const startY = label ? y + height - 20 : y + height - 12
  const maxLines = Math.max(
    1,
    Math.floor((label ? height - 14 : height - 6) / (valueSize + 1.2)),
  )

  lines.slice(0, maxLines).forEach((line, index) => {
    drawText(
      page,
      line,
      x + padX,
      startY - index * (valueSize + 1.2),
      fonts.regular,
      valueSize,
    )
  })
}

function drawSectionBar(page, fonts, x, y, width, height, title) {
  drawRect(page, x, y, width, height, { fill: SECTION_FILL })
  const titleWidth = fonts.bold.widthOfTextAtSize(title, 8)
  drawText(
    page,
    title,
    x + (width - titleWidth) / 2,
    y + height / 2 - 3,
    fonts.bold,
    8,
    WHITE,
  )
}

function normalizeParts(parts) {
  const rows = Array.isArray(parts) ? parts : []
  const maxRows = 12
  const minRows = 3
  const normalized = rows.slice(0, maxRows).map((row) => ({
    quantity: textOr(row?.quantity),
    part: textOr(row?.part),
    description: textOr(row?.description),
    delivery: textOr(row?.delivery),
  }))

  while (normalized.length < minRows) {
    normalized.push({ quantity: '', part: '', description: '', delivery: '' })
  }

  return normalized
}

function drawSlip(page, fonts, data, bounds, copyLabel) {
  const { left, right, top, bottom } = bounds
  const width = right - left
  let cursor = top

  const serviceType =
    SERVICE_TYPE_LABELS[data.serviceType] || data.serviceType || ''
  const condition =
    SERVICE_CONDITION_LABELS[data.serviceCondition] ||
    data.serviceCondition ||
    ''

  // Outer page frame for this slip
  drawRect(page, left, bottom, width, top - bottom, { borderWidth: 1 })

  const innerLeft = left + 4
  const innerRight = right - 4
  const innerWidth = innerRight - innerLeft
  cursor -= 6

  // Header: company + meta
  const headerH = 52
  const metaW = innerWidth * 0.34
  const brandW = innerWidth - metaW

  drawText(page, ORDER_PDF_COMPANY.name.toUpperCase(), innerLeft, cursor - 14, fonts.bold, 14)
  drawText(page, `NIT: ${ORDER_PDF_COMPANY.nit}`, innerLeft, cursor - 25, fonts.regular, 7)
  drawText(page, `Dirección: ${ORDER_PDF_COMPANY.address}`, innerLeft, cursor - 34, fonts.regular, 7)
  drawText(page, `Teléfonos: ${ORDER_PDF_COMPANY.phones}`, innerLeft, cursor - 43, fonts.regular, 7)
  drawText(page, `Web: ${ORDER_PDF_COMPANY.web}`, innerLeft, cursor - 52, fonts.regular, 7)

  const metaX = innerLeft + brandW + 4
  drawText(page, `Nro. ${textOr(data.orderNumber, '')}`, metaX, cursor - 12, fonts.bold, 10)
  drawText(page, 'Doc Referencia', metaX, cursor - 24, fonts.bold, 8)
  drawText(page, textOr(data.documentNumber), metaX, cursor - 34, fonts.regular, 8)
  drawText(page, `Fecha: ${textOr(data.date, 'YYYY/MM/DD')}`, metaX, cursor - 44, fonts.regular, 8)
  drawText(page, ORDER_PDF_COMPANY.city, metaX, cursor - 54, fonts.bold, 7)

  cursor -= headerH + 4

  // Client section
  drawSectionBar(
    page,
    fonts,
    innerLeft,
    cursor - 14,
    innerWidth,
    14,
    'INFORMACIÓN DEL CLIENTE',
  )
  cursor -= 14

  const clientH = 28
  drawCell(page, fonts, {
    x: innerLeft,
    y: cursor - clientH,
    width: innerWidth,
    height: clientH,
    value: [
      textOr(data.clientName),
      data.documentNumber ? `Doc: ${data.documentNumber}` : '',
      data.clientPhone ? `Tel: ${data.clientPhone}` : '',
    ]
      .filter(Boolean)
      .join('   '),
    valueSize: 8,
  })
  cursor -= clientH

  // Dates row
  const dateH = 16
  const dateW = innerWidth / 3
  ;[
    ['Fecha Entrega:', data.deliveryDate],
    ['Fecha Reparación:', data.repairDate],
    ['Fecha Compra:', data.purchaseDate],
  ].forEach(([label, value], index) => {
    const x = innerLeft + index * dateW
    drawRect(page, x, cursor - dateH, dateW, dateH)
    drawText(page, label, x + 3, cursor - 11, fonts.bold, 7)
    const labelW = fonts.bold.widthOfTextAtSize(label, 7)
    drawText(
      page,
      textOr(value, 'YYYY/MM/DD'),
      x + 5 + labelW,
      cursor - 11,
      fonts.regular,
      7,
    )
  })
  cursor -= dateH

  // Equipment header + values (6 columns)
  const colW = innerWidth / 6
  const headH = 14
  const valH = 18
  const headers = [
    'Equipo',
    'Marca',
    'Servicio',
    'C. General',
    'Responsable',
    'Tipo Servicio',
  ]
  const values = [
    data.device,
    data.brand,
    serviceType,
    condition,
    data.technicianName,
    serviceType,
  ]

  headers.forEach((label, index) => {
    drawCell(page, fonts, {
      x: innerLeft + index * colW,
      y: cursor - headH,
      width: colW,
      height: headH,
      label,
      header: true,
      align: 'center',
    })
  })
  cursor -= headH

  values.forEach((value, index) => {
    drawCell(page, fonts, {
      x: innerLeft + index * colW,
      y: cursor - valH,
      width: colW,
      height: valH,
      value: textOr(value),
      valueSize: 7,
    })
  })
  cursor -= valH

  // Symptom / model / serial
  const midH = 28
  const symptomW = innerWidth * 0.5
  const modelW = innerWidth * 0.25
  const serialW = innerWidth - symptomW - modelW

  drawCell(page, fonts, {
    x: innerLeft,
    y: cursor - midH,
    width: symptomW,
    height: midH,
    label: 'Síntoma',
    value: textOr(data.symptom),
    valueSize: 7,
  })
  drawCell(page, fonts, {
    x: innerLeft + symptomW,
    y: cursor - midH,
    width: modelW,
    height: midH,
    label: 'Modelo',
    value: textOr(data.model),
    valueSize: 7,
  })
  drawCell(page, fonts, {
    x: innerLeft + symptomW + modelW,
    y: cursor - midH,
    width: serialW,
    height: midH,
    label: 'Serial',
    value: textOr(data.serialNumber),
    valueSize: 7,
  })
  cursor -= midH

  // Diagnosis
  const diagH = 32
  drawCell(page, fonts, {
    x: innerLeft,
    y: cursor - diagH,
    width: innerWidth,
    height: diagH,
    label: 'Diagnóstico',
    value: textOr(data.diagnosis),
    valueSize: 7,
  })
  cursor -= diagH

  // Parts table
  const partCols = [
    { key: 'part', label: 'Parte/Producto', w: innerWidth * 0.28 },
    { key: 'quantity', label: 'Cantidad', w: innerWidth * 0.12 },
    { key: 'description', label: 'Descripción', w: innerWidth * 0.4 },
    { key: 'delivery', label: 'Delivery', w: 0 },
  ]
  partCols[3].w = innerWidth - partCols[0].w - partCols[1].w - partCols[2].w

  const parts = normalizeParts(data.parts)
  const partHeadH = 13
  const availableForParts = Math.max(42, cursor - (bottom + 52))
  const partRowH = Math.max(
    10,
    Math.min(14, Math.floor((availableForParts - partHeadH) / parts.length)),
  )
  let xPos = innerLeft
  partCols.forEach((col) => {
    drawCell(page, fonts, {
      x: xPos,
      y: cursor - partHeadH,
      width: col.w,
      height: partHeadH,
      label: col.label,
      header: true,
      align: 'center',
    })
    xPos += col.w
  })
  cursor -= partHeadH

  parts.forEach((row) => {
    xPos = innerLeft
    partCols.forEach((col) => {
      drawCell(page, fonts, {
        x: xPos,
        y: cursor - partRowH,
        width: col.w,
        height: partRowH,
        value: textOr(row[col.key]),
        valueSize: 7,
      })
      xPos += col.w
    })
    cursor -= partRowH
  })

  cursor -= 8

  // Signatures
  const signW = (innerWidth - 12) / 2
  const signY = Math.max(bottom + 36, cursor - 40)

  ;[
    {
      title: 'Firma a conformidad del Cliente:',
      lines: ['C.C. No.', 'Fecha: YYYY/MM/DD'],
    },
    {
      title: 'Técnico:',
      lines: ['C.C. No.', 'Fecha: YYYY/MM/DD'],
    },
  ].forEach((block, index) => {
    const x = innerLeft + index * (signW + 12)
    drawText(page, block.title, x, signY + 26, fonts.regular, 7)
    drawLine(page, x, signY + 14, x + signW, signY + 14, 0.7)
    drawText(page, block.lines[0], x, signY + 2, fonts.regular, 7)
    drawText(page, block.lines[1], x, signY - 10, fonts.regular, 7)
  })

  // Footer meta
  const footerY = bottom + 16
  drawLine(page, innerLeft, footerY + 10, innerRight, footerY + 10, 0.5, RULE)
  drawText(
    page,
    `Generado por: ${textOr(data.generatedBy, '—')}`,
    innerLeft,
    footerY,
    fonts.regular,
    6.5,
  )
  const systemText = `Sistema: ${ORDER_PDF_COMPANY.systemName}`
  const systemW = fonts.bold.widthOfTextAtSize(systemText, 6.5)
  drawText(
    page,
    systemText,
    innerLeft + (innerWidth - systemW) / 2,
    footerY,
    fonts.bold,
    6.5,
  )
  const dateText = `Fecha: ${textOr(data.generatedAt, 'YYYY/MM/DD')}`
  const dateTextW = fonts.regular.widthOfTextAtSize(dateText, 6.5)
  drawText(page, dateText, innerRight - dateTextW, footerY, fonts.regular, 6.5)

  const copyW = fonts.bold.widthOfTextAtSize(copyLabel, 9)
  drawText(
    page,
    copyLabel,
    innerLeft + (innerWidth - copyW) / 2,
    bottom + 4,
    fonts.bold,
    9,
  )
}

/**
 * Builds a Letter PDF with Cliente + Empresa slips in Excel-like cells.
 * @returns {Promise<Uint8Array>}
 */
export async function buildOrderServicePdfBytes(data) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([PAGE.width, PAGE.height])
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  }

  const left = MARGIN_X
  const right = PAGE.width - MARGIN_X
  const top = PAGE.height - MARGIN_Y
  const bottom = MARGIN_Y
  const usable = top - bottom
  const slipHeight = (usable - CUT_GAP) / 2

  const slip1 = {
    left,
    right,
    top,
    bottom: top - slipHeight,
  }
  const slip2 = {
    left,
    right,
    top: slip1.bottom - CUT_GAP,
    bottom,
  }

  drawSlip(page, fonts, data, slip1, 'Cliente')

  const cutY = slip1.bottom - CUT_GAP / 2
  let x = left
  while (x < right) {
    const end = Math.min(x + 5, right)
    drawLine(page, x, cutY, end, cutY, 0.55, RULE)
    x = end + 3
  }

  drawSlip(page, fonts, data, slip2, 'Empresa')

  return pdfDoc.save()
}

export function orderPdfFilename(data) {
  const number = String(data?.orderNumber || 'borrador').replace(/\s+/g, '-')
  return `orden-servicio-${number}.pdf`
}

export function downloadPdfBytes(bytes, filename) {
  const copy = new Uint8Array(bytes)
  const blob = new Blob([copy], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function printPdfBytes(bytes) {
  const copy = new Uint8Array(bytes)
  const blob = new Blob([copy], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.setAttribute('title', 'Imprimir PDF')
  Object.assign(iframe.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '1px',
    height: '1px',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  })
  iframe.src = url
  document.body.appendChild(iframe)

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove()
      URL.revokeObjectURL(url)
    }, 60_000)
  }

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch (err) {
      console.error(err)
    } finally {
      cleanup()
    }
  }

  iframe.addEventListener('load', () => {
    window.setTimeout(triggerPrint, 250)
  })
}
