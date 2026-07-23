import { CustomButton } from "./CustomButton";
import { CustomDivider } from "./CustomDivider";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  totalItems: number;
  page: number;
  setPage: (page: number) => void;
  itemsPerPage?: number;
}

interface PaginationButtonProps {
  pageNumber: number;
  isActive: boolean;
  onClick: () => void;
}

const PaginationButton = ({ pageNumber, isActive, onClick }: PaginationButtonProps) => (
  <CustomButton
    size="sm"
    effect={isActive ? "shine" : "magnetic"}
    effectColor={isActive ? "bg-white/20" : undefined}
    className={cn(
      "w-10 h-10 min-w-10 p-0 rounded-xl font-bold transition-all duration-300",
      isActive
        ? "bg-black/90 text-white dark:bg-white/78 dark:text-black shadow-lg shadow-black/30 dark:shadow-white/10 scale-110 z-10"
        : "text-black/70 dark:text-slate-300 hover:bg-black/40 dark:hover:bg-white/10 hover:text-white dark:hover:text-white"
    )}
    onClick={onClick}
  >
    {pageNumber}
  </CustomButton>
);

export const Pagination = ({ totalItems, page, setPage, itemsPerPage = 12 }: Props) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const handleNextPage = () => {
    setPage(Math.min(page + 1, totalPages));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handlePrevPage = () => {
    setPage(Math.max(page - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startItem = (page - 1) * itemsPerPage + 1;
  const endItem = Math.min(page * itemsPerPage, totalItems);

  // Smart Pagination Logic (Max 5 buttons total)
  const getVisiblePages = () => {
    const maxVisibleTotal = 5;
    
    if (totalPages <= maxVisibleTotal) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // If total pages > 5, we show:
    // 1 (first) + 3 (middle) + 1 (last) = 5 buttons max
    // So the sliding window size is 3
    const windowSize = 3;
    
    let start = Math.max(page - 1, 2);
    let end = Math.min(start + windowSize - 1, totalPages - 1);

    // Adjust start if end hit the ceiling
    if (end === totalPages - 1) {
      start = Math.max(end - windowSize + 1, 2);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex flex-col items-center gap-6 mt-16 pb-8">
      
      {/* Floating Container */}
      <div className="relative z-10 flex items-center gap-1 p-2 bg-white/25 dark:bg-black/40 backdrop-blur-xl border border-black/30 dark:border-white/10 rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/20 ring-1 ring-black/5 dark:ring-white/5">
        
        {/* Prev Button */}
        <CustomButton
          size="icon"
          effect="magnetic"
          disabled={page === 1}
          onClick={handlePrevPage}
          className={cn(
            "w-11 h-11 rounded-2xl hover:bg-white/80 dark:hover:bg-white/20 hover:text-black dark:hover:text-white transition-all duration-300",
            page === 1 ? "opacity-30 cursor-not-allowed" : "hover:shadow-md hover:scale-105"
          )}
          aria-label="Anterior"
          centerIcon={ChevronLeft}
          iconSize={22}
        />

        {/* Divider */}
        <CustomDivider orientation="vertical" className="h-6 mx-1 bg-black dark:bg-white/60" />

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {visiblePages[0] > 1 && (
            <>
              <PaginationButton 
                pageNumber={1} 
                isActive={page === 1} 
                onClick={() => goToPage(1)} 
              />
              {visiblePages[0] > 2 && <span className="text-black/80 dark:text-white/80 px-1 font-black">...</span>}
            </>
          )}

          {visiblePages.map((p) => (
            <PaginationButton 
              key={p} 
              pageNumber={p} 
              isActive={page === p} 
              onClick={() => goToPage(p)} 
            />
          ))}

          {visiblePages[visiblePages.length - 1] < totalPages && (
            <>
              {visiblePages[visiblePages.length - 1] < totalPages - 1 && <span className="text-black/80 dark:text-white/80 px-1 font-black">...</span>}
              <PaginationButton 
                pageNumber={totalPages} 
                isActive={page === totalPages} 
                onClick={() => goToPage(totalPages)} 
              />
            </>
          )}
        </div>

        {/* Divider */}
        <CustomDivider orientation="vertical" className="h-6 mx-1 bg-black dark:bg-white/60" />

        {/* Next Button */}
        <CustomButton
          size="icon"
          effect="magnetic"
          disabled={page === totalPages}
          onClick={handleNextPage}
          className={cn(
            "w-11 h-11 rounded-2xl hover:bg-white/80 dark:hover:bg-white/20 hover:text-black dark:hover:text-white transition-all duration-300",
            page === totalPages ? "opacity-30 cursor-not-allowed" : "hover:shadow-md hover:scale-105"
          )}
          aria-label="Siguiente"
          centerIcon={ChevronRight}
          iconSize={22}
        />
      </div>

      {/* Info Section - Now subtle and clean below controls */}
      <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
        <p className="text-sm font-semibold uppercase tracking-wider text-black/70 dark:text-white/70">
          Mostrando <span className="font-bold text-black dark:text-white">{Math.min(startItem, totalItems)}</span> - <span className="font-black text-black dark:text-white">{endItem}</span> de <span className="font-bold text-black dark:text-white">{totalItems}</span>
        </p>
      </div>
    </div>
  );
};
