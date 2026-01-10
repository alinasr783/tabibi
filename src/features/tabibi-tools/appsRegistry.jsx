import { 
  Bot, 
  MessageCircle, 
  BarChart3, 
  Globe, 
  ShieldCheck 
} from "lucide-react";

// Placeholder components for now
const WhatsAppCampaigns = () => <div className="p-10 text-center"><h1>حملات واتساب (قريباً)</h1></div>;
const AdvancedReports = () => <div className="p-10 text-center"><h1>التقارير المتقدمة (قريباً)</h1></div>;
const ClinicWebsite = () => <div className="p-10 text-center"><h1>الموقع الإلكتروني (قريباً)</h1></div>;
const InsuranceManager = () => <div className="p-10 text-center"><h1>إدارة التأمين (قريباً)</h1></div>;

// Import real components if they exist
import AskTabibiPage from "../ask-tabibi/AskTabibiPage"; 

export const APPS_COMPONENT_REGISTRY = {
  'ai_assistant': AskTabibiPage,
  'whatsapp_campaigns': WhatsAppCampaigns,
  'advanced_reports': AdvancedReports,
  'clinic_website': ClinicWebsite,
  'insurance_manager': InsuranceManager
};

export const APPS_ICON_REGISTRY = {
  'Bot': Bot,
  'MessageCircle': MessageCircle,
  'BarChart3': BarChart3,
  'Globe': Globe,
  'ShieldCheck': ShieldCheck
};
