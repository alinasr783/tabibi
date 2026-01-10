import { 
  Bot, 
  MessageCircle, 
  BarChart3, 
  Globe, 
  ShieldCheck,
  UserCircle 
} from "lucide-react";

// Import real components
import AskTabibiPage from "../ask-tabibi/AskTabibiPage"; 
import TabibiProfileApp from "./apps/tabibi-profile/TabibiProfileApp";

export const APPS_COMPONENT_REGISTRY = {
  'ai_assistant': AskTabibiPage,
  'tabibi_profile': TabibiProfileApp
};

export const APPS_ICON_REGISTRY = {
  'Bot': Bot,
  'MessageCircle': MessageCircle,
  'BarChart3': BarChart3,
  'Globe': Globe,
  'ShieldCheck': ShieldCheck,
  'UserCircle': UserCircle
};
