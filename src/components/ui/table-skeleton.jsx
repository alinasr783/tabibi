import { Card, CardContent } from "../../components/ui/card";

export default function TableSkeleton() {
  return (
    <Card className="max-h-[calc(100vh-200px)]">
      <CardContent className="p-4 md:p-6">
        {/* Mobile Skeleton */}
        <div className="md:hidden space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-[var(--radius)] mb-3"></div>
            </div>
          ))}
        </div>

        {/* Desktop Skeleton */}
        <div className="hidden md:block">
          <div className="animate-pulse">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 mb-4">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded-[var(--radius)]"></div>
              ))}
            </div>
            
            {/* Table Rows */}
            {[...Array(5)].map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-7 gap-4 mb-3">
                {[...Array(7)].map((_, colIndex) => (
                  <div key={colIndex} className="h-12 bg-gray-200 rounded-[var(--radius)]"></div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Skeleton */}
        <div className="animate-pulse mt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="h-6 bg-gray-200 rounded-[var(--radius)] w-48"></div>
            <div className="flex gap-2">
              <div className="h-9 bg-gray-200 rounded-[var(--radius)] w-24"></div>
              <div className="h-9 bg-gray-200 rounded-[var(--radius)] w-32"></div>
              <div className="h-9 bg-gray-200 rounded-[var(--radius)] w-24"></div>
            </div>
          </div>
        </div> 
      </CardContent>
    </Card>
  );
}