import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Controller } from "react-hook-form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"

export default function PatientForm({ defaultValues = {}, register, control, errors }) {
  return (
    <div className="space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ direction: 'rtl' }}>
      {/* Name Field */}
      <div className="space-y-2" style={{ direction: 'rtl' }}>
        <Label htmlFor="name" className="text-sm font-medium"  style={{ direction: 'rtl' }}>
          الاسم الكامل *
        </Label>
        <Input 
          id="name"
          defaultValue={defaultValues.name} 
          {...register("name", { required: "الاسم مطلوب" })} 
          placeholder="أدخل الاسم الكامل للمريض"
          className="h-12 text-base"
          style={{ direction: 'rtl' }}
        />
        {errors.name && <div className="text-xs text-red-600">{errors.name.message}</div>}
      </div>
      
      {/* Phone and Gender Fields */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium"  style={{ direction: 'rtl' }}>
            رقم الهاتف *
          </Label>
          <Input 
            id="phone"
            defaultValue={defaultValues.phone ?? ""} 
            {...register("phone")} 
            placeholder="مثال: 05XXXXXXXX"
            className="h-12 text-base"
            style={{ direction: 'rtl' }}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="gender" className="text-sm font-medium"  style={{ direction: 'rtl' }}>
            النوع *
          </Label>
          <Controller
            control={control}
            name="gender"
            defaultValue={defaultValues.gender ?? ""}
            rules={{ required: "النوع مطلوب" }}
            render={({ field }) => (
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                value={field.value}
                dir="rtl"
              >
                <SelectTrigger id="gender" className="h-12 w-full justify-between">
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.gender && <div className="text-xs text-red-600">{errors.gender.message}</div>}
        </div>
      </div>
      
      {/* Age Field */}
      <div className="space-y-2">
        <Label htmlFor="date_of_birth" className="text-sm font-medium">
          العمر (اختياري)
        </Label>
        <div className="flex gap-2">
          <Input 
            id="date_of_birth"
            type="number"
            min="1"
            max="120"
            defaultValue={defaultValues.age ?? ""} 
            {...register("age")} 
            placeholder="أدخل العمر بالأرقام"
            className="h-12 text-base flex-1"
          />
          <Controller
            control={control}
            name="age_unit"
            defaultValue={defaultValues.age_unit ?? "years"}
            render={({ field }) => (
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                value={field.value}
                dir="rtl"
              >
                <SelectTrigger className="h-12 w-24 justify-between">
                  <SelectValue placeholder="سنة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="years">سنة</SelectItem>
                  <SelectItem value="months">شهر</SelectItem>
                  <SelectItem value="days">يوم</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <p className="text-xs text-muted-foreground">يمكن إضافته لاحقًا</p>
      </div>
      
      {/* Notes Field */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-medium">
          ملاحظات (اختياري)
        </Label>
        <textarea
          id="notes"
          defaultValue={defaultValues.notes ?? ""} 
          {...register("notes")} 
          placeholder="أدخل أي ملاحظات مهمة عن المريض"
          className="flex min-h-[80px] w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">مثل: حساسية، مرض مزمن، ملاحظات خاصة</p>
      </div>
    </div>
  )
}