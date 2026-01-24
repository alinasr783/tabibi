import { Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import Activity from "./Activity";
import SwipeableMiniSchedule from "./SwipeableMiniSchedule";
import SubscriptionBanner from "./SubscriptionBanner";
import SummaryCards from "./SummaryCards";
import { useState, useRef } from "react";
import { useDrag, useDrop } from 'react-dnd';

// Draggable wrapper component for dashboard sections
function DraggableSection({ id, index, moveSection, children }) {
  const [isDraggingEnabled, setIsDraggingEnabled] = useState(false);
  const longPressTimer = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const [{ isDragging }, drag] = useDrag({
    type: 'SECTION',
    item: { id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => isDraggingEnabled, // Only drag when enabled
  });

  const [, drop] = useDrop({
    accept: 'SECTION',
    hover: (draggedItem) => {
      if (draggedItem.index !== index) {
        moveSection(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  // Handle long press to enable dragging
  const handleTouchStart = (e) => {
    // Store initial touch position
    touchStartPos.current = {
      x: e.touches ? e.touches[0].clientX : e.clientX,
      y: e.touches ? e.touches[0].clientY : e.clientY
    };
    
    longPressTimer.current = setTimeout(() => {
      setIsDraggingEnabled(true);
      if (navigator.vibrate) navigator.vibrate(50);
      
      // Also trigger a manual drag start for better mobile support
      if (e.target && e.target.dispatchEvent) {
        const mouseDownEvent = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: e.touches ? e.touches[0].clientX : e.clientX,
          clientY: e.touches ? e.touches[0].clientY : e.clientY
        });
        e.target.dispatchEvent(mouseDownEvent);
      }
    }, 400); // 400ms delay (slightly less than backend delay of 500ms)
  };

  const handleTouchMove = (e) => {
    // If dragging is enabled, prevent scrolling
    if (isDraggingEnabled) {
      e.preventDefault();
      return;
    }
    
    // Check if user is trying to scroll (significant vertical movement)
    if (longPressTimer.current) {
      const currentPos = {
        x: e.touches ? e.touches[0].clientX : e.clientX,
        y: e.touches ? e.touches[0].clientY : e.clientY
      };
      
      const deltaX = Math.abs(currentPos.x - touchStartPos.current.x);
      const deltaY = Math.abs(currentPos.y - touchStartPos.current.y);
      
      // If horizontal movement is greater than vertical, likely trying to scroll horizontally
      // If vertical movement is significant, likely trying to scroll vertically
      if (deltaY > 10 || deltaX > 10) {
        // Clear the long press timer to prevent drag activation during scrolling
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Disable dragging after a short delay to prevent accidental drags
    setTimeout(() => {
      setIsDraggingEnabled(false);
    }, 100);
  };

  return (
    <div 
      ref={(node) => drag(drop(node))}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className={`${isDraggingEnabled ? 'cursor-grabbing' : 'cursor-default'} ${isDraggingEnabled ? 'touch-none' : ''} select-none`}
    >
      {children}
    </div>
  );
}

// Main dashboard component with drag-and-drop
function DashboardContent() {
  const [filter, setFilter] = useState("month");
  const [sections, setSections] = useState([
    { id: 'schedule', component: <SwipeableMiniSchedule />, name: 'مواعيدك انهاردة' },
    { id: 'subscription', component: <SubscriptionBanner />, name: 'الباقة' },
    { id: 'activity', component: <Activity />, name: 'نشاطك السريع' }
  ]);

  const moveSection = (fromIndex, toIndex) => {
    const updatedSections = [...sections];
    const [movedSection] = updatedSections.splice(fromIndex, 1);
    updatedSections.splice(toIndex, 0, movedSection);
    setSections(updatedSections);
  };

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header Section - Responsive layout for mobile and desktop */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2 rounded-[var(--radius)] bg-primary/10 text-primary flex-shrink-0 mt-[-0.5rem]"> {/* Moved upward with negative margin */}
              <Stethoscope className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold truncate">لوحة تحكمك</h1>
              <p className="text-sm text-muted-foreground truncate">  
                نظرة عامة سريعة على نشاط العيادة
              </p>
            </div>
          </div>
          {/* Date filter - Full width on mobile, auto width on desktop - hidden on large screens */}
          <div className="w-full sm:w-auto lg:hidden">
            <SummaryCards filter={filter} setFilter={setFilter} />
          </div>
        </div>
      </div>

      {/* Stats Summary - Full width on large screens, hidden on mobile/small screens */}
      <div className="hidden lg:block w-full">
        <SummaryCards filter={filter} setFilter={setFilter} />
      </div>

      {/* Draggable Sections: Mini Schedule, Subscription Banner & Activity - Responsive grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {sections.map((section, index) => (
          <DraggableSection 
            key={section.id} 
            id={section.id} 
            index={index} 
            moveSection={moveSection}
          >
            {section.id === 'schedule' && <SwipeableMiniSchedule />}
            {section.id === 'subscription' && <SubscriptionBanner />}
          </DraggableSection>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardContent />
  );
}