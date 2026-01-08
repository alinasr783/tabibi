import React from 'react';

const Logo = ({ className = "", ...props }) => {
  return (
    <div className={`flex items-center justify-center ${className}`} {...props}>
      <div className="bg-primary rounded-[var(--radius)] w-16 h-16 flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-xl">ط</span>
      </div>
    </div>
  );
};

export default Logo;