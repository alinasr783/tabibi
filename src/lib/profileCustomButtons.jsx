import {
  Calendar,
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Link,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  Twitter,
  Youtube,
  Zap,
} from "lucide-react";

export const PROFILE_CUSTOM_BUTTON_ICON_OPTIONS = [
  { value: "link", label: "رابط", Icon: Link },
  { value: "external", label: "فتح", Icon: ExternalLink },
  { value: "phone", label: "اتصال", Icon: Phone },
  { value: "whatsapp", label: "واتساب", Icon: MessageCircle },
  { value: "location", label: "موقع", Icon: MapPin },
  { value: "mail", label: "إيميل", Icon: Mail },
  { value: "calendar", label: "حجز", Icon: Calendar },
  { value: "globe", label: "ويب", Icon: Globe },
  { value: "facebook", label: "Facebook", Icon: Facebook },
  { value: "instagram", label: "Instagram", Icon: Instagram },
  { value: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { value: "x", label: "X", Icon: Twitter },
  { value: "youtube", label: "YouTube", Icon: Youtube },
  { value: "tiktok", label: "TikTok", Icon: Music2 },
  { value: "thndr", label: "Thndr", Icon: Zap },
];

export const PROFILE_SOCIAL_BUTTON_TEMPLATES = [
  {
    key: "facebook",
    label: "فيسبوك",
    icon: "facebook",
    color: "#1877F2",
    placeholder: "https://facebook.com/...",
  },
  {
    key: "instagram",
    label: "انستجرام",
    icon: "instagram",
    color: "#E1306C",
    placeholder: "https://instagram.com/...",
  },
  {
    key: "linkedin",
    label: "لينكد إن",
    icon: "linkedin",
    color: "#0A66C2",
    placeholder: "https://linkedin.com/in/...",
  },
  {
    key: "x",
    label: "X",
    icon: "x",
    color: "#111827",
    placeholder: "https://x.com/...",
  },
  {
    key: "youtube",
    label: "يوتيوب",
    icon: "youtube",
    color: "#FF0000",
    placeholder: "https://youtube.com/...",
  },
  {
    key: "tiktok",
    label: "تيك توك",
    icon: "tiktok",
    color: "#111827",
    placeholder: "https://tiktok.com/@...",
  },
  {
    key: "thndr",
    label: "ثاندر",
    icon: "thndr",
    color: "#0A1F44",
    placeholder: "https://...",
  },
];

const ICON_MAP = Object.fromEntries(PROFILE_CUSTOM_BUTTON_ICON_OPTIONS.map((o) => [o.value, o.Icon]));

export function getProfileCustomButtonIcon(iconKey) {
  return ICON_MAP[iconKey] || Link;
}
