import { Check, Loader, Tag, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export default function DiscountCodeInput({
  onApply,
  isPending,
  error,
  isApplied,
  onClear,
  discountAmount = 0,
  discountValue = 0,
  isPercentage = false,
  customMessage = null,
  showMessage = false,
}) {
  const [inputValue, setInputValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [displayMessage, setDisplayMessage] = useState(false);

  // Show custom message for 3 seconds when discount is applied
  useEffect(() => {
    if (showMessage && customMessage) {
      setDisplayMessage(true);
      const timer = setTimeout(() => {
        setDisplayMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showMessage, customMessage]);

  const handleApply = () => {
    if (inputValue.trim()) {
      onApply(inputValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !isPending && !isApplied) {
      handleApply();
    }
  };

  const handleClear = () => {
    setInputValue("");
    setIsExpanded(false);
    setDisplayMessage(false);
    onClear();
  };

  // Show custom message popup for 3 seconds
  if (displayMessage && customMessage && !error) {
    return (
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <Check className="size-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-blue-700 dark:text-blue-400">
              {customMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If discount is applied, always show the success message
  if (isApplied) {
    return (
      <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="size-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-green-700 dark:text-green-400">
                تم تطبيق الخصم بنجاح
              </p>
              <p className="text-sm text-green-600 dark:text-green-500">
                خصم: {isPercentage ? `${discountValue}%` : `${discountValue}`} ={" "}
                {discountAmount.toFixed(2)} جنيه
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  // If not expanded, show the "Do you have a discount code?" button
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full text-right py-3 px-4 rounded-lg border border-dashed border-border hover:border-primary hover:bg-accent/50 transition-all duration-200 group"
      >
        <div className="flex items-center gap-3">
          <Tag className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            هل لديك كود خصم؟
          </span>
        </div>
      </button>
    );
  }

  // Expanded state: show input and apply button
  return (
    <div className="rounded-lg border border-border p-4 space-y-4 bg-accent/20">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Tag className="size-4" />
          كود الخصم
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
          className="h-7 w-7 p-0"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="أدخل كود الخصم..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          className="flex-1"
          dir="ltr"
          autoFocus
        />
        <Button
          onClick={handleApply}
          disabled={isPending || !inputValue.trim()}
          className="gap-2">
          {isPending && <Loader className="size-4 animate-spin" />}
          {isPending ? "جاري التحقق..." : "تطبيق الكود"}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
