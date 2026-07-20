export const dashboardByRole = {
  admin: {
    title: 'Panel de administracion',
    description: 'Control total de ordenes, usuarios, caja, inventario y reportes.',
    stats: [
      { label: 'Ordenes activas', value: '128', detail: '14 nuevas hoy' },
      { label: 'Ingresos del dia', value: '$4.2M', detail: 'Caja abierta' },
      { label: 'Piezas en inventario', value: '—', detail: 'Ver modulo Inventario' },
    ],
    modules: [
      {
        title: 'Gestion de usuarios',
        description: 'Crear usuarios, asignar roles y revisar permisos.',
      },
      {
        title: 'Ordenes de servicio',
        description: 'Consultar, editar y cerrar ordenes por multiples criterios.',
      },
      {
        title: 'Inventario completo',
        description: 'Registrar entradas, salidas, precios y remisiones.',
      },
      {
        title: 'Caja y finanzas',
        description: 'Corregir abonos, consultar ingresos, gastos y cierres.',
      },
      {
        title: 'Historial de actividades',
        description: 'Revisar acciones realizadas por usuarios y filtrar por perfil.',
      },
    ],
  },
  cashier: {
    title: 'Panel de caja y recepcion',
    description: 'Creacion de ordenes, registro de pagos y cierre operativo de caja.',
    stats: [
      { label: 'Ordenes creadas', value: '24', detail: 'Turno actual' },
      { label: 'Abonos recibidos', value: '$1.8M', detail: 'Pendiente por cerrar' },
      { label: 'Clientes atendidos', value: '37', detail: '8 nuevos' },
    ],
    modules: [
      {
        title: 'Crear orden',
        description: 'Buscar o registrar cliente, equipo, serie y tipo de servicio.',
      },
      {
        title: 'Pagos y abonos',
        description: 'Registrar pagos asociados a ordenes sin modificar registros guardados.',
      },
      {
        title: 'Cierre de caja',
        description: 'Preparar reporte diario para revision administrativa.',
      },
      {
        title: 'Busqueda de ordenes',
        description: 'Encontrar ordenes por numero interno, externo o cedula.',
      },
    ],
  },
  technician: {
    title: 'Panel tecnico',
    description: 'Seguimiento de ordenes, notas de servicio y consulta de piezas.',
    stats: [
      { label: 'Ordenes asignadas', value: '18', detail: '5 en revision' },
      { label: 'Notas registradas', value: '46', detail: 'Semana actual' },
      { label: 'Piezas consultadas', value: '12', detail: 'Disponibilidad validada' },
    ],
    modules: [
      {
        title: 'Ordenes existentes',
        description: 'Ver ordenes, estados y antecedentes del servicio.',
      },
      {
        title: 'Notas y bitacora',
        description: 'Agregar observaciones tecnicas visibles para todo el equipo.',
      },
      {
        title: 'Consulta de inventario',
        description: 'Ver disponibilidad de piezas antes de solicitarlas.',
      },
      {
        title: 'Nueva orden tecnica',
        description: 'Crear ordenes sin modificar valores financieros ni catalogos.',
      },
    ],
  },
}
