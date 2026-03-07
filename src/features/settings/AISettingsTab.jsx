import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { useUserPreferences, useUpdateUserPreferences } from "../../hooks/useUserPreferences";
import { Bot, Brain, Sparkles, Stethoscope, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function AISettingsTab() {
  const { data: preferences, isLoading } = useUserPreferences();
  const { mutate: updatePreferences, isPending } = useUpdateUserPreferences();
  
  const [settings, setSettings] = useState({
    enabled_pages: {
      patient_file: true,
    },
    context: {
      specialty: "",
      clinic_goal: "",
      doctor_persona: "",
      custom_instructions: ""
    }
  });

  useEffect(() => {
    if (preferences?.ai_settings) {
      setSettings(prev => ({
        ...prev,
        enabled_pages: {
          ...prev.enabled_pages,
          ...(preferences.ai_settings.enabled_pages || {})
        },
        context: {
          ...prev.context,
          ...(preferences.ai_settings.context || {})
        }
      }));
    }
  }, [preferences]);

  const handleTogglePage = (pageKey) => {
    setSettings(prev => ({
      ...prev,
      enabled_pages: {
        ...prev.enabled_pages,
        [pageKey]: !prev.enabled_pages[pageKey]
      }
    }));
  };

  const handleContextChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      context: {
        ...prev.context,
        [name]: value
      }
    }));
  };

  const handleSave = () => {
    updatePreferences(
      { 
        ai_settings: settings 
      },
      {
        onSuccess: () => {
          toast.success("تم حفظ إعدادات الذكاء الاصطناعي بنجاح");
        },
        onError: () => {
          toast.error("حدث خطأ أثناء حفظ الإعدادات");
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          تخصيص الذكاء الاصطناعي
        </h2>
        <p className="text-sm text-muted-foreground">
          تحكم في كيفية عمل الذكاء الاصطناعي في عيادتك وقم بتخصيصه ليفهم سياق عملك بشكل أفضل.
        </p>
      </div>

      {/* Visibility Control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            أماكن الظهور
          </CardTitle>
          <CardDescription>
            حدد الصفحات التي تريد تفعيل مساعد الذكاء الاصطناعي فيها
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
            <div className="space-y-0.5">
              <Label className="text-base cursor-pointer" htmlFor="ai-patient-file">
                مساعد ملف المريض
              </Label>
              <p className="text-xs text-muted-foreground">
                يظهر في صفحة ملف المريض للمساعدة في كتابة الملاحظات والتشخيص
              </p>
            </div>
            <Switch
              id="ai-patient-file"
              checked={settings.enabled_pages.patient_file}
              onCheckedChange={() => handleTogglePage('patient_file')}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-500" />
            هوية المساعد الطبي
          </CardTitle>
          <CardDescription>
            هذه البيانات تساعد الذكاء الاصطناعي على فهم تخصصك وتقديم اقتراحات دقيقة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialty" className="flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" />
                تخصص العيادة
              </Label>
              <Input
                id="specialty"
                name="specialty"
                placeholder="مثال: طب الأطفال، الجلدية، الأسنان..."
                value={settings.context.specialty}
                onChange={handleContextChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doctor_persona">شخصية المساعد</Label>
              <Input
                id="doctor_persona"
                name="doctor_persona"
                placeholder="مثال: رسمي، ودود، علمي بحت..."
                value={settings.context.doctor_persona}
                onChange={handleContextChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinic_goal">الهدف الرئيسي للعيادة</Label>
            <Textarea
              id="clinic_goal"
              name="clinic_goal"
              placeholder="مثال: التركيز على الطب الوقائي وتثقيف المرضى..."
              className="min-h-[80px]"
              value={settings.context.clinic_goal}
              onChange={handleContextChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom_instructions">تعليمات خاصة (Prompt System)</Label>
            <Textarea
              id="custom_instructions"
              name="custom_instructions"
              placeholder="أي تعليمات إضافية تريد أن يلتزم بها الذكاء الاصطناعي دائمًا..."
              className="min-h-[100px]"
              value={settings.context.custom_instructions}
              onChange={handleContextChange}
            />
            <p className="text-xs text-muted-foreground">
              هذه التعليمات ستضاف إلى كل طلب يتم إرساله للذكاء الاصطناعي لضمان الالتزام بمعاييرك.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleSave} 
          disabled={isPending}
          className="min-w-[120px] gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              حفظ التغييرات
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
