import { Link } from "react-router-dom";
import { Stethoscope } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="size-5 text-primary" />
          <span className="font-semibold">Tabibi</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <span className="hidden sm:inline text-muted-foreground">•</span>
          <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            سياسة الخصوصية
          </Link>
          <span className="hidden sm:inline text-muted-foreground">•</span>
          <Link to="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            شروط الخدمة
          </Link>
          <span className="hidden sm:inline text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground">
            © جميع الحقوق محفوظة
          </span>
        </div>
      </div>
    </footer>
  );
}
