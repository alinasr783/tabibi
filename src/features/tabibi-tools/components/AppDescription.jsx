export default function AppDescription({ app }) {
  if (!app.full_description) return null;

  return (
    <div className="w-full bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="space-y-3">
          <h3 className="font-bold text-lg">عن التطبيق</h3>
          <div className="text-sm text-muted-foreground leading-7 whitespace-pre-line">
            {app.full_description}
          </div>
        </div>
      </div>
    </div>
  );
}
