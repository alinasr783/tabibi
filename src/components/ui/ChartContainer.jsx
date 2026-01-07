import { useState, useRef, useLayoutEffect } from "react";
import { cn } from "../../lib/utils";
export default function ChartContainer({ minHeight = 240, className, children }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: minHeight });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    let mounted = true;
    
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const cr = entry.contentRect;
      
      if (mounted) {
        setSize({
          width: Math.max(1, cr.width),
          height: Math.max(minHeight, cr.height || minHeight),
        });
      }
    });
    
    observer.observe(el);
    
    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [minHeight]);

  return (
    <div 
      ref={ref} 
      className={cn("w-full", className)}
      style={{ minHeight: `${minHeight}px` }}
    >
      {size.width > 0 && children(size)}
    </div>
  );
}
