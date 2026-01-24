import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Eye, Plus, Calendar, FileText, Stethoscope } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "../../components/ui/dialog"
import VisitCreateForm from "./VisitCreateForm"
import { usePatientPlans } from "./usePatientPlans"

export default function PatientVisitsTable({ visits, isLoading, patientId, onVisitAdded }) {
    const navigate = useNavigate()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedPlanId, setSelectedPlanId] = useState(null)
    
    // Fetch patient plans for this patient
    const { data: patientPlans, isLoading: isPlansLoading } = usePatientPlans(patientId)

    const handleVisitAdded = () => {
        if (onVisitAdded) onVisitAdded()
        setIsModalOpen(false)
    }

    if (isLoading) {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="h-5 w-24 bg-muted rounded animate-pulse"></div>
                    <div className="h-9 w-28 bg-muted rounded animate-pulse"></div>
                </div>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted rounded-[var(--radius)] animate-pulse"></div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-4" style={{ direction: 'rtl' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-primary" />
                    سجل الكشوفات
                </h3>
                <Button size="sm" variant="outline" onClick={() => setIsModalOpen(true)} className="gap-1.5 h-8 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary hover:text-primary">
                    <Plus className="w-3.5 h-3.5" />
                    كشف جديد
                </Button>
            </div>

            {/* Visits List */}
            {visits && visits.length > 0 ? (
                <div className="space-y-3">
                    {visits.map((visit) => (
                        <div
                            key={visit.id}
                            onClick={() => navigate(`/patients/${patientId}/visits/${visit.id}`)}
                            className="cursor-pointer group relative"
                        >
                            <Card className="overflow-hidden border-border/60 hover:border-primary/30 hover:shadow-sm transition-all duration-300 bg-card">
                                <CardContent className="p-0">
                                    <div className="flex items-stretch">
                                        {/* Date Column - Kept as requested but refined */}
                                        <div className="w-20 flex flex-col items-center justify-center border-l border-border/60 bg-muted/5 p-2 shrink-0 group-hover:bg-primary/5 transition-colors">
                                            <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                                                {visit.created_at ? format(new Date(visit.created_at), "d") : "-"}
                                            </span>
                                            <span className="text-xs font-medium text-muted-foreground uppercase">
                                                {visit.created_at ? format(new Date(visit.created_at), "MMM", { locale: ar }) : "-"}
                                            </span>
                                        </div>

                                        {/* Content - Modern Structure */}
                                        <div className="flex-1 p-3.5 flex flex-col justify-center gap-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    {visit.visit_type && (
                                                        <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border shadow-sm ${
                                                            visit.visit_type === 'consultation' 
                                                            ? 'bg-white text-purple-700 border-purple-200 dark:bg-slate-950 dark:text-purple-400 dark:border-purple-800' 
                                                            : 'bg-white text-blue-700 border-blue-200 dark:bg-slate-950 dark:text-blue-400 dark:border-blue-800'
                                                        }`}>
                                                            {visit.visit_type === 'consultation' ? 'استشارة' : 'كشف'}
                                                        </span>
                                                    )}
                                                    
                                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                                        <FileText className="w-3.5 h-3.5 text-muted-foreground/70" />
                                                        {visit.diagnosis || "تشخيص عام"}
                                                    </div>
                                                </div>

                                                {/* Medications Badge - Minimalist */}
                                                {visit.medications && visit.medications.length > 0 && (
                                                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/10 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-800">
                                                        <Stethoscope className="w-3.5 h-3.5" />
                                                        {visit.medications.length} أدوية
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Hint */}
                                        <div className="w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-r border-border/30 bg-muted/5">
                                           <Eye className="w-4 h-4 text-primary/70" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-muted-foreground/20">
                    <Stethoscope className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">مفيش كشوفات سابقة</p>
                    <Button variant="link" onClick={() => setIsModalOpen(true)} className="mt-2 h-auto p-0 text-primary">
                        بدء كشف جديد
                    </Button>
                </div>
            )}

            {/* Create Visit Dialog */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <h3 className="text-lg font-semibold">كشف جديد</h3>
                    </DialogHeader>
                    <VisitCreateForm 
                        patientId={patientId}
                        patientPlanId={selectedPlanId}
                        onVisitCreated={handleVisitAdded}
                    />
                </DialogContent>
            </Dialog>
        </div>
    )
}