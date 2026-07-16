export const SERVICE_TYPE_OPTIONS = [
  { value: 'installation', label: 'Instalacion' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'review', label: 'Revision' },
]

export const SERVICE_CONDITION_OPTIONS = [
  { value: 'warranty', label: 'Garantia' },
  { value: 'billed', label: 'Facturado' },
  { value: 'installation', label: 'Instalacion' },
]

export const SERVICE_TYPE_LABELS = Object.fromEntries(
  SERVICE_TYPE_OPTIONS.map((option) => [option.value, option.label]),
)

export const SERVICE_CONDITION_LABELS = Object.fromEntries(
  SERVICE_CONDITION_OPTIONS.map((option) => [option.value, option.label]),
)

export const SERVICE_TYPE_COLORS = {
  installation: 'blue',
  maintenance: 'amber',
  review: 'green',
}

export const SERVICE_CONDITION_COLORS = {
  warranty: 'green',
  billed: 'amber',
  installation: 'blue',
}
