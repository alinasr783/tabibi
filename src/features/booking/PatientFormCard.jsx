import {ArrowLeft} from "lucide-react";
import {Label} from "../../components/ui/label";
import {Input} from "../../components/ui/input";
import {Button} from "../../components/ui/button";
import { Controller } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export default function PatientFormCard({
  register,
  control,
  errors,
  onSubmit,
  isLoading,
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg sm:text-xl">بيانات المريض</CardTitle>
        <CardDescription className="text-sm">
          دخل بيانات المريض عشان نكمل الحجز
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Name Field */}
          <div>
            <Label htmlFor="name" className="text-sm">
              الاسم *
            </Label>
            <Input
              id="name"
              {...register("name", {required: "الاسم مطلوب"})}
              placeholder="اكتب الاسم هنا"
              className="text-sm"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Phone Field */}
          <div>
            <Label htmlFor="phone" className="text-sm">
              رقم الهاتف *
            </Label>
            <Input
              id="phone"
              {...register("phone", {
                required: "رقم الهاتف مطلوب",
                minLength: {
                  value: 10,
                  message: "رقم الهاتف يجب أن يكون 10 أرقام على الأقل",
                },
                pattern: {
                  value: /^\d+$/,
                  message: "رقم الهاتف يجب أن يحتوي على أرقام فقط",
                },
              })}
              placeholder="دخل رقم موبايلك هنا"
              className="text-sm"
            />
            {errors.phone && (
              <p className="text-sm text-red-500 mt-1">
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* Gender Field */}
          <div>
            <Label htmlFor="gender" className="text-sm">
              النوع *
            </Label>
            <Controller
              control={control}
              name="gender"
              rules={{required: "النوع مطلوب"}}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? ""}
                  dir="rtl"
                >
                  <SelectTrigger id="gender" className="h-10 w-full justify-between">
                    <SelectValue placeholder="اختر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">ذكر</SelectItem>
                    <SelectItem value="female">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.gender && (
              <p className="text-sm text-red-500 mt-1">
                {errors.gender.message}
              </p>
            )}
          </div>

          {/* Age Field */}
          <div>
            <Label htmlFor="age" className="text-sm">
              السن *
            </Label>
            <Input
              id="age"
              type="number"
              inputMode="numeric"
              step="1"
              {...register("age", {
                required: "العمر مطلوب",
                valueAsNumber: true,
                validate: (v) => (Number.isFinite(v) ? true : "العمر غير صحيح"),
                min: { value: 1, message: "العمر يجب أن يكون أكبر من 0" },
                max: { value: 120, message: "العمر يجب أن يكون أقل من 120" }
              })}
              placeholder="دخل السن هنا"
              className="text-sm"
            />
            {errors.age && (
              <p className="text-sm text-red-500 mt-1">
                {errors.age.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "بنبعت للعيادة دلوقتي ..." : "كمل"}
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
