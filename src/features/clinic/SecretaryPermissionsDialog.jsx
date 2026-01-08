import { useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Checkbox } from "../../components/ui/checkbox";
import { SECRETARY_PERMISSIONS } from "./clinicUtils"; // Changed from AVAILABLE_PERMISSIONS

export default function SecretaryPermissionsDialog({
  open,
  onOpenChange,
  secretary,
  selectedPermissions,
  onPermissionChange,
  onSave,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>تعديل صلاحيات {secretary?.name || 'الموظف'}</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[calc(90vh-12rem)] pr-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>
            {`
              .overflow-y-auto::-webkit-scrollbar {
                display: none;
              }
            `}
          </style>
          
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SECRETARY_PERMISSIONS.map((permission) => (
                <div key={permission.id} className="flex items-start gap-3 p-3 rounded-[var(--radius)] border border-border/50 bg-muted/20">
                  <Checkbox
                    id={permission.id}
                    checked={selectedPermissions.includes(permission.id)}
                    onCheckedChange={() => onPermissionChange(permission.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label htmlFor={permission.id} className="text-sm font-medium leading-none cursor-pointer">
                      {permission.label}
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {permission.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-[var(--radius)] border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-900 dark:text-white">
                ملاحظة: صفحة الإعدادات متاحة دائماً للموظف
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-[25%]">
            إلغاء
          </Button>
          <Button onClick={onSave} className="w-[75%]">حفظ التغييرات</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}