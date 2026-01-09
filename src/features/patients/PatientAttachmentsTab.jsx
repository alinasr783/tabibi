import { useState, useRef } from "react";
import { usePatientAttachments } from "./usePatientAttachments";
import { 
  FileText, Image as ImageIcon, Trash2, Download, Upload, File, Loader2, X,
  Stethoscope, Pill, Activity, FlaskConical, FileBarChart
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";

export default function PatientAttachmentsTab({ patientId }) {
  const { attachments, isLoading, deleteAttachment, uploadAttachment, isUploading } = usePatientAttachments(patientId);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Sort attachments by date (newest first)
  const sortedAttachments = attachments?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) || [];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <FileText className="w-5 h-5" />
          ملف المريض
        </h3>
        <Button onClick={() => setIsUploadDialogOpen(true)} className="gap-2">
          <Upload className="w-4 h-4" />
          إضافة وثيقة جديدة
        </Button>
      </div>

      {!sortedAttachments || sortedAttachments.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
          <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">لا توجد وثائق</h3>
          <p className="text-sm text-muted-foreground/80">لم يتم رفع أي ملفات لهذا المريض بعد</p>
        </div>
      ) : (
        <div className="relative border-r-2 border-muted mr-4 pr-8 py-2 md:mr-6 md:pr-10">
          {sortedAttachments.map((file) => (
            <TimelineItem key={file.id} file={file} onDelete={() => deleteAttachment(file.id)} />
          ))}
        </div>
      )}

      <UploadDialog 
        open={isUploadDialogOpen} 
        onClose={() => setIsUploadDialogOpen(false)} 
        onUpload={(data) => {
          uploadAttachment({ ...data, patientId }, {
            onSuccess: () => {
              setIsUploadDialogOpen(false);
            }
          });
        }}
        isUploading={isUploading}
      />
    </div>
  );
}

function TimelineItem({ file, onDelete }) {
  const isImage = file.file_type.startsWith("image/");
  const date = new Date(file.created_at);
  
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'lab': return <FlaskConical className="w-3.5 h-3.5" />;
      case 'radiology': return <Activity className="w-3.5 h-3.5" />;
      case 'prescription': return <Pill className="w-3.5 h-3.5" />;
      case 'report': return <FileBarChart className="w-3.5 h-3.5" />;
      default: return <FileText className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="mb-6 relative last:mb-0 group">
      {/* Timeline Dot */}
      <div className={`
        absolute top-2 -right-[39px] md:-right-[49px] w-6 h-6 rounded-full border-[3px] border-background 
        flex items-center justify-center z-10 bg-muted text-muted-foreground shadow-sm
      `}>
        {getCategoryIcon(file.category)}
      </div>
      
      <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors group-hover:border-primary/20">
        {/* Compact Thumbnail */}
        <div className="flex-shrink-0 mt-0.5">
          {isImage ? (
            <div className="w-12 h-12 rounded-md overflow-hidden border bg-muted cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(file.file_url, '_blank')}>
              <img src={file.file_url} alt={file.file_name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-md border bg-muted/50 flex items-center justify-center text-muted-foreground">
              <FileText className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div>
               <h4 className="font-medium text-sm text-foreground leading-none mb-1.5 break-all" title={file.file_name}>
                {file.file_name}
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-medium">
                  {getCategoryLabel(file.category)}
                </span>
                <span>{date.toLocaleDateString('ar-EG')}</span>
                <span>{date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" asChild>
                <a href={file.file_url} target="_blank" rel="noopener noreferrer" download>
                  <Download className="w-3.5 h-3.5" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {file.description && (
            <p className="text-xs text-muted-foreground mt-2 bg-muted/30 p-2 rounded border-r-2 border-primary/30 leading-relaxed">
              {file.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadDialog({ open, onClose, onUpload, isUploading }) {
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) return;
    
    onUpload({ file, category, description });
    // Note: We don't close here anymore, we wait for success
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose} style={{ direction: 'rtl' }}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>رفع وثيقة جديدة</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>الملف</Label>
            <div 
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${file ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}
              `}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="flex flex-col items-center gap-2 text-primary">
                  <File className="w-10 h-10" />
                  <span className="font-medium break-all text-center px-4">{file.name}</span>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    إلغاء الملف
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="p-3 rounded-full bg-muted">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">اضغط لاختيار ملف</p>
                    <p className="text-xs mt-1">PDF, PNG, JPG (الحد الأقصى 10 ميجابايت)</p>
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>نوع الوثيقة</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lab">تحاليل طبية</SelectItem>
                  <SelectItem value="radiology">أشعة</SelectItem>
                  <SelectItem value="prescription">روشتة / وصفة</SelectItem>
                  <SelectItem value="report">تقرير طبي</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>وصف الملف</Label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="اكتب وصفاً مختصراً لمحتوى الملف..."
              className="resize-none h-24"
            />
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            <Button type="submit" disabled={!file || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الرفع...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 ml-2" />
                  حفظ في الملف
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getCategoryLabel(category) {
  const map = {
    lab: "تحاليل",
    radiology: "أشعة",
    prescription: "روشتة",
    report: "تقرير",
    other: "أخرى",
    initial_upload: "رفع أولي"
  };
  return map[category] || category;
}
