import { Button } from "../../../components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AppHeader() {
  const navigate = useNavigate();
  
  return (
    <div className="w-full sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
      <div className="max-w-4xl mx-auto p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tabibi-apps")}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-lg">تفاصيل التطبيق</h1>
      </div>
    </div>
  );
}
