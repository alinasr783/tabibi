import {ArrowRight} from "lucide-react";
import {Label} from "../../components/ui/label";
import {Input} from "../../components/ui/input";
import {Button} from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export default function PatientFormCard({
  register,
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
            <select
              id="gender"
              className="flex h-10 w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm"
              {...register("gender", {required: "النوع مطلوب"})}>
              <option value="">اختر</option>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>
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
              {...register("age", {
                required: "العمر مطلوب",
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
              <ArrowRight className="mr-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
