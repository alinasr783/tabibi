import { useParams, useNavigate } from "react-router-dom";
import { APPS_COMPONENT_REGISTRY } from "../tabibi-tools/appsRegistry.jsx";
import { Button } from "../../components/ui/button";
import { ArrowRight, AlertTriangle } from "lucide-react";

export default function MyAppViewer() {
  const { appKey } = useParams();
  const navigate = useNavigate();

  const Component = APPS_COMPONENT_REGISTRY[appKey];

  if (!Component) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="bg-destructive/10 p-4 rounded-full text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold">التطبيق غير موجود أو غير مدعوم حالياً</h2>
        <Button onClick={() => navigate("/my-apps")}>
          <ArrowRight className="h-4 w-4 ml-2" />
          عودة لتطبيقاتي
        </Button>
      </div>
    );
  }

  // Render the component
  return (
    <div className="animate-in fade-in duration-300 w-full h-full">
      <Component />
    </div>
  );
}
