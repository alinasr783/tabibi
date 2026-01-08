import { Key, User, Settings, Palette, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import ChangePasswordTab from "./ChangePasswordTab";
import PersonalInfoTab from "./PersonalInfoTab";
import NotificationsTab from "./NotificationsTab";
import { PersonalizationSettings } from "../user-preferences/PersonalizationSettings";
import { useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";

const tabs = [
  { id: "personal", label: "بياناتك", fullLabel: "بياناتك الشخصية", icon: User },
  { id: "password", label: "الباسوورد", fullLabel: "غير الباسوورد", icon: Key },
  { id: "personalization", label: "المظهر", fullLabel: "المظهر والألوان", icon: Palette },
  { id: "notifications", label: "الإشعارات", fullLabel: "الإشعارات والإيميل", icon: Bell },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("personal");
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

      <Card className="bg-card/70 overflow-hidden">
        <CardHeader className="p-0">
          {/* Scrollable tabs on mobile */}
          <div className="flex overflow-x-auto scrollbar-hide border-b border-border">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              
              return (
                <button
                  key={tab.id}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0",
                    activeTab === tab.id
                      ? "text-primary border-b-2 border-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="w-4 h-4" />
                  <span className="sm:hidden">{tab.label}</span>
                  <span className="hidden sm:inline">{tab.fullLabel}</span>
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="mt-2 sm:mt-4">
            {activeTab === "personal" && <PersonalInfoTab />}
            {activeTab === "password" && <ChangePasswordTab />}
            {activeTab === "personalization" && <PersonalizationSettings />}
            {activeTab === "notifications" && <NotificationsTab />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}