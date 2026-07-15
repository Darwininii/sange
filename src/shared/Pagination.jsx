import {
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
} from 'react-icons/md'
import { TbPoint } from 'react-icons/tb'
import { cn } from '@/lib/utils'
import { PAGE_SIZE_OPTIONS } from '@/hooks/usePagination'
import AppButton from './AppButton'
import AppSelect from './select'

const DOTS = 'dots'

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

function getPaginationRange(currentPage, totalPages, siblingCount = 1) {
  const totalPageNumbers = siblingCount * 2 + 5

  if (totalPageNumbers >= totalPages) {
    return range(1, totalPages)
  }

  const leftSibling = Math.max(currentPage - siblingCount, 1)
  const rightSibling = Math.min(currentPage + siblingCount, totalPages)

  const showLeftDots = leftSibling > 2
  const showRightDots = rightSibling < totalPages - 1

  if (!showLeftDots && showRightDots) {
    const leftItemCount = 3 + 2 * siblingCount
    return [...range(1, leftItemCount), DOTS, totalPages]
  }

  if (showLeftDots && !showRightDots) {
    const rightItemCount = 3 + 2 * siblingCount
    return [1, DOTS, ...range(totalPages - rightItemCount + 1, totalPages)]
  }

  return [1, DOTS, ...range(leftSibling, rightSibling), DOTS, totalPages]
}

function ArrowButton({ icon, label, onClick, disabled }) {
  return (
    <AppButton
      variant="outline"
      effect="zoomIn"
      icon={icon}
      iconClassName="size-5"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      tooltip={label}
      className="size-9 rounded-xl border-black/30 dark:border-white/50 dark:hover:border-amber-400 dark:bg-transparent/10 dark:hover:bg-black/70 bg-white p-0 text-black dark:text-white hover:border-black/70 hover:bg-amber-700/50 
      hover:text-[#1a2340]"
    />
  )
}

function PageButton({ page, isActive, onClick }) {
  return (
    <AppButton
      variant={isActive ? 'solid' : 'outline'}
      effect="zoomIn"
      onClick={onClick}
      aria-label={`Ir a la pagina ${page}`}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'size-9 min-w-9 rounded-xl p-0 text-sm font-semibold',
        isActive
          ? 'bg-amber-500/80 hover:bg-amber-500/60 text-black dark:bg-amber-500/80 dark:text-black dark:hover:text-white font-black shadow-md shadow-primary/20 dark:hover:bg-black/50 ring-2 dark:ring-white/80 ring-black/60'
          : 'hover:text-black/60 ring-1 ring-black/30 dark:bg-surface dark:text-foreground/70 dark:hover:ring-primary/40 dark:hover:bg-primary/10 dark:hover:text-primary',
      )}
    >
      {page}
    </AppButton>
  )
}

function Pagination({
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  showPageSize = true,
  className,
}) {
  const safeTotal = Math.max(1, totalPages)
  const goTo = (next) => {
    const target = Math.min(Math.max(next, 1), safeTotal)
    if (target !== page) onPageChange?.(target)
  }

  const pages = getPaginationRange(page, safeTotal, siblingCount)
  const isFirst = page <= 1
  const isLast = page >= safeTotal

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4',
        className,
      )}
    >
      {showPageSize && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground/55">Cantidad:</span>
          <AppSelect
            value={String(pageSize)}
            onValueChange={onPageSizeChange}
            options={pageSizeOptions}
            className="h-9 w-24 rounded-xl px-3 py-0 text-sm"
          />
        </div>
      )}

      <nav aria-label="Paginacion" className="flex items-center gap-1">
        <ArrowButton
          icon={MdKeyboardDoubleArrowLeft}
          label="Primera pagina"
          disabled={isFirst}
          onClick={() => goTo(1)}
        />
        <ArrowButton
          icon={MdKeyboardArrowLeft}
          label="Pagina anterior"
          disabled={isFirst}
          onClick={() => goTo(page - 1)}
        />

        {pages.map((item, index) =>
          item === DOTS ? (
            <span
              key={`dots-${index}`}
              aria-hidden="true"
              className="flex size-9 items-center justify-center text-foreground/40"
            >
              <TbPoint className="size-4" />
            </span>
          ) : (
            <PageButton
              key={item}
              page={item}
              isActive={item === page}
              onClick={() => goTo(item)}
            />
          ),
        )}

        <ArrowButton
          icon={MdKeyboardArrowRight}
          label="Pagina siguiente"
          disabled={isLast}
          onClick={() => goTo(page + 1)}
        />
        <ArrowButton
          icon={MdKeyboardDoubleArrowRight}
          label="Ultima pagina"
          disabled={isLast}
          onClick={() => goTo(safeTotal)}
        />
      </nav>
    </div>
  )
}

export default Pagination
