import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { GoDotFill } from 'react-icons/go'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
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

/** Fewer slots so the bar fits narrow screens. */
function getMobilePaginationRange(currentPage, totalPages) {
  if (totalPages <= 3) {
    return range(1, totalPages)
  }

  if (currentPage <= 2) {
    return [1, 2, DOTS, totalPages]
  }

  if (currentPage >= totalPages - 1) {
    return [1, DOTS, totalPages - 1, totalPages]
  }

  return [1, DOTS, currentPage, DOTS, totalPages]
}

function ArrowButton({ icon: Icon, label, onClick, disabled, compact }) {
  return (
    <AppButton
      variant="ghost"
      size="icon"
      effect={compact ? 'none' : 'magnetic'}
      icon={Icon}
      iconClassName={compact ? 'size-4' : 'size-5'}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      tooltip={compact ? undefined : label}
      className={cn(
        'shrink-0 rounded-2xl text-foreground/70 transition-all duration-300',
        compact ? 'size-8' : 'size-10',
        'hover:bg-background/80 hover:text-foreground hover:shadow-md',
        'dark:hover:bg-white/10',
        disabled && 'opacity-30',
      )}
    />
  )
}

function PageButton({ page, isActive, onClick, compact }) {
  return (
    <AppButton
      variant="ghost"
      size="sm"
      effect={compact ? 'none' : isActive ? 'shine' : 'magnetic'}
      shineColor="rgba(255, 255, 255, 0.25)"
      onClick={onClick}
      aria-label={`Ir a la pagina ${page}`}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'shrink-0 rounded-xl p-0 text-sm font-bold transition-all duration-300',
        compact ? 'size-8 min-w-8 text-xs' : 'size-10 min-w-10',
        isActive
          ? cn(
              'z-10 bg-foreground text-background shadow-lg shadow-black/20 ring-0',
              'dark:bg-white/85 dark:text-black dark:shadow-white/10',
              !compact && 'scale-110',
            )
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
  const isMobile = useIsMobile()
  const safeTotal = Math.max(1, totalPages)
  const goTo = (next) => {
    const target = Math.min(Math.max(next, 1), safeTotal)
    if (target !== page) onPageChange?.(target)
  }

  const pages = isMobile
    ? getMobilePaginationRange(page, safeTotal)
    : getPaginationRange(page, safeTotal, siblingCount)
  const isFirst = page <= 1
  const isLast = page >= safeTotal

  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className,
      )}
    >
      {showPageSize ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/55">
            Cantidad
          </span>
          <AppSelect
            value={String(pageSize)}
            onValueChange={onPageSizeChange}
            options={pageSizeOptions}
            className="h-9 w-24 rounded-xl px-3 py-0 text-sm sm:h-10"
          />
        </div>
      ) : null}

      <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end sm:gap-3">
        <nav
          aria-label="Paginacion"
          className={cn(
            'relative z-10 flex w-full min-w-0 max-w-full items-center gap-0.5 rounded-3xl p-1',
            'border border-border/80 bg-background/40 shadow-lg shadow-black/5',
            'ring-1 ring-black/5 backdrop-blur-xl',
            'dark:border-white/10 dark:bg-black/30 dark:shadow-black/20 dark:ring-white/5',
            'sm:w-auto sm:gap-1 sm:p-1.5',
          )}
        >
          <ArrowButton
            icon={ChevronsLeft}
            label="Primera pagina"
            disabled={isFirst}
            onClick={() => goTo(1)}
            compact={isMobile}
          />
          <ArrowButton
            icon={ChevronLeft}
            label="Pagina anterior"
            disabled={isFirst}
            onClick={() => goTo(page - 1)}
            compact={isMobile}
          />

          {!isMobile ? (
            <Separator
              orientation="vertical"
              className="mx-1 h-6 bg-foreground/20 dark:bg-white/40"
            />
          ) : null}

          <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 sm:flex-none sm:gap-1">
            {pages.map((item, index) =>
              item === DOTS ? (
                <span
                  key={`dots-${index}`}
                  aria-hidden="true"
                  className={cn(
                    'flex shrink-0 items-center justify-center text-foreground/45',
                    isMobile ? 'size-6' : 'size-10',
                  )}
                >
                  <GoDotFill className="size-2.5 sm:size-3" />
                </span>
              ) : (
                <PageButton
                  key={item}
                  page={item}
                  isActive={item === page}
                  onClick={() => goTo(item)}
                  compact={isMobile}
                />
              ),
            )}
          </div>

          {!isMobile ? (
            <Separator
              orientation="vertical"
              className="mx-1 h-6 bg-foreground/20 dark:bg-white/40"
            />
          ) : null}

          <ArrowButton
            icon={ChevronRight}
            label="Pagina siguiente"
            disabled={isLast}
            onClick={() => goTo(page + 1)}
            compact={isMobile}
          />
          <ArrowButton
            icon={ChevronsRight}
            label="Ultima pagina"
            disabled={isLast}
            onClick={() => goTo(safeTotal)}
            compact={isMobile}
          />
        </nav>

        <p className="text-center text-xs font-semibold uppercase tracking-wider text-foreground/55 sm:text-right">
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
