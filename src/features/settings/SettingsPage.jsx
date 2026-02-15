import { Key, User, Settings, Palette, Bell, ClipboardList } from "lucide-react";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import ChangePasswordTab from "./ChangePasswordTab";
import PersonalInfoTab from "./PersonalInfoTab";
import NotificationsTab from "./NotificationsTab";
import { PersonalizationSettings } from "../user-preferences/PersonalizationSettings";
import { useLocation } from "react-router-dom";
import MedicalFieldsSettingsTab from "./MedicalFieldsSettingsTab";

const tabs = [
  { id: "personal", label: "بياناتك", fullLabel: "بياناتك الشخصية", icon: User },
  { id: "password", label: "الباسوورد", fullLabel: "غير الباسوورد", icon: Key },
  { id: "personalization", label: "المظهر", fullLabel: "المظهر والألوان", icon: Palette },
  { id: "notifications", label: "الإشعارات", fullLabel: "الإشعارات والإيميل", icon: Bell },
  { id: "medical-fields", label: "الحقول", fullLabel: "تخصيص الحقول", icon: ClipboardList },
];

export default function SettingsPage() {
  const location = useLocation();
  
  // Apply scroll to top on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 bg-background min-h-screen pb-24 md:pb-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="p-1.5 sm:p-2 rounded-[var(--radius)] bg-primary/10 text-primary">
          <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">الإعدادات</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">تحكم في حسابك وإعداداتك</p>
        </div>
      </div>

      <Tabs defaultValue="personal" className="w-full" style={{ direction: 'rtl' }}>
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full h-auto p-1 sm:p-1.5 bg-muted/50 rounded-[var(--radius)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger 
                key={tab.id}
                value={tab.id} 
                className="text-xs sm:text-sm py-2.5 sm:py-3 px-2 data-[state=active]:bg-background rounded-[var(--radius)] transition-all duration-200"
              >
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="sm:hidden">{tab.label}</span>
                  <span className="hidden sm:inline">{tab.fullLabel}</span>
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="personal" className="mt-4 sm:mt-6">
          <PersonalInfoTab />
        </TabsContent>

        <TabsContent value="password" className="mt-4 sm:mt-6">
          <ChangePasswordTab />
        </TabsContent>

        <TabsContent value="personalization" className="mt-4 sm:mt-6">
          <PersonalizationSettings />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 sm:mt-6">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="medical-fields" className="mt-4 sm:mt-6">
          <MedicalFieldsSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
