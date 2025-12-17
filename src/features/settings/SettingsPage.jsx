import { Key, User } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import ChangePasswordTab from "./ChangePasswordTab";
import PersonalInfoTab from "./PersonalInfoTab";
import { useLocation } from "react-router-dom";

const tabs = [
  { id: "personal", label: "البيانات الشخصية", icon: User },
  { id: "password", label: "تغيير كلمة المرور", icon: Key },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("personal");
  const location = useLocation();
  
  // Apply scroll to top on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">الإعدادات</h1>
            <p className="text-sm text-muted-foreground">
              إدارة حسابك وإعدادات العيادة
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="p-0">
          <div className="flex border-b border-border">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              
              return (
                <button
                  key={tab.id}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "text-primary border-b-2 border-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mt-4">
            {activeTab === "personal" && <PersonalInfoTab />}
            {activeTab === "password" && <ChangePasswordTab />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}