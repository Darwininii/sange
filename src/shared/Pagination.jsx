import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { GoDotFill } from 'react-icons/go'
import { cn } from '@/lib/utils'
import { PAGE_SIZE_OPTIONS } from '@/hooks/usePagination'
import { Separator } from '@/components/ui/separator'
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

function ArrowButton({ icon: Icon, label, onClick, disabled }) {
  return (
    <AppButton
      variant="ghost"
      size="icon"
      effect="magnetic"
      icon={Icon}
      iconClassName="size-5"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      tooltip={label}
      className={cn(
        'size-10 rounded-2xl text-foreground/70 transition-all duration-300',
        'hover:bg-background/80 hover:text-foreground hover:shadow-md',
        'dark:hover:bg-white/10',
        disabled && 'opacity-30',
      )}
    />
  )
}

function PageButton({ page, isActive, onClick }) {
  return (
    <AppButton
      variant="ghost"
      size="sm"
      effect={isActive ? 'shine' : 'magnetic'}
      shineColor="rgba(255, 255, 255, 0.25)"
      onClick={onClick}
      aria-label={`Ir a la pagina ${page}`}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'size-10 min-w-10 rounded-xl p-0 text-sm font-bold transition-all duration-300',
        isActive
          ? 'z-10 scale-110 bg-foreground text-background shadow-lg shadow-black/20 ring-0 dark:bg-white/85 dark:text-black dark:shadow-white/10'
          : 'text-foreground/65 hover:bg-background/70 hover:text-foreground dark:hover:bg-white/10',
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
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      {showPageSize ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/55">
            Cantidad
          </span>
          <AppSelect
            value={String(pageSize)}
            onValueChange={onPageSizeChange}
            options={pageSizeOptions}
            className="h-10 w-24 rounded-xl px-3 py-0 text-sm"
          />
        </div>
      ) : (
        <span />
      )}

      <div className="flex flex-col items-center gap-3 sm:items-end">
        <nav
          aria-label="Paginacion"
          className={cn(
            'relative z-10 flex items-center gap-1 rounded-3xl p-1.5',
            'border border-border/80 bg-background/40 shadow-lg shadow-black/5',
            'ring-1 ring-black/5 backdrop-blur-xl',
            'dark:border-white/10 dark:bg-black/30 dark:shadow-black/20 dark:ring-white/5',
          )}
        >
          <ArrowButton
            icon={ChevronsLeft}
            label="Primera pagina"
            disabled={isFirst}
            onClick={() => goTo(1)}
          />
          <ArrowButton
            icon={ChevronLeft}
            label="Pagina anterior"
            disabled={isFirst}
            onClick={() => goTo(page - 1)}
          />

          <Separator
            orientation="vertical"
            className="mx-1 h-6 bg-foreground/20 dark:bg-white/40"
          />

          <div className="flex items-center gap-1">
            {pages.map((item, index) =>
              item === DOTS ? (
                <span
                  key={`dots-${index}`}
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center text-foreground/45"
                >
                  <GoDotFill className="size-3" />
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
          </div>

          <Separator
            orientation="vertical"
            className="mx-1 h-6 bg-foreground/20 dark:bg-white/40"
          />

          <ArrowButton
            icon={ChevronRight}
            label="Pagina siguiente"
            disabled={isLast}
            onClick={() => goTo(page + 1)}
          />
          <ArrowButton
            icon={ChevronsRight}
            label="Ultima pagina"
            disabled={isLast}
            onClick={() => goTo(safeTotal)}
          />
        </nav>

        <p className="text-xs font-semibold uppercase tracking-wider text-foreground/55">
          Pagina{' '}
          <span className="font-bold text-foreground">{page}</span>
          {' '}de{' '}
          <span className="font-bold text-foreground">{safeTotal}</span>
        </p>
      </div>
    </div>
  )
}

export default Pagination
