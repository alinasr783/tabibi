import React, { useState, useEffect, useRef } from "react";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Check, Loader2, Calendar as CalendarIcon, Percent, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { Progress } from "../../components/ui/progress";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";
import { toast } from "react-hot-toast";

export function InlineEdit({ 
  value, 
  onSave, 
  type = "text", 
  options = [], 
  placeholder = "اضغط للتعديل...",
  className,
  label,
  icon: Icon,
  dir = "rtl"
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isEditing) {
      setCurrentValue(value);
    }
  }, [value, isEditing]);

  // Handle clicks outside to save
  useEffect(() => {
    if (!isEditing) return;
    
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        // Special case for select/popovers/portals/checkboxes that might be outside the DOM tree of container
        if (event.target.closest('[role="listbox"]') || 
            event.target.closest('[role="dialog"]') || 
            event.target.closest('[role="menu"]') || 
            event.target.closest('.radix-select-content')) return;
        
        // Don't auto-save for multiselect and progress on click outside to prevent confusion
        // as they have their own save buttons
        if (type !== "multiselect" && type !== "progress") {
          handleSave(currentValue);
        } else {
          // Just close editing mode for these types if clicked outside
          setIsEditing(false);
          setCurrentValue(value);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, currentValue, value, type]);

  const handleSave = async (newValue) => {
    // Basic normalization for numbers
    let finalValue = newValue;
    if (type === "number" || type === "progress") {
      finalValue = (newValue === "" || newValue === null || newValue === undefined) ? null : Number(newValue);
    }

    // Comparison logic - use empty string/array as fallback for null/undefined
    const oldValueStr = JSON.stringify(value ?? (type === "multiselect" ? [] : ""));
    const newValueStr = JSON.stringify(finalValue ?? (type === "multiselect" ? [] : ""));
    
    if (oldValueStr === newValueStr) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(finalValue);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      setIsEditing(false);
    } catch (error) {
      console.error("Inline edit save error:", error);
      setCurrentValue(value);
      toast.error("فشل حفظ التغييرات");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && type !== "textarea" && type !== "multiselect") {
      e.preventDefault();
      handleSave(currentValue);
    }
    if (e.key === "Escape") {
      setCurrentValue(value);
      setIsEditing(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      onClick={() => !isEditing && setIsEditing(true)}
      className={cn(
        "group relative flex items-start gap-3 p-2.5 rounded-xl border border-transparent transition-all duration-200",
        isEditing ? "" : "hover:bg-primary/5 cursor-pointer",
        className
      )}
    >
      {/* Icon - Always visible */}
      {Icon && (
        <div className={cn(
          "p-2 rounded-full shrink-0 transition-colors mt-0.5",
          isEditing ? "bg-primary/20" : "bg-primary/10 group-hover:bg-primary/20"
        )}>
          <Icon className="w-4 h-4 text-primary" />
        </div>
      )}
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Label and Status - Always visible */}
        <div className="flex items-center justify-between mb-0.5">
          {label && <span className={cn(
            "text-[10px] font-medium transition-colors",
            isEditing ? "text-primary font-bold" : "text-muted-foreground"
          )}>{label}</span>}
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isSaving ? (
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
            ) : showSuccess ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : null}
          </div>
        </div>

        {/* Input/Value Part */}
        <div className="flex items-center gap-2 min-h-[24px]">
          {isEditing ? (
            <div className="w-full">
              {type === "checkbox" && (
                <div className="flex flex-col gap-2 py-1">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={currentValue === true || currentValue === "true" ? "default" : "outline"}
                      className={cn(
                        "flex-1 h-8 text-xs font-bold rounded-lg transition-all",
                        (currentValue === true || currentValue === "true") ? "bg-primary shadow-sm" : "hover:bg-primary/5"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave(true);
                      }}
                    >نعم</Button>
                    <Button
                      size="sm"
                      variant={currentValue === false || currentValue === "false" ? "default" : "outline"}
                      className={cn(
                        "flex-1 h-8 text-xs font-bold rounded-lg transition-all",
                        (currentValue === false || currentValue === "false") ? "bg-slate-600 shadow-sm" : "hover:bg-slate-50"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave(false);
                      }}
                    >لا</Button>
                  </div>
                </div>
              )}

              {type === "select" && (
                <div className="flex flex-col gap-2 py-1">
                  {options.length <= 4 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {options.map((opt) => (
                        <Button
                          key={String(opt.value)}
                          size="sm"
                          variant={String(currentValue) === String(opt.value) ? "default" : "outline"}
                          className={cn(
                            "h-8 text-[10px] font-bold rounded-lg transition-all",
                            String(currentValue) === String(opt.value) ? "bg-primary shadow-sm" : "hover:bg-primary/5"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSave(opt.value);
                          }}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Select 
                        defaultValue={String(currentValue ?? "")} 
                        onValueChange={(v) => handleSave(v)} 
                        open={true}
                        onOpenChange={(open) => !open && setIsEditing(false)}
                      >
                        <SelectTrigger className="h-7 w-full border-none focus:ring-0 p-0 bg-transparent text-sm font-medium">
                          <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent className="radix-select-content">
                          {options.map((opt) => (
                            <SelectItem key={String(opt.value)} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {type === "progress" && (
                <div className="space-y-4 py-2 w-full">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-sm font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">{currentValue || 0}%</span>
                      <div className="flex items-center gap-1.5 opacity-60">
                        <Percent className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Level</span>
                      </div>
                    </div>
                    
                    <div className="relative h-8 flex items-center group/slider px-1">
                      {/* Live Track */}
                      <div className="absolute inset-x-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700" />
                      <div 
                        className="absolute left-1 h-1.5 bg-gradient-to-r from-blue-400 to-primary rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(37,99,235,0.2)]" 
                        style={{ width: `calc(${currentValue || 0}% - 8px)` }}
                      />
                      
                      {/* Ghost Track for clicks */}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        autoFocus
                        value={currentValue || 0}
                        onChange={(e) => setCurrentValue(Number(e.target.value))}
                        className="absolute inset-0 w-full h-8 opacity-0 cursor-pointer z-20"
                      />
                      
                      {/* Modern Handle */}
                      <div 
                        className="absolute h-5 w-5 bg-white border-2 border-primary rounded-full shadow-lg shadow-primary/20 pointer-events-none z-10 flex items-center justify-center transition-transform group-active/slider:scale-110"
                        style={{ left: `calc(${currentValue || 0}% - 10px)` }}
                      >
                        <div className="w-1 h-1 bg-primary rounded-full" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1 border-t border-primary/5">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 text-[10px] font-bold hover:bg-red-50 hover:text-red-600" 
                      onClick={(e) => { e.stopPropagation(); setIsEditing(false); setCurrentValue(value); }}
                    >إلغاء</Button>
                    <Button 
                      size="sm" 
                      className="h-7 text-[10px] px-5 font-black bg-primary shadow-lg shadow-primary/20" 
                      onClick={(e) => { e.stopPropagation(); handleSave(currentValue); }}
                    >حفظ النسبة</Button>
                  </div>
                </div>
              )}

              {type === "multiselect" && (
                <div className="space-y-1 w-full py-2">
                  <div className="max-h-[200px] overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                    {options.map((opt) => {
                      const current = Array.isArray(currentValue) ? currentValue : [];
                      const isChecked = current.includes(opt.value);
                      return (
                        <div 
                          key={opt.value} 
                          className={cn(
                            "flex items-center gap-3 py-2 px-3 rounded-xl cursor-pointer transition-all border border-transparent",
                            isChecked ? "bg-primary/5 border-primary/10 shadow-sm" : "hover:bg-slate-50"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = isChecked 
                              ? current.filter(v => v !== opt.value)
                              : [...current, opt.value];
                            // Immediately save and close for "zero-click" experience as requested
                            handleSave(next);
                          }}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all",
                            isChecked ? "bg-primary border-primary" : "border-slate-300 bg-white"
                          )}>
                            {isChecked && <Check className="w-3 h-3 text-white stroke-[4px]" />}
                          </div>
                          <span className={cn("text-xs font-bold transition-colors", isChecked ? "text-primary" : "text-slate-600")}>
                            {opt.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Optional: Add a small note or just remove the buttons for cleaner UI */}
                  <div className="flex justify-end pt-2 border-t border-primary/5 mt-2">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="h-6 text-[9px] font-bold opacity-50 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
                    >إلغاء</Button>
                  </div>
                </div>
              )}

              {type === "date" && (
                <div className="w-full space-y-2">
                  <Input
                    type="date"
                    autoFocus
                    value={currentValue || ""}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-8 w-full border-none focus-visible:ring-0 p-0 bg-transparent text-sm font-bold text-primary"
                  />
                  <div className="flex justify-end gap-2 pt-1 border-t border-primary/5">
                    <Button 
                      size="sm" 
                      className="h-6 text-[10px] px-4 font-bold bg-primary" 
                      onClick={(e) => { e.stopPropagation(); handleSave(currentValue); }}
                    >حفظ التاريخ</Button>
                  </div>
                </div>
              )}

              {type === "textarea" && (
                <div className="w-full space-y-2">
                  <Textarea
                    autoFocus
                    value={currentValue || ""}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="min-h-[80px] w-full border-none focus-visible:ring-0 p-0 bg-transparent text-sm font-medium resize-none leading-relaxed"
                    placeholder={placeholder}
                  />
                  <div className="flex justify-end gap-2 pt-1 border-t border-primary/5">
                    <Button 
                      size="sm" 
                      className="h-6 text-[10px] px-4 font-bold bg-primary" 
                      onClick={(e) => { e.stopPropagation(); handleSave(currentValue); }}
                    >حفظ النص</Button>
                  </div>
                </div>
              )}

              {(type === "text" || type === "number") && (
                <div className="w-full space-y-2">
                  <Input
                    type={type}
                    autoFocus
                    value={currentValue ?? ""}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-8 w-full border-none focus-visible:ring-0 p-0 bg-transparent text-sm font-bold text-primary"
                    placeholder={placeholder}
                    dir={dir}
                  />
                  <div className="flex justify-end gap-2 pt-1 border-t border-primary/5">
                    <Button 
                      size="sm" 
                      className="h-6 text-[10px] px-4 font-bold bg-primary" 
                      onClick={(e) => { e.stopPropagation(); handleSave(currentValue); }}
                    >حفظ</Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {type === "progress" ? (
                <div className="flex-1 space-y-1.5 py-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{value || 0}%</span>
                  </div>
                  <Progress value={value || 0} className="h-1.5" />
                </div>
              ) : (
                <span className={cn(
                  "text-sm font-medium truncate",
                  !value && value !== 0 && "text-muted-foreground italic"
                )} dir={dir}>
                  {type === "select" 
                    ? options.find(o => String(o.value) === String(value))?.label || value || placeholder
                    : type === "multiselect"
                      ? Array.isArray(value) && value.length > 0 
                        ? value.map(v => options.find(o => o.value === v)?.label || v).join("، ")
                        : placeholder
                      : type === "date" && value
                        ? new Date(value).toLocaleDateString('ar-EG')
                        : type === "checkbox"
                          ? (value === true || value === "true") ? "نعم" : "لا"
                          : value || (value === 0 ? "0" : placeholder)
                  }
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}


