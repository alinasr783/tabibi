import { useState } from "react";
import { useController } from "react-hook-form";
import { Input } from "./input";
import { Badge } from "./badge";
import { Button } from "./button";
import { X, Plus } from "lucide-react";

export function TagInput({ control, name, placeholder }) {
  const { field } = useController({ name, control });
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    if (inputValue.trim()) {
      const currentValues = Array.isArray(field.value) ? field.value : [];
      if (!currentValues.includes(inputValue.trim())) {
        field.onChange([...currentValues, inputValue.trim()]);
      }
      setInputValue("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation(); // Stop event bubbling
      handleAdd();
    }
  };

  const removeTag = (tagToRemove) => {
    const currentValues = Array.isArray(field.value) ? field.value : [];
    field.onChange(currentValues.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
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
          <Plus className="w-5 h-5" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.isArray(field.value) && field.value.map((tag, idx) => (
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
