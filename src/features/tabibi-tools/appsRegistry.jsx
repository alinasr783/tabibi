import { 
  Bot, 
  MessageCircle, 
  BarChart3, 
  Globe, 
  ShieldCheck,
  UserCircle,
  Calendar,
  Handshake
} from "lucide-react";

// Import real components
import AskTabibiPage from "../ask-tabibi/AskTabibiPage"; 
import TabibiProfileApp from "./apps/tabibi-profile/TabibiProfileApp";
import AdvancedOnlineBooking from "../online-booking/apps/AdvancedOnlineBooking";
import TabibiAffiliateApp from "./apps/tabibi-affiliate/TabibiAffiliateApp";

export const APPS_COMPONENT_REGISTRY = {
  'ai_assistant': AskTabibiPage,
  'tabibi_profile': TabibiProfileApp,
  'advanced_online_booking': AdvancedOnlineBooking,
  'tabibi_affiliate': TabibiAffiliateApp
};

export const APPS_ICON_REGISTRY = {
  'Bot': Bot,
  'MessageCircle': MessageCircle,
  'BarChart3': BarChart3,
  'Globe': Globe,
  'ShieldCheck': ShieldCheck,
  'UserCircle': UserCircle,
  'Calendar': Calendar,
  'Handshake': Handshake
};
