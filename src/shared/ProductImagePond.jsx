import { useEffect, useMemo, useRef, useState } from 'react'
import { FilePond, registerPlugin } from 'react-filepond'
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type'
import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation'
import FilePondPluginImagePreview from 'filepond-plugin-image-preview'
import { uploadProductImage } from '../services/inventoryService'
import 'filepond/dist/filepond.min.css'
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css'

registerPlugin(
  FilePondPluginFileValidateType,
  FilePondPluginImageExifOrientation,
  FilePondPluginImagePreview,
)

function toPondFiles(imageUrl) {
  if (!imageUrl) {
    return []
  }

  return [
    {
      source: imageUrl,
      options: {
        type: 'local',
      },
    },
  ]
}

function ProductImagePond({
  imageUrl = '',
  userId,
  disabled = false,
  onImageUrlChange,
  onUploadingChange,
}) {
  const [files, setFiles] = useState(() => toPondFiles(imageUrl))
  const onImageUrlChangeRef = useRef(onImageUrlChange)
  const onUploadingChangeRef = useRef(onUploadingChange)
  const userIdRef = useRef(userId)

  useEffect(() => {
    onImageUrlChangeRef.current = onImageUrlChange
  }, [onImageUrlChange])

  useEffect(() => {
    onUploadingChangeRef.current = onUploadingChange
  }, [onUploadingChange])

  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  const server = useMemo(
    () => ({
      process: (_fieldName, file, _metadata, load, error, progress) => {
        let cancelled = false

        onUploadingChangeRef.current?.(true)
        progress(true, 0, 100)

        uploadProductImage(file, { userId: userIdRef.current })
          .then((publicUrl) => {
            if (cancelled) {
              return
            }

            progress(true, 100, 100)
            onImageUrlChangeRef.current?.(publicUrl)
            load(publicUrl)
          })
          .catch((uploadError) => {
            if (cancelled) {
              return
            }

            const message =
              uploadError instanceof Error
                ? uploadError.message
                : 'No se pudo subir la imagen.'
            onImageUrlChangeRef.current?.('')
            error(message)
          })
          .finally(() => {
            if (!cancelled) {
              onUploadingChangeRef.current?.(false)
            }
          })

        return {
          abort: () => {
            cancelled = true
            onUploadingChangeRef.current?.(false)
          },
        }
      },
      load: (source, load, error, progress, abort) => {
        const controller = new AbortController()

        progress(true, 0, 1024)

        fetch(source, { signal: controller.signal })
          .then((response) => {
            if (!response.ok) {
              throw new Error('No se pudo cargar la imagen actual.')
            }
            return response.blob()
          })
          .then((blob) => {
            progress(true, blob.size, blob.size)
            load(blob)
          })
          .catch((loadError) => {
            if (loadError?.name === 'AbortError') {
              return
            }
            error(
              loadError instanceof Error
                ? loadError.message
                : 'No se pudo cargar la imagen actual.',
            )
          })

        return {
          abort: () => {
            controller.abort()
            abort()
          },
        }
      },
      revert: (_uniqueFileId, load) => {
        onImageUrlChangeRef.current?.('')
        load()
      },
      remove: (_source, load) => {
        onImageUrlChangeRef.current?.('')
        load()
      },
    }),
    [],
  )

  return (
    <div className="sange-filepond">
      <FilePond
        files={files}
        onupdatefiles={setFiles}
        allowMultiple={false}
        maxFiles={1}
        acceptedFileTypes={['image/jpeg', 'image/png', 'image/webp', 'image/gif']}
        disabled={disabled}
        name="product-image"
        credits={false}
        instantUpload
        server={server}
        labelIdle='Arrastra una imagen o <span class="filepond--label-action">Buscar</span>'
        labelFileProcessing="Convirtiendo a WebP..."
        labelFileProcessingComplete="Imagen lista"
        labelFileProcessingError="Error al subir"
        labelTapToCancel="Cancelar"
        labelTapToRetry="Reintentar"
        labelTapToUndo="Quitar"
        labelFileTypeNotAllowed="Tipo de archivo no permitido"
        fileValidateTypeLabelExpectedTypes="Espera imagen JPG, PNG, WEBP o GIF"
      />
      <p className="mt-2 text-xs text-foreground/45">
        Se convierte automaticamente a WebP. Maximo 5 MB.
      </p>
    </div>
  )
}

export default ProductImagePond
