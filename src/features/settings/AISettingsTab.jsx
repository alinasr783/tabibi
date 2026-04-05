import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { useUserPreferences, useUpdateUserPreferences } from "../../hooks/useUserPreferences";
import { Bot, Brain, Sparkles, Stethoscope, Save, Loader2 } from "lucide-react";
import { toast as hotToast } from "react-hot-toast";
import { toast as sonnerToast } from "sonner";
import { NotificationToast } from "../Notifications/NotificationToast";

export default function AISettingsTab() {
  const { data: preferences, isLoading } = useUserPreferences();
  const { mutate: updatePreferences, isPending } = useUpdateUserPreferences();
  
  const [settings, setSettings] = useState({
    enabled_pages: {
      patient_file: true,
      appointment_details: true,
      visit_details: true,
      medical_fields: true
    },
    features: {
      suggest_medications: true,
      suggest_diagnosis: true,
      unified_context: true
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
        features: {
          ...prev.features,
          ...(preferences.ai_settings.features || {})
        },
        context: {
          ...prev.context,
          ...(preferences.ai_settings.context || {})
        }
      }));
    }
  }, [preferences]);

  const handleTogglePage = (pageKey) => {
    const nextSettings = {
      ...settings,
      enabled_pages: {
        ...settings.enabled_pages,
        [pageKey]: !settings.enabled_pages[pageKey]
      }
    };
    setSettings(nextSettings);
    autoSave(nextSettings);
  };

  const handleToggleFeature = (featureKey) => {
    const nextSettings = {
      ...settings,
      features: {
        ...settings.features,
        [featureKey]: !settings.features[featureKey]
      }
    };
    setSettings(nextSettings);
    autoSave(nextSettings);
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

  const autoSave = (nextSettings) => {
    updatePreferences(
      { 
        ai_settings: nextSettings 
      },
      {
        onSuccess: () => {
          sonnerToast.custom((id) => (
            <NotificationToast
              id={id}
              notification={{
                title: "تم الحفظ تلقائياً",
                message: "تم تحديث تفضيلات الذكاء الاصطناعي بنجاح",
                type: "success",
                created_at: new Date().toISOString(),
              }}
              onClick={() => {}}
            />
          ), {
            duration: 2000,
            position: 'top-center'
          });
        }
      }
    );
  };

  const handleSave = () => {
    updatePreferences(
      { 
        ai_settings: settings 
      },
      {
        onSuccess: () => {
          // Modern Tabibi Notification Style
          sonnerToast.custom((id) => (
            <NotificationToast
              id={id}
              notification={{
                title: "تم الحفظ بنجاح",
                message: "تم تحديث إعدادات الذكاء الاصطناعي بنجاح",
                type: "success",
                created_at: new Date().toISOString(),
              }}
              onClick={() => {}}
            />
          ), {
            duration: 3000,
            position: 'top-center'
          });
        },
        onError: () => {
          hotToast.error("حدث خطأ أثناء حفظ الإعدادات");
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
                يظهر في صفحة ملف المريض للمساعدة في تلخيص الحالة وتحديث البيانات الشخصية والطبية
              </p>
            </div>
            <Switch
              id="ai-patient-file"
              checked={settings.enabled_pages.patient_file}
              onCheckedChange={() => handleTogglePage('patient_file')}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
            <div className="space-y-0.5">
              <Label className="text-base cursor-pointer" htmlFor="ai-appointment-details">
                مساعد تفاصيل الحجز
              </Label>
              <p className="text-xs text-muted-foreground">
                يظهر في نافذة تفاصيل الحجز للمساعدة في تحديث المواعيد وتغيير الحالة
              </p>
            </div>
            <Switch
              id="ai-appointment-details"
              checked={settings.enabled_pages.appointment_details}
              onCheckedChange={() => handleTogglePage('appointment_details')}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
            <div className="space-y-0.5">
              <Label className="text-base cursor-pointer" htmlFor="ai-visit-details">
                مساعد تفاصيل الكشف
              </Label>
              <p className="text-xs text-muted-foreground">
                يظهر في صفحة الكشف لمساعدتك في كتابة التشخيص والعلاج والأدوية
              </p>
            </div>
            <Switch
              id="ai-visit-details"
              checked={settings.enabled_pages.visit_details}
              onCheckedChange={() => handleTogglePage('visit_details')}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
            <div className="space-y-0.5">
              <Label className="text-base cursor-pointer" htmlFor="ai-medical-fields">
                مهندس الحقول الذكي
              </Label>
              <p className="text-xs text-muted-foreground">
                يظهر في صفحة تخصيص الحقول لمساعدتك في بناء وتعديل هيكلة بيانات العيادة
              </p>
            </div>
            <Switch
              id="ai-medical-fields"
              checked={settings.enabled_pages.medical_fields}
              onCheckedChange={() => handleTogglePage('medical_fields')}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Features & Logic */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            قدرات المساعد الذكي
          </CardTitle>
          <CardDescription>
            تحكم في الوظائف والذكاء المتقدم للمساعد الطبي
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
            <div className="space-y-0.5">
              <Label className="text-base cursor-pointer" htmlFor="ai-suggest-medications">
                اقتراح الأدوية
              </Label>
              <p className="text-xs text-muted-foreground">
                السماح للذكاء الاصطناعي باقتراح الأدوية بناءً على التشخيص والأعراض
              </p>
            </div>
            <Switch
              id="ai-suggest-medications"
              checked={settings.features.suggest_medications}
              onCheckedChange={() => handleToggleFeature('suggest_medications')}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
            <div className="space-y-0.5">
              <Label className="text-base cursor-pointer" htmlFor="ai-suggest-diagnosis">
                اقتراح التشخيص
              </Label>
              <p className="text-xs text-muted-foreground">
                السماح للذكاء الاصطناعي بتحليل الأعراض واقتراح تشخيصات محتملة
              </p>
            </div>
            <Switch
              id="ai-suggest-diagnosis"
              checked={settings.features.suggest_diagnosis}
              onCheckedChange={() => handleToggleFeature('suggest_diagnosis')}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
            <div className="space-y-0.5">
              <Label className="text-base cursor-pointer" htmlFor="ai-unified-context">
                ربط وظائف المساعدين (Unified Context)
              </Label>
              <p className="text-xs text-muted-foreground">
                عند التفعيل، يستطيع المساعد في أي صفحة (مثل الكشف) تعديل بيانات في صفحات أخرى (مثل ملف المريض)
              </p>
            </div>
            <Switch
              id="ai-unified-context"
              checked={settings.features.unified_context}
              onCheckedChange={() => handleToggleFeature('unified_context')}
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
