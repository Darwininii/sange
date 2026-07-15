|     |     |     | Listado |                    | de  | Requerimientos     |     |             |         |     |     |
| --- | --- | --- | ------- | ------------------ | --- | ------------------ | --- | ----------- | ------- | --- | --- |
|     |     |     | Sistema | de Gesti(cid:243)n |     | de (cid:211)rdenes |     | de Servicio | TØcnico |     |     |
Basado en entrevista con usuario del sistema anterior (SalomØ / Catalina)
|     |     |     |     |     |     | July 2, | 2026 |     |     |     |     |
| --- | --- | --- | --- | --- | --- | ------- | ---- | --- | --- | --- | --- |
Introducci(cid:243)n
Estedocumentorecopilalosrequerimientosfuncionalesidenti(cid:28)cadosapartirdeunaentrevistasobre
el uso de un sistema previo de gesti(cid:243)n de (cid:243)rdenes de servicio tØcnico. El objetivo es servir como base
| para | plantear       | la estrategia | de  | desarrollo | de  | una nueva | plataforma. |     |     |     |     |
| ---- | -------------- | ------------- | --- | ---------- | --- | --------- | ----------- | --- | --- | --- | --- |
| 1    | Requerimientos |               |     | Generales  |     |           |             |     |     |     |     |
(cid:136)
RG-01: Elsistemadebeseraccesiblemedianteunenlaceweb(accesoremotopornavegador).
(cid:136)
RG-02: El acceso debe requerir autenticaci(cid:243)n por usuario y contraseæa individual.
(cid:136)
RG-03: Cada usuario debe tener un per(cid:28)l con permisos diferenciados (roles).
(cid:136)
RG-04: Debe existir un rol de administrador con acceso total al sistema.
| 2   | Gesti(cid:243)n | de  | Usuarios |          | y Roles |     |     |     |     |     |     |
| --- | --------------- | --- | -------- | -------- | ------- | --- | --- | --- | --- | --- | --- |
|     | Rol             |     |          | Permisos |         |     |     |     |     |     |     |
Administrador Acceso completo: crear/editar modelos y series, eliminar o
|     |     |     |     | modi(cid:28)car | abonos | y        | pagos,   | ver  | inventario | completo,              | ver gastos |
| --- | --- | --- | --- | --------------- | ------ | -------- | -------- | ---- | ---------- | ---------------------- | ---------- |
|     |     |     |     | e ingresos,     |        | imprimir | y cerrar | caja | del        | d(cid:237)a, gestionar | todos los  |
|     |     |     |     | m(cid:243)dulos | del    | sistema. |          |      |            |                        |            |
Cajero(a) / Recepci(cid:243)n Crear(cid:243)rdenes, agregarnotas, ingresarpagos(abonos)sinpoder
|     |     |     |     | modi(cid:28)carlos |     | una vez | guardados, |     | cambiar   | modelo          | y serie de un |
| --- | --- | --- | --- | ------------------ | --- | ------- | ---------- | --- | --------- | --------------- | ------------- |
|     |     |     |     | producto           | ya  | creado, | realizar   | el  | cierre de | caja operativo. |               |
TØcnico / Usuario Ver (cid:243)rdenes existentes, crear (cid:243)rdenes nuevas, agregar notas y
estÆndar observaciones, sin permisos para modi(cid:28)car valores (cid:28)nancieros
|     |                |     |          | ni crear | catÆlogos | (modelos/series). |     |     |     |     |     |
| --- | -------------- | --- | -------- | -------- | --------- | ----------------- | --- | --- | --- | --- | --- |
| 3   | M(cid:243)dulo | de  | Clientes |          |           |                   |     |     |     |     |     |
(cid:136)
|     | RC-01: | Buscar | cliente | existente | por | nœmero | de cØdula. |     |     |     |     |
| --- | ------ | ------ | ------- | --------- | --- | ------ | ---------- | --- | --- | --- | --- |
1

