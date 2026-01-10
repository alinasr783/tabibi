import { Check } from "lucide-react";

export default function AppFeatures({ app }) {
  const featuresList = typeof app.features === 'string' ? JSON.parse(app.features) : (app.features || []);

  if (featuresList.length === 0) return null;

  return (
    <div className="w-full bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="space-y-4">
          <h3 className="font-bold text-lg">المميزات الرئيسية</h3>
          <div className="space-y-3">
            {featuresList.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="mt-0.5 bg-primary/10 text-primary rounded-full p-1 shrink-0">
                   <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm leading-relaxed text-foreground/90">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
