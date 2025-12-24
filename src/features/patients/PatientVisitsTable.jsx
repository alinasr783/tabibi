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
                    <div key={i} className="h-20 bg-muted rounded-lg animate-pulse"></div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-3" style={{ direction: 'rtl' }}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">الكشوفات</h3>
                <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    كشف جديد
                </Button>
            </div>

            {/* Visits List */}
            {visits && visits.length > 0 ? (
                <div className="space-y-2">
                    {visits.map((visit) => (
                        <div
                            key={visit.id}
                            onClick={() => navigate(`/patients/${patientId}/visits/${visit.id}`)}
                            className="cursor-pointer"
                        >
                            <Card className="hover:bg-muted/50 transition-colors group">
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            {/* Diagnosis */}
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-primary shrink-0" />
                                                <span className="font-medium text-sm truncate">
                                                    {visit.diagnosis || "لا يوجد تشخيص"}
                                                </span>
                                            </div>
                                            {/* Date & Medications count */}
                                            <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {visit.created_at 
                                                        ? format(new Date(visit.created_at), "d MMM yyyy", { locale: ar })
                                                        : "غير محدد"
                                                    }
                                                </span>
                                                {visit.medications && visit.medications.length > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Stethoscope className="w-3.5 h-3.5" />
                                                        {visit.medications.length} دواء
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                    مفيش كشوفات للمريض ده
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