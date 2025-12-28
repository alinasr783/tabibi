import { Button } from "./button"

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const showPrevious = currentPage > 1
  const showNext = currentPage < totalPages

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!showPrevious}
      >
        السابق
      </Button>
      
      <div className="text-sm font-medium text-foreground">
        صفحة {currentPage} من {totalPages}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!showNext}
      >
        التالي
      </Button>
    </div>
  )
}