(cid:136)
RC-02: Crear un nuevo cliente si no existe en la base de datos, con los campos:
(cid:21) Nombre
(cid:21) CØdula
(cid:21) Direcci(cid:243)n
(cid:21) TelØfono
|     | (cid:21) Correo |     | electr(cid:243)nico |     |     |     |     |
| --- | --------------- | --- | ------------------- | --- | --- | --- | --- |
(cid:136)
RC-03: Al seleccionar un cliente existente, autocompletar sus datos en la orden.
| 4 M(cid:243)dulo |        | de                  | Creaci(cid:243)n |     | de  | (cid:211)rdenes | de Servicio |
| ---------------- | ------ | ------------------- | ---------------- | --- | --- | --------------- | ----------- |
| 4.1              | Flujo  | de creaci(cid:243)n |                  |     |     |                 |             |
| 1.               | Buscar | o crear             | el cliente.      |     |     |                 |             |
2. Seleccionar la marca del equipo (el sistema debe soportar mœltiples marcas).
3. Seleccionar el modelo correspondiente a la marca elegida (dependiente de la marca).
4. Ingresar la serie del producto de forma manual (campo de texto libre, ya que cada equipo
|     | tiene una   | serie | œnica). |              |     |     |     |
| --- | ----------- | ----- | ------- | ------------ | --- | --- | --- |
| 5.  | Seleccionar |       | el tipo | de servicio: |     |     |     |
(cid:136) Instalaci(cid:243)n
(cid:136)
Mantenimiento
(cid:136) Revisi(cid:243)n
| 6.  | Indicar | la condici(cid:243)n |     | del | servicio: |     |     |
| --- | ------- | -------------------- | --- | --- | --------- | --- | --- |
(cid:136) Garant(cid:237)a
(cid:136)
|     | Fuera             |                | de garant(cid:237)a | (facturado)           |               |                   |        |
| --- | ----------------- | -------------- | ------------------- | --------------------- | ------------- | ----------------- | ------ |
| 7.  | Especi(cid:28)car |                | el motivo           | (diagn(cid:243)stico, |               | revisi(cid:243)n, | etc.). |
| 8.  | Registrar         | observaciones, |                     |                       | incluyendo:   |                   |        |
|     | (cid:136) Costo   |                | del servicio        | (si                   | es facturado) |                   |        |
(cid:136)
|     | Antecedentes |     |     | de servicios |     | anteriores | (si es garant(cid:237)a) |
| --- | ------------ | --- | --- | ------------ | --- | ---------- | ------------------------ |
9. Adjuntar/registrar nœmero de documento (referencia interna, ej. (cid:16)417(cid:17)).
10. Adjuntar/registrar nœmero de orden en plataforma externa del fabricante (ej. Sansu).
| 11. | Guardar | la  | orden. |     |     |     |     |
| --- | ------- | --- | ------ | --- | --- | --- | --- |
2

| 4.2 | Requerimientos |     |     | del m(cid:243)dulo |     |     |     |     |
| --- | -------------- | --- | --- | ------------------ | --- | --- | --- | --- |
(cid:136)
RO-01: La estructura del formulario debe ser la misma para todos los tipos de orden; solo
|     | cambia | el campo | de  | condici(cid:243)n | (garant(cid:237)a |     | / facturado | / instalaci(cid:243)n). |
| --- | ------ | -------- | --- | ----------------- | ----------------- | --- | ----------- | ----------------------- |
(cid:136)
RO-02: Alguardar,elsistemadebegenerarautomÆticamenteundocumentoPDFimprimible.
(cid:136)
RO-03: El PDF debe contener dos copias idØnticas en la misma hoja (para separar): una
|     | para el | cliente | y otra | para | el tØcnico. |     |     |     |
| --- | ------- | ------- | ------ | ---- | ----------- | --- | --- | --- |
(cid:136)
RO-04: Cada orden debe tener un nœmero de orden interno, ademÆs de poder registrar el
|     | nœmero | largo | de documento |     | externo | (ej. | (cid:16)417(cid:17)). |     |
| --- | ------ | ----- | ------------ | --- | ------- | ---- | --------------------- | --- |
(cid:136)
RO-05: El sistema debe permitir bœsqueda de (cid:243)rdenes tanto por nœmero interno como por el
|     | nœmero         | de documento |       | externo, | para      | evitar | errores | de bœsqueda. |
| --- | -------------- | ------------ | ----- | -------- | --------- | ------ | ------- | ------------ |
| 5   | M(cid:243)dulo | de           | Notas | /        | Historial |        |         |              |
(cid:136)
RN-01: Cada orden debe tener una secci(cid:243)n de notas tipo chat/bitÆcora.
(cid:136)
RN-02: Cada nota debe quedar asociada automÆticamente al usuario que la cre(cid:243).
(cid:136)
RN-03: Lasnotasdebenquedarguardadaspermanentementeyvisiblesparatodoslosusuarios
con acceso a la orden (para centralizar la informaci(cid:243)n y evitar preguntas repetitivas entre
compaæeros).
| 6   | M(cid:243)dulo | de  | Inventario |     |     |     |     |     |
| --- | -------------- | --- | ---------- | --- | --- | --- | --- | --- |
(cid:136)
RI-01: Debe permitir registrar un inventario inicial de repuestos/piezas.
(cid:136)
RI-02: Debepermitirregistrarentradasdeinventario(compras/llegadaderepuestos),incluyendo
|     | referencia | al nœmero |     | de compra | o   | proveedor. |     |     |
| --- | ---------- | --------- | --- | --------- | --- | ---------- | --- | --- |
(cid:136)
RI-03: Debe permitir registrar salidas de inventario cuando una pieza se usa en una orden
|     | (descuento | automÆtico |     | del | stock). |     |     |     |
| --- | ---------- | ---------- | --- | --- | ------- | --- | --- | --- |
(cid:136)
RI-04: Debe permitir consultar en tiempo real la cantidad disponible de una pieza espec(cid:237)(cid:28)ca
|     | antes | de solicitarla |     | o desplazarse |     | f(cid:237)sicamente | a   | veri(cid:28)carla. |
| --- | ----- | -------------- | --- | ------------- | --- | ------------------- | --- | ------------------ |
(cid:136)
RI-05: Debe generar una remisi(cid:243)n cuando se retiren piezas para una orden, que sirva de
soporte para que el Ærea de facturaci(cid:243)n cobre al cliente lo consumido (ej. compresor, varilla
|     | de soldadura, |     | etc.). |     |     |     |     |     |
| --- | ------------- | --- | ------ | --- | --- | --- | --- | --- |
(cid:136)
RI-06: La remisi(cid:243)n/orden debe permitir calcular un valor total sumando piezas utilizadas +
|     | mano | de obra. |     |     |     |     |     |     |
| --- | ---- | -------- | --- | --- | --- | --- | --- | --- |
(cid:136) RI-07: El sistema debe permitir ajustar/de(cid:28)nir el precio de cada pieza o servicio segœn el
|     | valor (cid:28)nal | acordado |     | con | el cliente. |     |     |     |
| --- | ----------------- | -------- | --- | --- | ----------- | --- | --- | --- |
3

