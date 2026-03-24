import "react-loading-skeleton/dist/skeleton.css";
import Skeleton from 'react-loading-skeleton'

export function SkeletonLine(props) {
  return <Skeleton {...props} />
}

export function SkeletonBlock({ lines = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={14} />
      ))}
    </div>
  )
}

export { Skeleton }

export default Skeleton
