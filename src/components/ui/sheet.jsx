import React from 'react';
import { cn } from '../../lib/utils';

// Simple Sheet implementation
const Sheet = ({ open, onOpenChange, children }) => {
  return (
    <div className="fixed inset-0 z-50">
      {open && (
        <>
          <div 
            className="fixed inset-0 bg-black/40" 
            onClick={() => onOpenChange && onOpenChange(false)}
          />
          {children}
        </>
      )}
    </div>
  );
};

const SheetTrigger = ({ children, ...props }) => {
  return React.cloneElement(children, props);
};

const SheetContent = ({ side = 'right', children, className }) => {
  // Simple implementation for right-side sheet
  const sideClasses = {
    right: 'right-0 top-0 h-full w-64 border-l',
    left: 'left-0 top-0 h-full w-64 border-r',
    top: 'top-0 left-0 right-0 w-full h-64 border-b',
    bottom: 'bottom-0 left-0 right-0 w-full h-64 border-t'
  };

  return (
    <div 
      className={cn(
        "fixed bg-card shadow-lg z-50 overflow-y-auto",
        sideClasses[side],
        className
      )}
    >
      {children}
    </div>
  );
};

const SheetHeader = ({ children, className }) => {
  return (
    <div className={cn("border-b border-border p-4", className)}>
      {children}
    </div>
  );
};

const SheetTitle = ({ children, className }) => {
  return (
    <h2 className={cn("text-lg font-semibold text-foreground", className)}>
      {children}
    </h2>
  );
};

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle };