import { useState } from "react";
import { Input } from "./input";
import { Badge } from "./badge";
import { Button } from "./button";
import { X, Plus, Loader2, Check } from "lucide-react";
import { cn } from "../../lib/utils";

export function TagInput({ 
  value = [], 
  onChange, 
  placeholder, 
  onSave, 
  className,
  label,
  variant = "default" // "default" or "inline"
}) {
  const [inputValue, setInputValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const currentValues = Array.isArray(value) ? value : [];

  const handleAdd = async (e) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed && !currentValues.includes(trimmed)) {
      const nextValues = [...currentValues, trimmed];
      setInputValue("");
      
      if (onSave) {
        setIsSaving(true);
        try {
          await onSave(nextValues);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
        } catch (error) {
          console.error("TagInput save error:", error);
        } finally {
          setIsSaving(false);
        }
      } else if (onChange) {
        onChange(nextValues);
      }
    }
  };

  const removeTag = async (tagToRemove) => {
    const nextValues = currentValues.filter(tag => tag !== tagToRemove);
    
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(nextValues);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } catch (error) {
        console.error("TagInput remove error:", error);
      } finally {
        setIsSaving(false);
      }
    } else if (onChange) {
      onChange(nextValues);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  if (variant === "inline") {
    return (
      <div className={cn("space-y-2 p-3 rounded-xl border border-transparent hover:border-muted/30 hover:bg-muted/30 transition-all group", className)}>
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin text-primary" /> : showSuccess ? <Check className="w-3 h-3 text-green-600" /> : null}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1.5 min-h-[24px]">
          {currentValues.map((tag, idx) => (
            <Badge key={idx} variant="secondary" className="bg-white/80 border-muted-foreground/20 text-xs py-0 h-6 flex items-center gap-1">
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
            </Badge>
          ))}
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => inputValue.trim() && handleAdd()}
            placeholder={currentValues.length === 0 ? placeholder : "+ أضف..."}
            className="bg-transparent border-none outline-none text-xs placeholder:text-muted-foreground/50 w-24"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-11"
        />
        <Button 
          type="button" 
          variant="outline" 
          size="icon" 
          onClick={handleAdd}
          className="h-11 w-11 shrink-0"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {currentValues.map((tag, idx) => (
          <Badge key={idx} variant="secondary" className="flex items-center gap-1 px-2 py-1 h-8">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-red-500 transition-colors rounded-full p-0.5 hover:bg-red-50"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
