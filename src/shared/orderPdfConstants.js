export const ORDER_PDF_COMPANY = {
  name: 'Sange',
  nit: '900000000-0',
  address: 'BOGOTÁ D.C. COLOMBIA',
  phones: '—',
  web: 'www.sange.app',
  city: 'BOGOTÁ D.C. COLOMBIA',
  systemName: 'SANGE',
}

export const EMPTY_PART_ROW = {
  quantity: '',
  part: '',
  description: '',
  delivery: '',
}

export function createEmptyParts(count = 3) {
  return Array.from({ length: count }, () => ({ ...EMPTY_PART_ROW }))
}

export function formatPdfDate(value = new Date()) {
  if (value == null || value === '') {
    return 'YYYY/MM/DD'
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'YYYY/MM/DD'
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}/${month}/${day}`
}

/** Formats an HTML date input (YYYY-MM-DD) for the PDF slip. */
export function formatFormDateForPdf(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return 'YYYY/MM/DD'

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    return `${match[1]}/${match[2]}/${match[3]}`
  }

  return formatPdfDate(raw)
}

function normalizeParts(parts) {
  const rows = Array.isArray(parts) ? parts : []
  const normalized = rows.slice(0, 3).map((row) => ({
    quantity: String(row?.quantity ?? '').trim(),
    part: String(row?.part ?? '').trim(),
    description: String(row?.description ?? '').trim(),
    delivery: String(row?.delivery ?? '').trim(),
  }))

  while (normalized.length < 3) {
    normalized.push({ ...EMPTY_PART_ROW })
  }

  return normalized
}

export function buildOrderPdfData({
  form,
  orderNumber = '',
  technicianName = '',
  generatedBy = '',
  createdAt = null,
}) {
  return {
    orderNumber: orderNumber ? String(orderNumber) : '',
    documentNumber: form?.documentNumber?.trim() || '',
    date: formatPdfDate(createdAt || new Date()),
    clientName: form?.clientName?.trim() || '',
    clientPhone: form?.clientPhone?.trim() || '',
    deliveryDate: formatFormDateForPdf(form?.deliveryDate),
    repairDate: formatFormDateForPdf(form?.repairDate),
    purchaseDate: formatFormDateForPdf(form?.purchaseDate),
    device: form?.device?.trim() || '',
    brand: form?.brand?.trim() || '',
    model: form?.model?.trim() || '',
    serialNumber: form?.serialNumber?.trim() || '',
    serviceType: form?.serviceType || '',
    serviceCondition: form?.serviceCondition || '',
    technicianName: technicianName?.trim() || '',
    symptom: form?.symptom?.trim() || '',
    diagnosis: form?.diagnosis?.trim() || '',
    parts: normalizeParts(form?.parts),
    generatedBy: generatedBy?.trim() || '',
    generatedAt: formatPdfDate(new Date()),
  }
}
