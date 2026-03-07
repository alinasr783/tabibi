import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./dialog";
import { Button } from "./button";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "../../lib/utils";

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  variant = "destructive", // destructive | default
  isLoading = false,
}) {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-0 shadow-lg">
        <div className="bg-white p-6 pt-8 pb-6 text-center sm:text-right relative">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4 sm:mx-0 sm:h-10 sm:w-10 sm:mb-0 sm:inline-flex sm:ml-4">
            <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>
          
          <div className="sm:flex-1">
            <DialogHeader className="p-0 sm:text-right">
              <DialogTitle className="text-lg font-semibold leading-6 text-gray-900 mb-2">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                {description}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>
        
        <DialogFooter className="bg-gray-50 px-6 py-4 flex-row-reverse sm:flex-row gap-2">
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? "جاري التنفيذ..." : confirmText}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto mt-0"
          >
            {cancelText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
