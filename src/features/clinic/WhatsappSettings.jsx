import { useState, useEffect } from "react"
import supabase from "../../services/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card"
import { Label } from "../../components/ui/label"
import { Input } from "../../components/ui/input"
import { Textarea } from "../../components/ui/textarea"
import { Switch } from "../../components/ui/switch"
import { Button } from "../../components/ui/button"
import { MessageSquare, Save, Loader2, AlertCircle, CheckCircle, Smartphone, QrCode, RefreshCw } from "lucide-react"
import { 
  createWhatsappInstance, 
  getWhatsappQrCode, 
  getWhatsappStatus, 
  saveStoredWhatsappInstance, 
  getStoredWhatsappInstance, 
  deleteStoredWhatsappInstance 
} from "../../services/apiWhatsapp"

export default function WhatsappSettings({ clinicId }) {
  const [settings, setSettings] = useState({
    enabled_immediate: true,
    enabled_reminder: true,
    reminder_offset_minutes: 30,
    immediate_template: "تم تأكيد حجزك في {clinic_name} يوم {date} الساعة {time}. من فضلك احضر قبل 10 دقائق.",
    reminder_template: "باقي {offset} دقيقة على ميعادك في {clinic_name} الساعة {time}. نورتنا.",
  })
  
  // Connection State
  const [phone, setPhone] = useState("")
  const [instanceId, setInstanceId] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState("disconnected") // disconnected, connecting, connected
  const [qrCode, setQrCode] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  // Polling for status
  useEffect(() => {
    let interval
    if (instanceId && connectionStatus === 'connecting') {
      interval = setInterval(async () => {
        try {
          const statusData = await getWhatsappStatus(instanceId)
          // Adjust based on actual API response
          if (statusData?.status === 'connected' || statusData?.account_status === 'authenticated') {
            setConnectionStatus('connected')
            setQrCode(null)
            clearInterval(interval)
          }
        } catch (err) {
          console.error("Polling error", err)
        }
      }, 5000)
    }
    return () => clearInterval(interval)
  }, [instanceId, connectionStatus])

  useEffect(() => {
    if (!clinicId) return

    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch Settings
        const { data: wsData } = await supabase
          .from("whatsapp_settings")
          .select("*")
          .eq("clinic_id", clinicId)
          .maybeSingle()

        // Fetch Integration
        const intData = await getStoredWhatsappInstance(clinicId)

        if (wsData) {
          setSettings(prev => ({ ...prev, ...wsData }))
        }
        
        if (intData) {
          setInstanceId(intData.settings?.instance_id || null)
          setPhone(intData.settings?.phone || "")
          
          // Check status immediately
          if (intData.settings?.instance_id) {
            try {
              const statusData = await getWhatsappStatus(intData.settings.instance_id)
              if (statusData?.status === 'connected' || statusData?.account_status === 'authenticated') {
                setConnectionStatus('connected')
              } else {
                 // If not connected, maybe we can get QR code again?
                 // Or just set to disconnected so user can reconnect
                 setConnectionStatus('disconnected')
              }
            } catch (e) {
              setConnectionStatus('disconnected')
            }
          }
        }
      } catch (err) {
        console.error("Error fetching whatsapp settings:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clinicId])

  const handleConnect = async () => {
    if (!phone) {
      setMessage({ type: "error", text: "من فضلك أدخل رقم الهاتف" })
      return
    }
    
    setIsProcessing(true)
    setMessage(null)
    
    try {
      // 1. Create Instance
      let currentInstanceId = instanceId
      
      if (!currentInstanceId) {
        const createRes = await createWhatsappInstance({ clinicId, phone })
        // Assuming createRes is { status: 'success', instance_id: '...' } or similar
        // Adjust property access based on actual response
        currentInstanceId = createRes.instance_id || createRes.data?.instance_id || createRes.id
        
        if (!currentInstanceId) throw new Error("فشل إنشاء الجلسة")
        
        setInstanceId(currentInstanceId)
        
        // Save to DB
        await saveStoredWhatsappInstance(clinicId, currentInstanceId, phone)
      }

      // 2. Get QR
      const qrRes = await getWhatsappQrCode(currentInstanceId)
      // Assuming qrRes is { base64: '...' } or { qrcode: '...' }
      const qrImage = qrRes.base64 || qrRes.qrcode || qrRes.data?.qrcode
      
      if (qrImage) {
        setQrCode(qrImage)
        setConnectionStatus('connecting')
      } else {
        throw new Error("فشل جلب رمز الاستجابة السريعة (QR)")
      }

    } catch (err) {
      console.error("Connection error:", err)
      setMessage({ type: "error", text: err.message || "حدث خطأ أثناء الربط" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm("هل أنت متأكد من إلغاء الربط؟ ستتوقف الرسائل.")) return

    setIsProcessing(true)
    try {
      await deleteStoredWhatsappInstance(clinicId)
      setInstanceId(null)
      setConnectionStatus('disconnected')
      setQrCode(null)
      setPhone("")
      setMessage({ type: "success", text: "تم إلغاء الربط بنجاح" })
    } catch (err) {
      console.error("Disconnect error:", err)
      setMessage({ type: "error", text: "فشل إلغاء الربط" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      // 1. Upsert Settings
      const { error: wsError } = await supabase
        .from("whatsapp_settings")
        .upsert({
          clinic_id: clinicId,
          enabled_immediate: settings.enabled_immediate,
          enabled_reminder: settings.enabled_reminder,
          reminder_offset_minutes: parseInt(settings.reminder_offset_minutes) || 30,
          immediate_template: settings.immediate_template,
          reminder_template: settings.reminder_template,
          updated_at: new Date()
        }, { onConflict: 'clinic_id' })

      if (wsError) throw wsError

      // Note: Instance ID is now saved via handleConnect separately, 
      // but if we wanted to update settings like phone number we could do it here.
      // For now, handleConnect saves the instance.

      setMessage({ type: "success", text: "تم حفظ الإعدادات بنجاح" })
    } catch (err) {
      console.error("Error saving settings:", err)
      setMessage({ type: "error", text: "حدث خطأ أثناء الحفظ" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-6">
       {/* Connection Status */}
       <Card className={connectionStatus === 'connected' ? "border-green-500/20 bg-green-500/5" : ""}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                ربط الواتساب
            </CardTitle>
            <CardDescription>
              {connectionStatus === 'connected' 
                ? "تم ربط العيادة بنجاح. الرسائل ستعمل تلقائياً."
                : "قم بربط رقم العيادة لتفعيل الإشعارات التلقائية."}
            </CardDescription>
          </CardHeader>
          <CardContent>
             {connectionStatus === 'connected' ? (
               <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                     <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                   </div>
                   <div>
                     <p className="font-medium">متصل</p>
                     <p className="text-sm text-muted-foreground">{phone}</p>
                   </div>
                 </div>
                 <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={isProcessing}>
                   {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "إلغاء الربط"}
                 </Button>
               </div>
             ) : (
               <div className="space-y-4">
                 <div className="grid gap-2">
                   <Label htmlFor="phone">رقم الواتساب</Label>
                   <div className="flex gap-2">
                     <Input 
                       id="phone" 
                       value={phone} 
                       onChange={(e) => setPhone(e.target.value)}
                       placeholder="مثال: 01012345678"
                       dir="ltr"
                       disabled={connectionStatus === 'connecting' || isProcessing}
                     />
                     {!qrCode && (
                       <Button onClick={handleConnect} disabled={isProcessing || !phone}>
                         {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "بدء الربط"}
                       </Button>
                     )}
                   </div>
                 </div>

                 {qrCode && (
                   <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-muted/30">
                     <div className="text-center mb-4">
                       <h4 className="font-semibold mb-1">امسح الرمز بواسطة واتساب</h4>
                       <p className="text-sm text-muted-foreground">افتح واتساب > الإعدادات > الأجهزة المرتبطة > ربط جهاز</p>
                     </div>
                     <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 bg-white p-2 rounded-lg shadow-sm" />
                     <div className="mt-4 flex items-center gap-2 text-sm text-blue-600 animate-pulse">
                       <RefreshCw className="w-4 h-4 animate-spin" />
                       جاري انتظار المسح...
                     </div>
                     <Button variant="ghost" size="sm" className="mt-4" onClick={() => setQrCode(null)}>
                       إلغاء
                     </Button>
                   </div>
                 )}
               </div>
             )}
          </CardContent>
       </Card>

       {/* Immediate Settings */}
       <Card>
          <CardHeader>
             <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="text-lg">رسائل الحجز الفوري</CardTitle>
                    <CardDescription>تُرسل تلقائياً بمجرد تأكيد الموعد</CardDescription>
                </div>
                <Switch 
                   checked={settings.enabled_immediate}
                   onCheckedChange={(c) => setSettings({...settings, enabled_immediate: c})}
                />
             </div>
          </CardHeader>
          {settings.enabled_immediate && (
          <CardContent>
             <div className="grid gap-2">
                <Label>نص الرسالة</Label>
                <Textarea 
                   value={settings.immediate_template}
                   onChange={(e) => setSettings({...settings, immediate_template: e.target.value})}
                   rows={4}
                />
                <p className="text-xs text-muted-foreground">
                   المتغيرات المتاحة: {'{clinic_name}, {patient_name}, {date}, {time}'}
                </p>
             </div>
          </CardContent>
          )}
       </Card>

       {/* Reminder Settings */}
       <Card>
          <CardHeader>
             <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="text-lg">رسائل التذكير</CardTitle>
                    <CardDescription>تُرسل قبل الموعد بفترة محددة</CardDescription>
                </div>
                <Switch 
                   checked={settings.enabled_reminder}
                   onCheckedChange={(c) => setSettings({...settings, enabled_reminder: c})}
                />
             </div>
          </CardHeader>
          {settings.enabled_reminder && (
          <CardContent className="space-y-4">
             <div className="grid gap-2">
                <Label>وقت التذكير (بالدقائق قبل الموعد)</Label>
                <Input 
                   type="number"
                   value={settings.reminder_offset_minutes}
                   onChange={(e) => setSettings({...settings, reminder_offset_minutes: e.target.value})}
                   min={10} max={720}
                />
             </div>
             <div className="grid gap-2">
                <Label>نص الرسالة</Label>
                <Textarea 
                   value={settings.reminder_template}
                   onChange={(e) => setSettings({...settings, reminder_template: e.target.value})}
                   rows={4}
                />
                <p className="text-xs text-muted-foreground">
                   المتغيرات المتاحة: {'{clinic_name}, {patient_name}, {date}, {time}, {offset}'}
                </p>
             </div>
          </CardContent>
          )}
       </Card>

       <div className="flex items-center justify-between">
          {message && (
             <div className={`flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {message.type === 'success' ? <CheckCircle className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                {message.text}
             </div>
          )}
          {!message && <div></div>}
          
          <Button onClick={handleSave} disabled={saving} className="gap-2">
             {saving && <Loader2 className="w-4 h-4 animate-spin" />}
             <Save className="w-4 h-4" />
             حفظ الإعدادات
          </Button>
       </div>
    </div>
  )
}
