import { useForm } from "react-hook-form"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import useLogin from "./useLogin.jsx"
import { signInWithGoogle } from "../../services/apiAuth"
import { toast } from "sonner"

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const { mutate: login, isPending } = useLogin()

  function onSubmit(data) {
    login(data)
  }

  async function handleGoogleLogin() {
    try {
      await signInWithGoogle()
    } catch (error) {
      toast.error("حصل خطأ في تسجيل الدخول بجوجل")
      console.error(error)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            البريد الإلكتروني
          </label>
          <Input
            id="email"
            type="email"
            {...register("email", {
              required: "البريد الإلكتروني مطلوب",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "البريد الإلكتروني غير صالح",
              },
            })}
            disabled={isPending}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            كلمة المرور
          </label>
          <Input
            id="password"
            type="password"
            {...register("password", {
              required: "كلمة المرور مطلوبة",
              minLength: {
                value: 6,
                message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
              },
            })}
            disabled={isPending}
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            أو
          </span>
        </div>
      </div>

      <Button 
        variant="outline" 
        type="button" 
        className="w-full" 
        onClick={handleGoogleLogin}
      >
        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
          <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
        </svg>
        تسجيل الدخول بجوجل
      </Button>
    </div>
  )
}
