import { Card, CardContent } from "../../components/ui/card";
import { SkeletonLine } from "../../components/ui/skeleton";
import SecretarySkeleton from "./SecretarySkeleton";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, ArrowLeft, Settings } from "lucide-react";
import { Badge } from "../../components/ui/badge";

export default function SecretsSection({
  secretaries,
  isSecretariesLoading,
  isSecretariesError,
}) {
  const navigate = useNavigate();

  return (
    <div className="p-3 sm:p-4 md:p-6">
      {isSecretariesLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <SecretarySkeleton key={i} />
          ))}
        </div>
      ) : isSecretariesError ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-3">
            <Users className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-sm text-destructive">حصل خطأ في تحميل الموظفين</p>
        </div>
      ) : secretaries && secretaries.length > 0 ? (
        <div className="space-y-4">
          {/* Staff List Preview */}
          <div className="space-y-2">
            {secretaries.slice(0, 3).map((secretary) => (
              <div
                key={secretary.user_id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {secretary.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {secretary.phone}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  موظف
                </Badge>
              </div>
            ))}
          </div>

          {/* Show More Indicator */}
          {secretaries.length > 3 && (
            <p className="text-xs text-center text-muted-foreground">
              و {secretaries.length - 3} موظف آخر
            </p>
          )}

          {/* Manage Button */}
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => navigate('/staff')}
              className="w-full border-primary/20 text-primary hover:bg-primary/10 flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              إدارة الموظفين
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium text-foreground mb-2">
            مفيش موظفين
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            ضيف موظفين لمساعدتك في إدارة العيادة
          </p>
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => navigate('/staff')}
              className="flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              روح لصفحة الموظفين
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}