import { useEffect, useMemo, useState } from "react"
import { Button } from "../../components/ui/button"
import { Textarea } from "../../components/ui/textarea"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Plus, X, Loader2 } from "lucide-react"
import { Checkbox } from "../../components/ui/checkbox"
import useCreateVisit from "./useCreateVisit"
import SpeechButton from "../../components/ui/SpeechButton"
import { Switch } from "../../components/ui/switch"
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
import { createFinancialRecord } from "../../services/apiFinancialRecords"
import { useUserPreferences } from "../../hooks/useUserPreferences"
import { flattenCustomFieldTemplates, mergeTemplatesIntoCustomFields, normalizeMedicalFieldsConfig } from "../../lib/medicalFieldsConfig"

function AddPlanDialog({ open, onClose, patientId, onPlanCreated }) {
    const { data: templates, isLoading: isLoadingTemplates } = useTreatmentTemplates()
    const { mutate: createPlan, isPending: isCreating } = useCreatePatientPlan()
    const [selectedTemplateId, setSelectedTemplateId] = useState("")
    const [sessions, setSessions] = useState(1)
    const [sessionsError, setSessionsError] = useState("")

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!selectedTemplateId) return

        const template = templates.find(t => String(t.id) === String(selectedTemplateId))
        if (!template) return

        const mode = template?.advanced_settings?.billing?.mode || "per_session"
        const bSize = Number(template?.advanced_settings?.billing?.bundleSize) || 2
        const bPrice = Number(template?.advanced_settings?.billing?.bundlePrice) || 0
        const sessionsNumber = parseInt(sessions)
        if (mode === "bundle" && sessionsNumber % bSize !== 0) {
            setSessionsError(`عدد الجلسات يجب أن يكون مضاعفات ${bSize}`)
            return
        }
        setSessionsError("")

        const payload = {
            patient_id: patientId,
            template_id: selectedTemplateId,
            total_sessions: sessionsNumber,
            total_price: mode === "bundle" ? (sessionsNumber / bSize) * bPrice : template.session_price * sessionsNumber,
            status: "active",
            advanced_settings: template?.advanced_settings || {}
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
            <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto" dir="rtl">
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
                                step={selectedTemplate?.advanced_settings?.billing?.mode === "bundle" ? (Number(selectedTemplate?.advanced_settings?.billing?.bundleSize) || 2) : 1}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setSessions(v)
                                  const mode = selectedTemplate?.advanced_settings?.billing?.mode || "per_session"
                                  const bSize = Number(selectedTemplate?.advanced_settings?.billing?.bundleSize) || 2
                                  const n = parseInt(v)
                                  if (!n || n < 1) setSessionsError("أدخل عدد جلسات صحيح")
                                  else if (mode === "bundle" && n % bSize !== 0) setSessionsError(`عدد الجلسات يجب أن يكون مضاعفات ${bSize}`)
                                  else setSessionsError("")
                                }}
                            />
                            {sessionsError ? (
                              <p className="text-sm text-destructive">{sessionsError}</p>
                            ) : null}
                            <p className="text-sm text-muted-foreground">
                                الإجمالي: {(() => {
                                  const mode = selectedTemplate?.advanced_settings?.billing?.mode || "per_session"
                                  const bSize = Number(selectedTemplate?.advanced_settings?.billing?.bundleSize) || 2
                                  const bPrice = Number(selectedTemplate?.advanced_settings?.billing?.bundlePrice) || 0
                                  const s = parseInt(sessions) || 0
                                  return mode === "bundle" ? (s / bSize) * bPrice : selectedTemplate.session_price * s
                                })()} ج.م
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
                        <Button type="submit" disabled={!selectedTemplateId || isCreating || !!sessionsError}>
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
    const [treatment, setTreatment] = useState("")
    const [followUp, setFollowUp] = useState("")
    const [medications, setMedications] = useState([])
    const [newMedication, setNewMedication] = useState({ name: "", using: "" })
    const [customFields, setCustomFields] = useState([])
    const [newField, setNewField] = useState({ name: "", type: "text", section_id: "default" })
    const [selectedPlanId, setSelectedPlanId] = useState(externalPatientPlanId || "")
    const [isAddPlanOpen, setIsAddPlanOpen] = useState(false)
    const [showPaymentDialog, setShowPaymentDialog] = useState(false)
    const [paymentEnabled, setPaymentEnabled] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState("")
    const [lastVisitId, setLastVisitId] = useState(null)
    
    // Fetch patient plans for this patient
    const { data: patientPlans, isLoading: isPlansLoading } = usePatientPlans(patientId)
    
    const { data: preferences } = useUserPreferences()
    const medicalFieldsConfig = useMemo(
        () => normalizeMedicalFieldsConfig(preferences?.medical_fields_config),
        [preferences?.medical_fields_config]
    )
    const visitFields = medicalFieldsConfig.visit.fields
    const visitSections = medicalFieldsConfig.visit.sections
    const visitCustomSections = medicalFieldsConfig.visit.customSections
    const visitAllTemplates = useMemo(
        () => flattenCustomFieldTemplates({ config: medicalFieldsConfig, context: "visit" }),
        [medicalFieldsConfig]
    )

    useEffect(() => {
        if (!visitAllTemplates || visitAllTemplates.length === 0) return
        setCustomFields((prev) => mergeTemplatesIntoCustomFields(prev, visitAllTemplates))
    }, [visitAllTemplates])

    const { mutate: createVisit, isPending: isCreating } = useCreateVisit()
    const selectedPlan = patientPlans?.find((p) => String(p.id) === String(selectedPlanId || externalPatientPlanId || ""))

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

    const handleAddCustomField = () => {
        if (!newField.name.trim()) return
        setCustomFields((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                name: newField.name.trim(),
                type: newField.type,
                section_id: newField.section_id || "default",
                value: "",
            },
        ])
        setNewField({ name: "", type: "text", section_id: newField.section_id || "default" })
    }

    const handleRemoveCustomField = (id) => {
        setCustomFields((prev) => prev.filter((f) => f.id !== id))
    }

    const handleCustomFieldValueChange = (id, value) => {
        setCustomFields((prev) => prev.map((f) => (f.id === id ? { ...f, value } : f)))
    }

    const renderCustomFieldValueInput = (field) => {
        if (field.type === "textarea") {
            return (
                <Textarea
                    value={field.value ?? ""}
                    onChange={(e) => handleCustomFieldValueChange(field.id, e.target.value)}
                    className="min-h-[80px] text-sm"
                    placeholder={field.placeholder || ""}
                />
            )
        }

        if (field.type === "number") {
            return (
                <Input
                    type="number"
                    value={field.value ?? ""}
                    onChange={(e) => handleCustomFieldValueChange(field.id, e.target.value)}
                    className="text-sm"
                    placeholder={field.placeholder || ""}
                />
            )
        }

        if (field.type === "date") {
            return (
                <Input
                    type="date"
                    value={field.value ?? ""}
                    onChange={(e) => handleCustomFieldValueChange(field.id, e.target.value)}
                    className="text-sm"
                />
            )
        }

        if (field.type === "checkbox") {
            return (
                <div className="flex items-center gap-2">
                    <Checkbox
                        checked={Boolean(field.value)}
                        onCheckedChange={(checked) => handleCustomFieldValueChange(field.id, checked)}
                    />
                    <span className="text-sm text-muted-foreground">نعم / لا</span>
                </div>
            )
        }

        return (
            <Input
                value={field.value ?? ""}
                onChange={(e) => handleCustomFieldValueChange(field.id, e.target.value)}
                className="text-sm"
                placeholder={field.placeholder || ""}
            />
        )
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

        if (visitFields.treatment?.enabled !== false && treatment.trim()) {
            visitData.treatment = treatment
        }

        if (visitFields.follow_up?.enabled !== false && followUp.trim()) {
            visitData.follow_up = followUp
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

        if (customFields.length > 0) {
            visitData.custom_fields = customFields
        }
        
        createVisit(visitData, {
            onSuccess: (data) => {
                console.log("VisitCreateForm: Visit created successfully")
                // Reset form
                setDiagnosis("")
                setNotes("")
                setTreatment("")
                setFollowUp("")
                setMedications([])
                setNewMedication({ name: "", using: "" })
                setCustomFields([])
                setNewField({ name: "", type: "text" })
                setSelectedPlanId("")
                
                // Notify parent component
                if (onVisitCreated) onVisitCreated()

                const promptEnabled = !!selectedPlan?.advanced_settings?.paymentPrompt?.enabled
                if (visitData.patient_plan_id && promptEnabled) {
                    setLastVisitId(data?.id || null)
                    setPaymentEnabled(false)
                    setPaymentAmount("")
                    setShowPaymentDialog(true)
                }
            },
            onError: (error) => {
                console.error("VisitCreateForm: Error creating visit", error)
            }
        })
    }

    const submitSessionPayment = async () => {
        if (!paymentEnabled) {
            setShowPaymentDialog(false)
            return
        }
        const amt = Number(paymentAmount)
        if (!Number.isFinite(amt) || amt <= 0) {
            return
        }
        try {
            await createFinancialRecord({
                visit_id: lastVisitId,
                patient_id: Number(patientId),
                patient_plan_id: Number(selectedPlan?.id || externalPatientPlanId),
                amount: amt,
                type: "income",
                reference_key: lastVisitId ? `plan:${selectedPlan?.id || externalPatientPlanId}:visit:${lastVisitId}:payment` : `plan:${selectedPlan?.id || externalPatientPlanId}:payment:${Date.now()}`,
                description: `دفعة جلسة علاجية - ${selectedPlan?.treatment_templates?.name || "خطة علاجية"}`
            })
            setShowPaymentDialog(false)
        } catch {
            setShowPaymentDialog(false)
        }
    }

    console.log("VisitCreateForm: Rendering with props", { patientId, externalPatientPlanId, selectedPlanId })

    return (
        <>
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent dir="rtl" onPointerDownOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>تسجيل دفعة للجلسة</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                                <div className="text-sm font-medium">هل دفع المريض الآن؟</div>
                                <div className="text-xs text-muted-foreground">فعّلها لإضافة مبلغ مدفوع لهذه الجلسة</div>
                            </div>
                            <Switch checked={paymentEnabled} onCheckedChange={setPaymentEnabled} />
                        </div>
                        {paymentEnabled ? (
                            <div className="space-y-2">
                                <Label>المبلغ المدفوع (جنيه)</Label>
                                <Input type="number" min="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                            </div>
                        ) : null}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>إغلاق</Button>
                        <Button type="button" onClick={submitSessionPayment}>حفظ</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
                        <Label htmlFor="diagnosis">{visitFields.diagnosis?.label || "التشخيص"} *</Label>
                        <Input
                            id="diagnosis"
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            placeholder={visitFields.diagnosis?.placeholder || "أدخل التشخيص المبدئي"}
                            required
                        />
                    </div>

                    {visitFields.notes?.enabled !== false && (
                        <div className="space-y-2">
                            <Label htmlFor="notes">{visitFields.notes?.label || "الملاحظات"}</Label>
                            <div className="relative">
                                <Textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder={visitFields.notes?.placeholder || "اكتب الملاحظات أو استخدم الميكروفون للتحدث"}
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
                    )}

                    {visitFields.treatment?.enabled !== false && (
                        <div className="space-y-2">
                            <Label htmlFor="treatment">{visitFields.treatment?.label || "العلاج"}</Label>
                            <Textarea
                                id="treatment"
                                value={treatment}
                                onChange={(e) => setTreatment(e.target.value)}
                                placeholder={visitFields.treatment?.placeholder || "اكتب خطة العلاج هنا..."}
                                rows={4}
                            />
                        </div>
                    )}

                    {visitFields.follow_up?.enabled !== false && (
                        <div className="space-y-2">
                            <Label htmlFor="follow_up">{visitFields.follow_up?.label || "متابعة"}</Label>
                            <Textarea
                                id="follow_up"
                                value={followUp}
                                onChange={(e) => setFollowUp(e.target.value)}
                                placeholder={visitFields.follow_up?.placeholder || "اكتب ملاحظات المتابعة هنا..."}
                                rows={4}
                            />
                        </div>
                    )}

                    {(customFields.length > 0 || visitAllTemplates.length > 0) && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>{visitSections?.items?.extra_fields?.title || "حقول إضافية"}</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddCustomField}
                                    disabled={!newField.name.trim()}
                                    className="gap-1.5"
                                >
                                    <Plus className="w-4 h-4" />
                                    إضافة
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-[var(--radius)] bg-muted/30 border">
                                <div className="space-y-2">
                                    <Label className="text-xs">اسم الحقل</Label>
                                    <Input
                                        value={newField.name}
                                        onChange={(e) => setNewField((prev) => ({ ...prev, name: e.target.value }))}
                                        placeholder="مثال: ضغط الدم"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">القسم</Label>
                                    <Select
                                        value={newField.section_id || "default"}
                                        onValueChange={(v) => setNewField((prev) => ({ ...prev, section_id: v }))}
                                        dir="rtl"
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default">{visitSections?.items?.extra_fields?.title || "حقول إضافية"}</SelectItem>
                                            {visitCustomSections.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">النوع</Label>
                                    <Select value={newField.type} onValueChange={(v) => setNewField((prev) => ({ ...prev, type: v }))} dir="rtl">
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="text">نص</SelectItem>
                                            <SelectItem value="number">رقم</SelectItem>
                                            <SelectItem value="date">تاريخ</SelectItem>
                                            <SelectItem value="textarea">نص طويل</SelectItem>
                                            <SelectItem value="checkbox">صح/غلط</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {customFields.length > 0 && (
                                <div className="space-y-4">
                                    {[{ id: "default", title: visitSections?.items?.extra_fields?.title || "حقول إضافية", enabled: true }, ...visitCustomSections]
                                        .filter((s) => s.enabled !== false)
                                        .map((s) => {
                                            const fields = customFields.filter((f) => String(f?.section_id || "default") === String(s.id))
                                            if (fields.length === 0) return null
                                            return (
                                                <div key={s.id} className="space-y-2">
                                                    <h4 className="text-xs font-medium text-muted-foreground">{s.title}</h4>
                                                    {fields.map((field) => (
                                                        <div key={field.id} className="rounded-lg border p-3 bg-muted/20 space-y-2">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="text-sm font-semibold">{field.name}</div>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="shrink-0 h-6 w-6 text-destructive hover:text-destructive"
                                                                    onClick={() => handleRemoveCustomField(field.id)}
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                            {renderCustomFieldValueInput(field)}
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        })}
                                </div>
                            )}
                        </div>
                    )}

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
