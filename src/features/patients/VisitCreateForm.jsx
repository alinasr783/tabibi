import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Textarea } from "../../components/ui/textarea"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Plus, X, Loader2 } from "lucide-react"
import useCreateVisit from "./useCreateVisit"
import SpeechButton from "../../components/ui/SpeechButton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog"
import { usePatientPlans, useCreatePatientPlan } from "./usePatientPlans"
import useTreatmentTemplates from "../treatment-plans/useTreatmentTemplates"

function AddPlanDialog({ open, onClose, patientId, onPlanCreated }) {
    const { data: templates, isLoading: isLoadingTemplates } = useTreatmentTemplates()
    const { mutate: createPlan, isPending: isCreating } = useCreatePatientPlan()
    const [selectedTemplateId, setSelectedTemplateId] = useState("")
    const [sessions, setSessions] = useState(1)

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!selectedTemplateId) return

        const template = templates.find(t => String(t.id) === String(selectedTemplateId))
        if (!template) return

        const payload = {
            patient_id: patientId,
            template_id: selectedTemplateId,
            total_sessions: parseInt(sessions),
            total_price: template.session_price * parseInt(sessions),
            status: "active"
        }

        createPlan(payload, {
            onSuccess: (data) => {
                // data is the created plan (or response)
                // We assume data.id or similar is returned. 
                // If not, we might need to rely on the refetch.
                // Supabase insert usually returns data if select() is used.
                onPlanCreated(data?.id)
                onClose()
            },
            onError: (error) => {
                console.error("Failed to create plan:", error)
            }
        })
    }

    const selectedTemplate = templates?.find(t => String(t.id) === String(selectedTemplateId))

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent className="sm:max-w-[425px]" dir="rtl">
                <DialogHeader>
                    <DialogTitle>إضافة خطة علاجية جديدة</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>اختر الخطة</Label>
                        <Select value={String(selectedTemplateId)} onValueChange={setSelectedTemplateId}>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر خطة..." />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingTemplates ? (
                                    <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                                ) : templates?.map(t => (
                                    <SelectItem key={t.id} value={String(t.id)}>{t.name} ({t.session_price} ج.م)</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedTemplate && (
                        <div className="space-y-2">
                            <Label>عدد الجلسات</Label>
                            <Input 
                                type="number" 
                                min="1" 
                                value={sessions} 
                                onChange={(e) => setSessions(e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">
                                الإجمالي: {selectedTemplate.session_price * sessions} ج.م
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
                        <Button type="submit" disabled={!selectedTemplateId || isCreating}>
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default function VisitCreateForm({ patientId, patientPlanId: externalPatientPlanId, appointmentId, onVisitCreated, onCancel }) {
    const [diagnosis, setDiagnosis] = useState("")
    const [notes, setNotes] = useState("")
    const [medications, setMedications] = useState([])
    const [newMedication, setNewMedication] = useState({ name: "", using: "" })
    const [selectedPlanId, setSelectedPlanId] = useState(externalPatientPlanId || "")
    const [isAddPlanOpen, setIsAddPlanOpen] = useState(false)
    
    // Fetch patient plans for this patient
    const { data: patientPlans, isLoading: isPlansLoading } = usePatientPlans(patientId)
    
    const { mutate: createVisit, isPending: isCreating } = useCreateVisit()

    const handleAddMedicationField = () => {
        if (newMedication.name.trim() !== "" && newMedication.using.trim() !== "") {
            setMedications([...medications, { ...newMedication }])
            setNewMedication({ name: "", using: "" })
        }
    }

    const handleRemoveMedication = (index) => {
        setMedications(medications.filter((_, i) => i !== index))
    }

    const handleSpeechTranscript = (newTranscript) => {
        // Append new transcript to existing notes with proper spacing
        setNotes(prevNotes => {
            if (!prevNotes) return newTranscript;
            if (!newTranscript) return prevNotes;
            
            // Add space if previous notes don't end with space or punctuation
            const shouldAddSpace = !/[\s.،,؟!؛]$/u.test(prevNotes.trim());
            return prevNotes + (shouldAddSpace ? " " : "") + newTranscript;
        });
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        
        // Validate required fields
        if (!diagnosis.trim()) {
            // Create error message element
            const errorMessage = document.createElement('div')
            errorMessage.className = 'text-sm text-red-500 mt-1'
            errorMessage.textContent = 'التشخيص المبدئي مطلوب'
            errorMessage.id = 'diagnosis-error'
            
            // Remove existing error if any
            const existingError = document.getElementById('diagnosis-error')
            if (existingError) {
                existingError.remove()
            }
            
            // Add error message after diagnosis input
            const diagnosisInput = document.getElementById('diagnosis')
            if (diagnosisInput) {
                diagnosisInput.parentNode.appendChild(errorMessage)
                
                // Remove error message after 3 seconds
                setTimeout(() => {
                    const errorMessage = document.getElementById('diagnosis-error')
                    if (errorMessage && errorMessage.parentNode) {
                        errorMessage.parentNode.removeChild(errorMessage)
                    }
                }, 3000)
            }
            
            return
        }
        
        // Prepare medications array - only include medications with both name and using
        const validMedications = medications.filter(
            med => med.name.trim() !== "" && med.using.trim() !== ""
        )
        
        // Prepare visit data
        const visitData = {
            patient_id: patientId,
            diagnosis,
            notes
        }

        // Add appointment_id if provided
        if (appointmentId) {
            // Note: In Supabase, foreign keys to 'appointments' might be named differently
            // or the schema might not have been updated to include this relationship.
            // Based on the schema provided, the visits table does not have an appointment_id column.
            // However, we should check if there's another way to link them, or if the column name is different.
            // For now, we'll omit it to prevent the error, as the backend rejects unknown columns.
            
            // If the schema is updated later to include appointment_id, uncomment the line below:
            // visitData.appointment_id = appointmentId
            
            // Alternatively, we can store it in notes for reference if critical
             visitData.notes = (visitData.notes ? visitData.notes + "\n\n" : "") + `Appointment Ref: ${appointmentId}`
        }
        
        // Add patient_plan_id if selected
        const finalPatientPlanId = selectedPlanId || externalPatientPlanId
        if (finalPatientPlanId) {
            visitData.patient_plan_id = finalPatientPlanId
        }
        
        console.log("VisitCreateForm: Submitting visit data", visitData)
        
        // Only add medications if there are valid ones
        if (validMedications.length > 0) {
            visitData.medications = validMedications
        }
        
        createVisit(visitData, {
            onSuccess: () => {
                console.log("VisitCreateForm: Visit created successfully")
                // Reset form
                setDiagnosis("")
                setNotes("")
                setMedications([])
                setNewMedication({ name: "", using: "" })
                setSelectedPlanId("")
                
                // Notify parent component
                if (onVisitCreated) onVisitCreated()
            },
            onError: (error) => {
                console.error("VisitCreateForm: Error creating visit", error)
            }
        })
    }

    console.log("VisitCreateForm: Rendering with props", { patientId, externalPatientPlanId, selectedPlanId })

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    {/* Patient Plan Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="patient-plan">خطة العلاج (اختياري)</Label>
                        <div className="flex gap-2">
                            <Select 
                            value={String(selectedPlanId || externalPatientPlanId || "")} 
                            onValueChange={(val) => {
                                console.log("Plan selected:", val);
                                setSelectedPlanId(val === "none" ? "" : val);
                            }}
                            disabled={isPlansLoading}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="اختر خطة العلاج" />
                            </SelectTrigger>
                            <SelectContent>
                                {isPlansLoading ? (
                                    <SelectItem value="loading" disabled>
                                        جاري التحميل...
                                    </SelectItem>
                                ) : patientPlans && patientPlans.length > 0 ? (
                                    <>
                                        <SelectItem value="none">بدون خطة علاج</SelectItem>
                                        {patientPlans.map((plan) => (
                                            <SelectItem key={plan.id} value={String(plan.id)}>
                                                {plan.treatment_templates?.name || 'خطة علاجية'} - {plan.completed_sessions || 0}/{plan.total_sessions} جلسات مكتملة
                                            </SelectItem>
                                        ))}
                                    </>
                                ) : (
                                    <SelectItem value="no-plans" disabled>
                                        لا توجد خطط علاجية مضافة لهذا المريض
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                            
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setIsAddPlanOpen(true)}
                                title="إضافة خطة علاجية جديدة"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        {(!patientPlans || patientPlans.length === 0) && (
                            <p className="text-xs text-muted-foreground mt-1.5 px-1">
                                * لا توجد خطط علاجية. يمكنك إضافة خطة جديدة بالضغط على زر (+).
                            </p>
                        )}
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="diagnosis">التشخيص المبدئي *</Label>
                        <Input
                            id="diagnosis"
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            placeholder="أدخل التشخيص المبدئي"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">الملاحظات</Label>
                        <div className="relative">
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="اكتب الملاحظات أو استخدم الميكروفون للتحدث"
                                rows={4}
                            />
                            <div className="absolute left-2 bottom-2">
                                <SpeechButton 
                                    onTranscriptChange={handleSpeechTranscript}
                                    isDisabled={isCreating}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>الأدوية</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddMedicationField}
                                disabled={!newMedication.name.trim() || !newMedication.using.trim()}
                                className="gap-1.5"
                            >
                                <Plus className="w-4 h-4" />
                                إضافة
                            </Button>
                        </div>

                        {/* New medication input fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-[var(--radius)] bg-muted/30 border">
                            <div className="space-y-2">
                                <Label htmlFor="medicationName" className="text-xs">اسم الدواء</Label>
                                <Input
                                    id="medicationName"
                                    value={newMedication.name}
                                    onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                                    placeholder="مثل: باراسيتامول"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="medicationUsing" className="text-xs">طريقة الاستخدام</Label>
                                <Input
                                    id="medicationUsing"
                                    value={newMedication.using}
                                    onChange={(e) => setNewMedication({ ...newMedication, using: e.target.value })}
                                    placeholder="مثل: 3 مرات يومياً"
                                />
                            </div>
                        </div>

                        {/* Added medications list */}
                        {medications.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-medium text-muted-foreground">الأدوية المضافة</h4>
                                {medications.map((med, index) => (
                                    <div key={index} className="flex items-start gap-2 p-3 rounded-[var(--radius)] bg-muted/50 border">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <span className="text-xs font-medium text-primary">{index + 1}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">{med.name}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{med.using}</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="shrink-0 h-6 w-6 text-destructive hover:text-destructive"
                                            onClick={() => handleRemoveMedication(index)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-[25%]"
                        onClick={() => {
                            if (onCancel) {
                                onCancel()
                            } else if (onVisitCreated) {
                                onVisitCreated()
                            }
                        }}
                    >
                        إلغاء
                    </Button>
                    <Button type="submit" disabled={isCreating} className="w-[75%]">
                        {isCreating ? "جاري الحفظ..." : "حفظ الكشف"}
                    </Button>
                </div>
            </form>

            <AddPlanDialog 
                open={isAddPlanOpen} 
                onClose={() => setIsAddPlanOpen(false)} 
                patientId={patientId}
                onPlanCreated={(newPlanId) => {
                    setSelectedPlanId(newPlanId)
                }}
            />
        </>
    )
}