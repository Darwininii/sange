import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Fuse from 'fuse.js'
import { PRODUCT_SEARCH_KEYS } from './productOrderMap'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary focus:bg-white dark:focus:bg-transparent/10 focus:ring-4 focus:ring-primary/20'

function ProductLookupInput({
  value = '',
  placeholder = 'Parte / Producto',
  disabled = false,
  products = [],
  searchKeys = PRODUCT_SEARCH_KEYS,
  className = FIELD_CLASS,
  onValueChange,
  onSelectProduct,
}) {
  const listId = useId()
  const containerRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const fuse = useMemo(
    () =>
      new Fuse(products, {
        keys: searchKeys,
        threshold: 0.4,
        ignoreLocation: true,
        includeScore: true,
      }),
    [products, searchKeys],
  )

  const results = useMemo(() => {
    const query = String(value ?? '').trim()
    if (!query || products.length === 0) {
      return []
    }

    return fuse
      .search(query)
      .slice(0, 8)
      .map((entry) => entry.item)
  }, [fuse, products.length, value])

  useEffect(() => {
    setActiveIndex(results.length > 0 ? 0 : -1)
  }, [results])

  useEffect(() => {
    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  function selectProduct(product) {
    onSelectProduct?.(product)
    setIsOpen(false)
  }

  function handleKeyDown(event) {
    if (!isOpen || results.length === 0) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) =>
        current + 1 >= results.length ? 0 : current + 1,
      )
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) =>
        current - 1 < 0 ? results.length - 1 : current - 1,
      )
      return
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      selectProduct(results[activeIndex])
      return
    }

    if (event.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        className={className}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          onValueChange?.(event.target.value)
          setIsOpen(true)
        }}
        onKeyDown={handleKeyDown}
      />

      {isOpen && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-border bg-surface py-1 shadow-xl shadow-black/15"
        >
          {results.map((product, index) => {
            const isActive = index === activeIndex

            return (
              <li key={product.id} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={`flex w-full flex-col px-4 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/15 text-foreground'
                      : 'text-foreground/85 hover:bg-foreground/5'
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectProduct(product)}
                >
                  <span className="font-semibold">
                    {product.name || 'Sin nombre'}
                  </span>
                  <span className="text-xs text-foreground/55">
                    {product.sku ? `${product.sku} · ` : ''}
                    Stock {Number(product.quantity ?? 0)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

export default ProductLookupInput
