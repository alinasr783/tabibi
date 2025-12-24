import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Textarea } from "../../components/ui/textarea"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Plus, X } from "lucide-react"
import useCreateVisit from "./useCreateVisit"
import SpeechButton from "../../components/ui/SpeechButton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import { usePatientPlans } from "./usePatientPlans"

export default function VisitCreateForm({ patientId, patientPlanId: externalPatientPlanId, onVisitCreated, onCancel }) {
    const [diagnosis, setDiagnosis] = useState("")
    const [notes, setNotes] = useState("")
    const [medications, setMedications] = useState([])
    const [newMedication, setNewMedication] = useState({ name: "", using: "" })
    const [selectedPlanId, setSelectedPlanId] = useState(externalPatientPlanId || "")
    
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
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                {/* Patient Plan Selection */}
                <div className="space-y-2">
                    <Label htmlFor="patient-plan">خطة العلاج (اختياري)</Label>
                    <Select 
                        value={selectedPlanId || externalPatientPlanId || ""} 
                        onValueChange={setSelectedPlanId}
                        disabled={isPlansLoading}
                    >
                        <SelectTrigger>
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
                                        <SelectItem key={plan.id} value={plan.id}>
                                            {plan.treatment_templates?.name || 'خطة علاجية'} - {plan.completed_sessions || 0}/{plan.total_sessions} جلسات مكتملة
                                        </SelectItem>
                                    ))}
                                </>
                            ) : (
                                <SelectItem value="no-plans" disabled>
                                    مفيش خطط علاجية
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border">
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
                                <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
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
                <Button type="submit" disabled={isCreating}>
                    {isCreating ? "جاري الحفظ..." : "حفظ الكشف"}
                </Button>
            </div>
        </form>
    )
}