import { useRef, useState, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";

export default function SortableStat({ id, index, moveCard, children, type = "STAT_CARD" }) {
  const ref = useRef(null);
  const [isDraggable, setIsDraggable] = useState(false);
  const timerRef = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const [{ handlerId }, drop] = useDrop({
    accept: type,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Note: This logic is a bit simplified for grid, but standard for list.
      // For grid, swapping on hover is usually acceptable and simpler.
      
      moveCard(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: type,
    item: () => {
      return { id, index };
    },
    canDrag: () => isDraggable,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const handlePointerDown = (e) => {
    // Only left click or touch
    if (e.type === 'mousedown' && e.button !== 0) return;

    // Store initial touch position
    if (e.touches && e.touches.length > 0) {
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    } else if (e.clientX) {
      touchStartPos.current = {
        x: e.clientX,
        y: e.clientY
      };
    }

    timerRef.current = setTimeout(() => {
      setIsDraggable(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 400);
  };

  const handlePointerMove = (e) => {
    if (!timerRef.current) return;
    
    // Get current position
    let currentPos = { x: 0, y: 0 };
    if (e.touches && e.touches.length > 0) {
      currentPos = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    } else if (e.clientX) {
      currentPos = {
        x: e.clientX,
        y: e.clientY
      };
    } else {
      return;
    }
    
    const deltaX = Math.abs(currentPos.x - touchStartPos.current.x);
    const deltaY = Math.abs(currentPos.y - touchStartPos.current.y);
    
    // If moved more than 10px, it's likely a scroll/swipe, cancel long press
    if (deltaX > 10 || deltaY > 10) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handlePointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsDraggable(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const opacity = isDragging ? 0.4 : 1;
  const scale = isDraggable && !isDragging ? 1.02 : 1;
  const cursor = isDraggable ? 'grab' : 'default';
  
  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{ opacity, transform: `scale(${scale})`, transition: 'transform 0.2s', cursor, touchAction: isDraggable ? 'none' : 'manipulation' }}
      data-handler-id={handlerId}
      className="h-full select-none"
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onMouseMove={handlePointerMove}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
      onTouchCancel={handlePointerUp}
      onTouchMove={handlePointerMove}
    >
      {children}
    </div>
  );
}
