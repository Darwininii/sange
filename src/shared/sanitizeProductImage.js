/**
 * Client-side image sanitization for inventory uploads.
 *
 * Strategy (defense in depth):
 * 1. Reject dangerous extensions and untrusted declared MIME types.
 * 2. Verify magic bytes (do not trust file.type / extension alone).
 * 3. Force browser decode + canvas re-encode to WebP (strips metadata / payloads).
 * 4. Verify the output is a real WebP before upload.
 */

export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const PRODUCT_IMAGE_WEBP_QUALITY = 0.82
export const PRODUCT_IMAGE_MAX_EDGE = 1600

export const ALLOWED_INPUT_IMAGE_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const ALLOWED_INPUT_IMAGE_TYPE_SET = new Set(ALLOWED_INPUT_IMAGE_TYPES)

const BLOCKED_EXTENSION_RE =
  /\.(?:exe|dll|bat|cmd|com|msi|scr|ps1|sh|bash|js|mjs|cjs|jar|php|phtml|asp|aspx|jsp|html?|xhtml|svg|xml|htm|vbs|wsf|apk|dmg|iso|bin|dat)$/i

function fileBaseName(file) {
  const raw = String(file?.name ?? 'producto')
  const withoutExt = raw.replace(/\.[^.]+$/, '')
  const safe = withoutExt.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').trim()
  return safe || 'producto'
}

function startsWithBytes(bytes, signature) {
  if (bytes.length < signature.length) {
    return false
  }

  return signature.every((value, index) => bytes[index] === value)
}

/**
 * Detect image MIME from file header bytes (magic numbers).
 * @param {Uint8Array} bytes
 * @returns {string | null}
 */
export function detectImageMimeFromBytes(bytes) {
  if (!bytes || bytes.length < 12) {
    return null
  }

  // JPEG
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg'
  }

  // PNG
  if (
    startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return 'image/png'
  }

  // GIF87a / GIF89a
  if (
    startsWithBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    startsWithBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return 'image/gif'
  }

  // RIFF....WEBP
  if (
    startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }

  return null
}

async function readFileHeader(file, length = 16) {
  const buffer = await file.slice(0, length).arrayBuffer()
  return new Uint8Array(buffer)
}

/**
 * Validates that the selected file is a real raster image before any processing.
 * @param {File | Blob} file
 * @returns {Promise<string>} detected MIME
 */
export async function assertSafeRasterImageFile(file) {
  if (!file) {
    throw new Error('Selecciona una imagen.')
  }

  if (file.size <= 0) {
    throw new Error('El archivo esta vacio.')
  }

  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    throw new Error('La imagen no puede superar 5 MB.')
  }

  const fileName = String(file.name ?? '')
  if (fileName && BLOCKED_EXTENSION_RE.test(fileName)) {
    throw new Error('Tipo de archivo no permitido.')
  }

  const declaredType = String(file.type ?? '').toLowerCase()
  // Never accept broad image/* (e.g. image/svg+xml). Require an allow-list match.
  if (declaredType && !ALLOWED_INPUT_IMAGE_TYPE_SET.has(declaredType)) {
    throw new Error('Formato no permitido. Usa JPG, PNG, WEBP o GIF.')
  }

  const header = await readFileHeader(file)
  const detectedMime = detectImageMimeFromBytes(header)

  if (!detectedMime || !ALLOWED_INPUT_IMAGE_TYPE_SET.has(detectedMime)) {
    throw new Error(
      'El archivo no es una imagen valida. Usa JPG, PNG, WEBP o GIF.',
    )
  }

  // If the browser declared a type, it must agree with the magic bytes.
  if (declaredType && declaredType !== detectedMime) {
    throw new Error(
      'El tipo del archivo no coincide con su contenido. Sube una imagen valida.',
    )
  }

  return detectedMime
}

async function assertWebpOutput(file) {
  const header = await readFileHeader(file, 16)
  const mime = detectImageMimeFromBytes(header)

  if (mime !== 'image/webp') {
    throw new Error('La conversion a WebP no produjo una imagen valida.')
  }

  if (file.size <= 0 || file.size > PRODUCT_IMAGE_MAX_BYTES) {
    throw new Error('La imagen convertida supera 5 MB. Usa una mas liviana.')
  }
}

/**
 * Decode + redraw through canvas. This strips EXIF/XMP and any non-pixel payload
 * that may have been appended to the original file.
 */
export async function convertImageToWebp(
  file,
  {
    quality = PRODUCT_IMAGE_WEBP_QUALITY,
    maxEdge = PRODUCT_IMAGE_MAX_EDGE,
  } = {},
) {
  if (!file) {
    throw new Error('Selecciona una imagen.')
  }

  if (typeof createImageBitmap !== 'function') {
    throw new Error('Este navegador no soporta conversion de imagenes.')
  }

  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error(
      'No se pudo leer la imagen. El archivo puede estar danado o no ser una imagen.',
    )
  }

  try {
    if (!bitmap.width || !bitmap.height) {
      throw new Error('La imagen no tiene dimensiones validas.')
    }

    const longest = Math.max(bitmap.width, bitmap.height)
    const scale = longest > maxEdge ? maxEdge / longest : 1
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d', { alpha: true })
    if (!context) {
      throw new Error('No se pudo preparar el canvas para WebP.')
    }

    // Keep transparent pixels; do not paint an opaque backdrop.
    context.clearRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(new Error('No se pudo convertir la imagen a WebP.'))
            return
          }
          resolve(result)
        },
        'image/webp',
        quality,
      )
    })

    return new File([blob], `${fileBaseName(file)}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    })
  } finally {
    bitmap.close?.()
  }
}

/**
 * Full client sanitization pipeline before Storage upload.
 * @returns {Promise<File>} Safe WebP file ready to upload
 */
export async function sanitizeProductImageForUpload(file) {
  await assertSafeRasterImageFile(file)
  const webpFile = await convertImageToWebp(file)
  await assertWebpOutput(webpFile)
  return webpFile
}
