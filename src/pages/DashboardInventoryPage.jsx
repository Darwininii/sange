import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { IoSearchCircleSharp } from 'react-icons/io5'
import { PiPackageFill } from 'react-icons/pi'
import { TbTrashX, TbEdit } from 'react-icons/tb'
import DashboardLayout from '../components/layout/DashboardLayout'
import Loader from '../hooks/Loader'
import appToast from '../hooks/appToast'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardMedia,
  CardTitle,
} from '../shared/Card'
import ConfirmActions from '../shared/ConfirmActions'
import DashboardListSection from '../shared/DashboardListSection'
import AppDialog from '../shared/dialog'
import Pagination from '../shared/Pagination'
import ProductImagePond from '../shared/ProductImagePond'
import ProfileActionButton from '../shared/ProfileActionButton'
import YesONo from '../shared/YesONo'
import { useCachedData } from '../hooks/useCachedData'
import { usePagination } from '../hooks/usePagination'
import {
  createInventoryProduct,
  deleteInventoryProduct,
  getInventoryProducts,
  getProductFormValues,
  INITIAL_PRODUCT_VALUES,
  updateInventoryProduct,
} from '../services/inventoryService'
import { useAuthStore } from '../store/authStore'
import { invalidateUserCache } from '../store/dataCacheStore'
import { signOutUser } from '../utils/auth'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary focus:bg-white dark:focus:bg-transparent/10 focus:ring-4 focus:ring-primary/20'

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function FieldLabel({ children, required = false }) {
  return (
    <span className="mb-1 flex items-center gap-1 text-sm font-bold text-foreground/85">
      {children}
      {required ? (
        <span className="size-2.5 text-red-500" aria-hidden="true">
          *
        </span>
      ) : null}
    </span>
  )
}

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback
}

function matchesProductSearch(product, query) {
  if (!query) {
    return true
  }

  const normalized = query.toLowerCase()
  const haystack = [product.name, product.sku, product.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalized)
}

function stockTone(quantity) {
  if (quantity <= 0) {
    return 'text-red-600 dark:text-red-400'
  }

  if (quantity <= 5) {
    return 'text-amber-700 dark:text-amber-300'
  }

  return 'text-emerald-700 dark:text-emerald-400'
}

function ProductFormFields({
  values,
  onChange,
  userId,
  pondKey,
  disabled = false,
  onImageUrlChange,
  onUploadingChange,
}) {
  return (
    <div className="mt-5 grid gap-4">
      <label>
        <FieldLabel required>Nombre</FieldLabel>
        <input
          className={FIELD_CLASS}
          name="name"
          value={values.name}
          placeholder="Ej. Compresor 12V"
          onChange={onChange}
          required
        />
      </label>

      <label>
        <FieldLabel>Referencia (SKU)</FieldLabel>
        <input
          className={FIELD_CLASS}
          name="sku"
          value={values.sku}
          placeholder="Codigo interno o del proveedor"
          onChange={onChange}
        />
      </label>

      <label>
        <FieldLabel>Descripcion</FieldLabel>
        <textarea
          className={`${FIELD_CLASS} min-h-24 resize-y`}
          name="description"
          value={values.description}
          placeholder="Detalle breve del repuesto"
          onChange={onChange}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <FieldLabel required>Cantidad</FieldLabel>
          <input
            className={FIELD_CLASS}
            name="quantity"
            type="number"
            min="0"
            step="1"
            value={values.quantity}
            onChange={onChange}
            required
          />
        </label>

        <label>
          <FieldLabel required>Precio unitario</FieldLabel>
          <input
            className={FIELD_CLASS}
            name="unitPrice"
            type="number"
            min="0"
            step="1"
            value={values.unitPrice}
            onChange={onChange}
            required
          />
        </label>
      </div>

      <div>
        <FieldLabel>Imagen</FieldLabel>
        <ProductImagePond
          key={pondKey}
          imageUrl={values.imageUrl}
          userId={userId}
          disabled={disabled}
          onImageUrlChange={onImageUrlChange}
          onUploadingChange={onUploadingChange}
        />
      </div>
    </div>
  )
}

function DashboardInventoryPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [search, setSearch] = useState('')
  const [productForm, setProductForm] = useState(INITIAL_PRODUCT_VALUES)
  const [editProduct, setEditProduct] = useState(null)
  const [editForm, setEditForm] = useState(INITIAL_PRODUCT_VALUES)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [createPondKey, setCreatePondKey] = useState(0)
  const [editPondKey, setEditPondKey] = useState(0)

  const {
    data: productsData,
    isLoading,
    error,
    refetch: refetchProducts,
  } = useCachedData({
    cacheKey: 'inventory-products',
    fetcher: getInventoryProducts,
    enabled: Boolean(user?.id),
  })

  const products = useMemo(
    () => (Array.isArray(productsData) ? productsData : []),
    [productsData],
  )
  const filteredProducts = useMemo(
    () =>
      products.filter((product) => matchesProductSearch(product, search.trim())),
    [products, search],
  )

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    paginate,
  } = usePagination({
    totalItems: filteredProducts.length,
    storageKey: 'inventory-products',
  })

  const visibleProducts = paginate(filteredProducts)

  useEffect(() => {
    setPage(1)
  }, [search, setPage])

  useEffect(() => {
    if (!error) {
      return
    }

    appToast.danger(
      getErrorMessage(error, 'No se pudieron cargar los productos.'),
    )
  }, [error])

  async function refreshProducts() {
    try {
      if (user?.id) {
        invalidateUserCache(user.id, 'inventory-products')
      }

      await refetchProducts({ silent: true, force: true })
    } catch (productError) {
      appToast.danger(
        getErrorMessage(productError, 'No se pudieron cargar los productos.'),
      )
    }
  }

  async function handleLogout() {
    await signOutUser()
    logout()
    navigate({ to: '/' })
  }

  function handleFormChange(setter) {
    return (event) => {
      const { name, value } = event.target
      setter((currentForm) => ({ ...currentForm, [name]: value }))
    }
  }

  function handleImageUrlChange(setter) {
    return (imageUrl) => {
      setter((currentForm) => ({ ...currentForm, imageUrl: imageUrl || '' }))
    }
  }

  function openEditDialog(product) {
    setDeleteTarget(null)
    setEditProduct(product)
    setEditForm(getProductFormValues(product))
    setEditPondKey((current) => current + 1)
  }

  function openDeleteDialog(product) {
    setEditProduct(null)
    setDeleteTarget(product)
  }

  function hasRequiredFields(form) {
    return Boolean(String(form.name ?? '').trim())
  }

  function isValidStock(form) {
    const quantity = Number(form.quantity)
    const unitPrice = Number(form.unitPrice)

    return (
      Number.isFinite(quantity) &&
      quantity >= 0 &&
      Number.isFinite(unitPrice) &&
      unitPrice >= 0
    )
  }

  async function handleCreateProduct(event) {
    event?.preventDefault?.()

    if (!hasRequiredFields(productForm)) {
      appToast.warning('El nombre del producto es obligatorio.')
      return
    }

    if (!isValidStock(productForm)) {
      appToast.warning('Cantidad y precio deben ser numeros validos.')
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(
        createInventoryProduct(productForm, { createdBy: user?.id }),
        {
          loading: 'Creando producto...',
          success: 'Producto creado correctamente.',
          error: (productError) =>
            getErrorMessage(productError, 'No se pudo crear el producto.'),
        },
      )
      setProductForm(INITIAL_PRODUCT_VALUES)
      setCreatePondKey((current) => current + 1)
      setIsCreateDialogOpen(false)
      await refreshProducts()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdateProduct(event) {
    event?.preventDefault?.()

    if (!editProduct) {
      return
    }

    if (!hasRequiredFields(editForm)) {
      appToast.warning('El nombre del producto es obligatorio.')
      return
    }

    if (!isValidStock(editForm)) {
      appToast.warning('Cantidad y precio deben ser numeros validos.')
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(updateInventoryProduct(editProduct.id, editForm), {
        loading: 'Actualizando producto...',
        success: 'Producto actualizado correctamente.',
        error: (productError) =>
          getErrorMessage(productError, 'No se pudo actualizar el producto.'),
      })
      setEditProduct(null)
      await refreshProducts()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteProduct() {
    if (!deleteTarget) {
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(deleteInventoryProduct(deleteTarget.id), {
        loading: 'Eliminando producto...',
        success: 'Producto eliminado correctamente.',
        error: (productError) =>
          getErrorMessage(productError, 'No se pudo eliminar el producto.'),
      })
      setDeleteTarget(null)
      await refreshProducts()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <DashboardListSection
        title="Inventario"
        sectionTitle="Productos y repuestos"
        description="Consulta el stock disponible y registra piezas del inventario inicial."
        createLabel="Crear producto"
        onCreate={() => setIsCreateDialogOpen(true)}
        actions={
          <div className="relative w-full min-w-[16rem] sm:w-72 sm:max-w-xs">
            <IoSearchCircleSharp className="pointer-events-none absolute left-3 top-1/2 size-6.5 -translate-y-1/2 text-foreground/45" />
            <input
              className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
              value={search}
              placeholder="Buscar producto..."
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar productos"
            />
          </div>
        }
        footer={
          <>
            <AppDialog
              open={isCreateDialogOpen}
              title="Crear producto"
              onOpenChange={(open) => {
                setIsCreateDialogOpen(open)
                if (!open) {
                  setProductForm(INITIAL_PRODUCT_VALUES)
                  setCreatePondKey((current) => current + 1)
                }
              }}
            >
              <form onSubmit={handleCreateProduct}>
                <ProductFormFields
                  values={productForm}
                  onChange={handleFormChange(setProductForm)}
                  userId={user?.id}
                  pondKey={`create-${createPondKey}`}
                  disabled={isSubmitting}
                  onImageUrlChange={handleImageUrlChange(setProductForm)}
                  onUploadingChange={setIsUploadingImage}
                />
                <div className="mt-5">
                  <ConfirmActions
                    variant="dialog"
                    cancelLabel="Cancelar"
                    confirmLabel="Crear producto"
                    isSubmitting={isSubmitting || isUploadingImage}
                    onCancel={() => setIsCreateDialogOpen(false)}
                    onConfirm={handleCreateProduct}
                  />
                </div>
              </form>
            </AppDialog>

            <AppDialog
              open={Boolean(editProduct)}
              title={`Editar ${editProduct?.name || 'producto'}`}
              onOpenChange={(open) => {
                if (!open) {
                  setEditProduct(null)
                  setEditPondKey((current) => current + 1)
                }
              }}
            >
              <form onSubmit={handleUpdateProduct}>
                <ProductFormFields
                  values={editForm}
                  onChange={handleFormChange(setEditForm)}
                  userId={user?.id}
                  pondKey={`edit-${editProduct?.id || 'none'}-${editPondKey}`}
                  disabled={isSubmitting}
                  onImageUrlChange={handleImageUrlChange(setEditForm)}
                  onUploadingChange={setIsUploadingImage}
                />
                <div className="mt-5">
                  <ConfirmActions
                    variant="dialog"
                    cancelLabel="Cancelar"
                    confirmLabel="Guardar cambios"
                    isSubmitting={isSubmitting || isUploadingImage}
                    onCancel={() => setEditProduct(null)}
                    onConfirm={handleUpdateProduct}
                  />
                </div>
              </form>
            </AppDialog>

            <YesONo
              open={Boolean(deleteTarget)}
              title="Eliminar producto"
              isSubmitting={isSubmitting}
              description={`El producto ${deleteTarget?.name || ''} se eliminará de forma permanente.`}
              onConfirm={handleDeleteProduct}
              onOpenChange={(open) => {
                if (!open) {
                  setDeleteTarget(null)
                }
              }}
            />
          </>
        }
      >
        {isLoading ? (
          <div className="flex justify-center rounded-3xl bg-background px-5 py-8">
            <Loader
              label="Cargando inventario..."
              className="text-foreground/55 [&>svg]:text-black/70 dark:[&>svg]:text-white/70"
            />
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-background px-5 py-10 text-center">
            <PiPackageFill className="mx-auto size-10 text-foreground/30" />
            <p className="mt-3 font-semibold text-foreground">
              Aún no hay productos en inventario
            </p>
            <p className="mt-2 text-sm text-foreground/55">
              Usa el boton "Crear producto" para registrar el inventario inicial.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-background px-5 py-10 text-center">
            <p className="font-semibold text-foreground">Sin resultados</p>
            <p className="mt-2 text-sm text-foreground/55">
              No hay productos que coincidan con la busqueda.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {visibleProducts.map((product) => (
                <Card key={product.id} className="rounded-xl">
                  <CardMedia
                    src={product.imageUrl}
                    alt={product.name}
                    fit="contain"
                    className="aspect-square"
                    imgClassName="p-1.5"
                    fallback={<PiPackageFill className="size-6 opacity-35" />}
                  />
                  <CardHeader className="gap-0 px-2.5 pt-2">
                    <CardTitle className="line-clamp-1 text-sm">
                      {product.name}
                    </CardTitle>
                    {product.sku ? (
                      <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-foreground/45">
                        {product.sku}
                      </p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="gap-1.5 px-2.5 py-1.5">
                    {product.description ? (
                      <CardDescription className="line-clamp-1 text-[11px]">
                        {product.description}
                      </CardDescription>
                    ) : (
                      <CardDescription className="text-[11px]">
                        Sin descripcion
                      </CardDescription>
                    )}
                    <div className="mt-auto flex items-end justify-between gap-1.5">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-foreground/40">
                          Stock
                        </p>
                        <p
                          className={`text-sm font-bold ${stockTone(product.quantity)}`}
                        >
                          {product.quantity}
                        </p>
                      </div>
                      <div className="min-w-0 text-right">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-foreground/40">
                          Precio
                        </p>
                        <p className="truncate text-sm font-bold text-foreground">
                          {currencyFormatter.format(product.unitPrice || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="gap-1 px-2 py-1.5">
                    <ProfileActionButton
                      icon={TbEdit}
                      label="Editar producto"
                      tooltip="Editar producto"
                      className="size-7"
                      disabled={isSubmitting}
                      onClick={() => openEditDialog(product)}
                    />
                    <ProfileActionButton
                      icon={TbTrashX}
                      label="Eliminar producto"
                      tooltip="Eliminar producto"
                      tone="red"
                      className="size-7"
                      disabled={isSubmitting}
                      onClick={() => openDeleteDialog(product)}
                    />
                  </CardFooter>
                </Card>
              ))}
            </div>

            <div className="mt-6">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
              />
            </div>
          </>
        )}
      </DashboardListSection>
    </DashboardLayout>
  )
}

export default DashboardInventoryPage