| 7   | M(cid:243)dulo | de  | Caja | / Finanzas |     |     |     |     |
| --- | -------------- | --- | ---- | ---------- | --- | --- | --- | --- |
(cid:136)
|     | RF-01: | Registrar | abonos | y pagos | asociados |     | a una orden. |     |
| --- | ------ | --------- | ------ | ------- | --------- | --- | ------------ | --- |
(cid:136) RF-02: Solo el administrador puede eliminar o corregir un abono mal registrado.
(cid:136)
|     | RF-03:           | Debe | permitir | imprimir  | el reporte |         | de caja del | d(cid:237)a. |
| --- | ---------------- | ---- | -------- | --------- | ---------- | ------- | ----------- | ------------ |
|     | (cid:136) RF-04: | Debe | permitir | el cierre | de caja    | diario. |             |              |
(cid:136)
RF-05: Debe permitir consultar gastos e ingresos generales (solo administrador).
| 8   | Requerimientos |     |     | No Funcionales |     |     |     |     |
| --- | -------------- | --- | --- | -------------- | --- | --- | --- | --- |
(cid:136)
RNF-01: El sistema debe ser accesible desde la web, sin instalaci(cid:243)n local.
(cid:136)
RNF-02: Interfaz simple e intuitiva, similar a la del sistema de referencia (Catalina/SalomØ).
(cid:136)
RNF-03: Control de acceso basado en roles (RBAC) para separar funciones administrativas
|     | de operativas. |     |     |     |     |     |     |     |
| --- | -------------- | --- | --- | --- | --- | --- | --- | --- |
(cid:136)
RNF-04: Trazabilidad de todas las acciones cr(cid:237)ticas (quiØn cre(cid:243)/modi(cid:28)c(cid:243) quØ y cuÆndo).
| 9   | Mejoras | Identi(cid:28)cadas |     |     | frente | al  | Sistema | Anterior |
| --- | ------- | ------------------- | --- | --- | ------ | --- | ------- | -------- |
(cid:136)
ME-01: Vincular directamente el inventario con la orden de servicio, para que al crear la
orden se pueda veri(cid:28)car y descontar la disponibilidad real de piezas (en el sistema anterior el
inventario y las (cid:243)rdenes no estaban bien integrados, generando inconsistencias: ej. 60 piezas
|     | registradas | vs. | 20 reales). |     |     |     |     |     |
| --- | ----------- | --- | ----------- | --- | --- | --- | --- | --- |
(cid:136) ME-02: Evitar duplicidad o descoordinaci(cid:243)n en el registro manual de entradas/salidas de
inventario.
(cid:136) ME-03: Mejorar la bœsqueda de (cid:243)rdenes permitiendo mœltiples criterios (nœmero interno,
nœmero externo, cØdula del cliente) para reducir errores humanos al buscar.
4