import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import DataTable from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ArrowRight, Download, RefreshCw, Database, Save, Settings, Key, Code, Copy, Check, BarChart3, Eye, TrendingUp, Plus, Trash2, Users, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { formatCurrency } from '../lib/utils';

export default function AppDetails() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [analytics, setAnalytics] = useState({
    views: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    salesData: []
  });
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    short_description: '',
    full_description: '',
    price: 0,
    category: '',
    image_url: '',
    preview_link: '',
    features: [],
    screenshots: [],
    component_key: '',
    color: '#000000',
    billing_period: 'monthly',
    submission_schema: ''
  });

  const [newFeature, setNewFeature] = useState('');
  const [newImage, setNewImage] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function fetchAppData() {
      // Fetch App Info
      const { data: appData, error: appError } = await supabase
        .from('tabibi_apps')
        .select('*')
        .eq('id', appId)
        .single();

      if (appError) {
        console.error('Error fetching app:', appError);
        navigate('/');
        return;
      }
      setApp(appData);
      setFormData({
        title: appData.title || '',
        short_description: appData.short_description || '',
        full_description: appData.full_description || '',
        price: appData.price || 0,
        category: appData.category || '',
        image_url: appData.image_url || '',
        preview_link: appData.preview_link || '',
        features: Array.isArray(appData.features) ? appData.features : [],
        screenshots: Array.isArray(appData.screenshots) ? appData.screenshots : [],
        component_key: appData.component_key || '',
        color: appData.color || '#000000',
        billing_period: appData.billing_period || 'monthly',
        submission_schema: typeof appData.submission_schema === 'object' 
          ? JSON.stringify(appData.submission_schema, null, 2) 
          : appData.submission_schema || ''
      });

      // Increment Views (Optimistic & Backend)
      // Try RPC first, fallback to update
      supabase.rpc('increment_app_views', { app_uuid: appId }).then(({ error }) => {
          if (error) {
              // Fallback
              const newViews = (appData.views_count || 0) + 1;
              supabase.from('tabibi_apps')
                  .update({ views_count: newViews })
                  .eq('id', appId)
                  .then(() => {});
          }
      });

      // Fetch Subscribers
      const { data: subsList, error: subsListError } = await supabase
        .from('app_subscriptions')
        .select('*')
        .eq('app_id', appId)
        .order('created_at', { ascending: false });

      if (!subsListError) {
        setSubscribers(subsList || []);
      }

      // Fetch Data Submissions
      const { data: dataSubs, error: dataSubsError } = await supabase
        .from('app_data_submissions')
        .select('*')
        .eq('app_id', appId)
        .order('created_at', { ascending: false });

      if (!dataSubsError) {
        setSubmissions(dataSubs || []);
      }

      // Fetch Analytics Data
      const subs = subsList || [];
      
      if (subs) {
        const totalRevenue = subs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const activeSubscriptions = subs.filter(s => s.status === 'active').length;
        
        // Process last 6 months sales
        const months = {};
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const key = d.toLocaleString('default', { month: 'short' });
          months[key] = 0;
        }

        subs.forEach(sub => {
          const d = new Date(sub.created_at);
          // Only count if within last 6 months approximately
          const key = d.toLocaleString('default', { month: 'short' });
          if (months[key] !== undefined) {
            months[key] += (sub.amount || 0);
          }
        });

        const salesData = Object.keys(months).map(key => ({
          name: key,
          sales: months[key]
        }));

        setAnalytics({
          views: (appData.views_count || 0) + 1, // Optimistic view count
          totalRevenue,
          activeSubscriptions,
          salesData
        });
      }
      
      setLoading(false);
    }

    if (appId) fetchAppData();
  }, [appId, navigate]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(String(text));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateApp = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Parse submission_schema if it's a string
    let schemaToSave = formData.submission_schema;
    try {
      if (typeof schemaToSave === 'string' && schemaToSave.trim()) {
        schemaToSave = JSON.parse(schemaToSave);
      }
    } catch (err) {
      alert('خطأ في تنسيق JSON الخاص بـ Submission Schema');
      setSaving(false);
      return;
    }

    const updates = {
      ...formData,
      submission_schema: schemaToSave
    };

    const { error } = await supabase
      .from('tabibi_apps')
      .update(updates)
      .eq('id', appId);
      
    if (error) {
      alert('Error updating app: ' + error.message);
    } else {
      // Refresh app data
      setApp({ ...app, ...updates });
      alert('تم تحديث بيانات التطبيق بنجاح');
    }
    setSaving(false);
  };

  const uploadImage = async (file) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${appId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('app-assets')
        .getPublicUrl(filePath);

      setUploading(false);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('حدث خطأ أثناء رفع الصورة: ' + error.message);
      setUploading(false);
      return null;
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const publicUrl = await uploadImage(file);
    if (publicUrl) {
      setFormData({ ...formData, image_url: publicUrl });
    }
  };

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const publicUrl = await uploadImage(file);
    if (publicUrl) {
      setFormData({ ...formData, screenshots: [...formData.screenshots, publicUrl] });
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({ ...formData, features: [...formData.features, newFeature.trim()] });
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    const newFeatures = [...formData.features];
    newFeatures.splice(index, 1);
    setFormData({ ...formData, features: newFeatures });
  };

  const addScreenshot = () => {
    if (newImage.trim()) {
      setFormData({ ...formData, screenshots: [...formData.screenshots, newImage.trim()] });
      setNewImage('');
    }
  };

  const removeScreenshot = (index) => {
    const newScreenshots = [...formData.screenshots];
    newScreenshots.splice(index, 1);
    setFormData({ ...formData, screenshots: newScreenshots });
  };

  const downloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(subscribers, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `app_${appId}_subscribers.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;

  const columns = [
    {
      header: "التاريخ",
      accessor: "created_at",
      render: (row) => new Date(row.created_at).toLocaleDateString('ar-EG')
    },
    {
      header: "المبلغ",
      accessor: "amount",
      render: (row) => formatCurrency(row.amount || 0)
    },
    {
      header: "العيادة",
      accessor: "clinic_id",
      render: (row) => <span className="font-mono text-xs">{String(row.clinic_id || '').substring(0, 8)}...</span>
    },
    {
      header: "الحالة",
      accessor: "status",
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
          {row.status === 'active' ? 'نشط' : row.status}
        </Badge>
      )
    },
    {
      header: "إجراءات",
      accessor: "id",
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/app/${appId}/subscriber/${row.id}`)}>
          <Eye className="h-4 w-4 ml-2" />
          عرض التفاصيل
        </Button>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-muted/20 font-sans" dir="rtl">
      <header className="bg-background border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{app?.title}</h1>
              <p className="text-xs text-muted-foreground">ID: {app?.id}</p>
            </div>
            <Badge variant={app?.is_active ? 'default' : 'secondary'}>
              {app?.is_active ? 'نشط' : 'غير نشط'}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8" style={{ direction : "rtl"}}>
        
        <Tabs defaultValue="analytics" className="w-full" style={{ direction : "rtl"}}>
          <TabsList className="grid w-full grid-cols-2 h-auto md:grid-cols-5 lg:w-[500px] mb-8 gap-2 md:gap-0">
            <TabsTrigger value="analytics">الإحصائيات</TabsTrigger>
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
            <TabsTrigger value="integration">الربط</TabsTrigger>
            <TabsTrigger value="subscribers">المشتركين</TabsTrigger>
            <TabsTrigger value="data">البيانات</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3" style={{ direction : "rtl"}}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي المشاهدات</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.views}</div>
                  <p className="text-xs text-muted-foreground">مشاهدة لصفحة التطبيق</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">من {analytics.activeSubscriptions} اشتراك نشط</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">معدل التحويل</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.views > 0 
                      ? ((analytics.activeSubscriptions / analytics.views) * 100).toFixed(1) 
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">من الزوار إلى مشتركين</p>
                </CardContent>
              </Card>
            </div>

            {/* Sales Chart */}
            <Card className="col-span-4" style={{ direction : "rtl"}}>
              <CardHeader>
                <CardTitle>المبيعات الشهرية</CardTitle>
                <CardDescription>أداء مبيعات التطبيق في آخر 6 أشهر</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        labelStyle={{ color: 'black' }}
                      />
                      <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  <CardTitle>إعدادات التطبيق</CardTitle>
                </div>
                <CardDescription>تعديل البيانات الأساسية للتطبيق</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateApp} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم التطبيق</Label>
                      <Input 
                        value={formData.title} 
                        onChange={(e) => setFormData({...formData, title: e.target.value})} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>التصنيف</Label>
                      <Input 
                        value={formData.category} 
                        onChange={(e) => setFormData({...formData, category: e.target.value})} 
                        placeholder="مثال: جلدية، أسنان، عام"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>السعر الشهري (ج.م)</Label>
                      <Input 
                        type="number" 
                        value={formData.price} 
                        onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>وصف قصير</Label>
                      <Input 
                        value={formData.short_description} 
                        onChange={(e) => setFormData({...formData, short_description: e.target.value})} 
                      />
                    </div>
                  </div>

                  {/* URLs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>صورة التطبيق (Image)</Label>
                      <div className="flex gap-2 items-center">
                        <Input 
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="file:ml-2 file:mr-0"
                        />
                        {uploading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                      <Input 
                        value={formData.image_url} 
                        onChange={(e) => setFormData({...formData, image_url: e.target.value})} 
                        placeholder="أو ضع الرابط مباشرة هنا..."
                        className="mt-2 text-xs font-mono text-muted-foreground"
                      />
                      {formData.image_url && (
                        <div className="mt-2 h-16 w-16 border rounded overflow-hidden">
                           <img src={formData.image_url} alt="App Icon" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>رابط المعاينة (Preview Link)</Label>
                      <Input 
                        value={formData.preview_link} 
                        onChange={(e) => setFormData({...formData, preview_link: e.target.value})} 
                        placeholder="https://example.com/demo"
                      />
                    </div>
                  </div>

                  {/* Technical & Style Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                     <div className="space-y-2">
                      <Label>معرف المكون (Component Key)</Label>
                      <Input 
                        value={formData.component_key} 
                        onChange={(e) => setFormData({...formData, component_key: e.target.value})} 
                        placeholder="e.g. tabibi_profile"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>اللون الرئيسي</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="color" 
                          value={formData.color} 
                          onChange={(e) => setFormData({...formData, color: e.target.value})}
                          className="w-12 p-1 h-10"
                        />
                        <Input 
                          value={formData.color} 
                          onChange={(e) => setFormData({...formData, color: e.target.value})}
                          placeholder="#000000"
                          className="font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>فترة الدفع</Label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.billing_period}
                        onChange={(e) => setFormData({...formData, billing_period: e.target.value})}
                      >
                        <option value="monthly">شهري</option>
                        <option value="yearly">سنوي</option>
                        <option value="one_time">مرة واحدة</option>
                      </select>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    <Label>المميزات</Label>
                    <div className="flex gap-2 mb-2">
                      <Input 
                        value={newFeature} 
                        onChange={(e) => setNewFeature(e.target.value)} 
                        placeholder="أضف ميزة جديدة..."
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                      />
                      <Button type="button" onClick={addFeature} variant="secondary">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="pl-1 pr-2 py-1 gap-1">
                          {feature}
                          <Trash2 
                            className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-destructive" 
                            onClick={() => removeFeature(index)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Images */}
                  <div className="space-y-2">
                    <Label>لقطات الشاشة (Screenshots)</Label>
                    <div className="flex gap-2 mb-2 items-center">
                       <Input 
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotUpload}
                          disabled={uploading}
                          className="w-full file:ml-2 file:mr-0"
                        />
                         {uploading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                    <div className="flex gap-2 mb-2">
                      <Input 
                        value={newImage} 
                        onChange={(e) => setNewImage(e.target.value)} 
                        placeholder="أو أضف رابط صورة يدوياً..."
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addScreenshot())}
                      />
                      <Button type="button" onClick={addScreenshot} variant="secondary">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {formData.screenshots.map((img, index) => (
                        <div key={index} className="relative group border rounded-lg overflow-hidden aspect-video bg-muted">
                          <img src={img} alt={`App screenshot ${index + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button 
                              type="button" 
                              variant="destructive" 
                              size="icon" 
                              onClick={() => removeScreenshot(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>



                  <div className="space-y-2">
                    <Label>وصف كامل</Label>
                    <Textarea 
                      value={formData.full_description} 
                      onChange={(e) => setFormData({...formData, full_description: e.target.value})} 
                      rows={6}
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <Button type="submit" disabled={saving}>
                      {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                      <Save className="h-4 w-4" />
                      حفظ التغييرات
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integration">
            {/* Integration Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  <CardTitle>الربط البرمجي (Integration)</CardTitle>
                </div>
                <CardDescription>استخدم هذه البيانات لربط تطبيقك مع منصة طبيبي</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>معرف التطبيق (App ID)</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 p-2 bg-muted rounded border font-mono text-sm overflow-hidden text-ellipsis whitespace-nowrap" dir="ltr">
                        {app?.id}
                      </div>
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(app?.id)}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>مفتاح API (للتجربة)</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 p-2 bg-muted rounded border font-mono text-sm overflow-hidden text-ellipsis whitespace-nowrap" dir="ltr">
                        sk_test_{String(app?.id || '').substring(0, 8)}...
                      </div>
                      <Button variant="outline" size="icon" disabled>
                        <Key className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>مثال للإرسال (cURL)</Label>
                  <div className="bg-slate-950 text-slate-50 p-4 rounded-lg font-mono text-xs overflow-x-auto" dir="ltr">
                    <pre>
    {`curl -X POST https://api.tabibi.app/v1/submissions \\
      -H "Authorization: Bearer sk_test_${String(app?.id || '').substring(0, 8)}..." \\
      -H "Content-Type: application/json" \\
      -d '{
        "app_id": "${app?.id}",
        "clinic_id": "clinic_123",
        "data": {
          "patient_count": 15,
          "revenue": 5000
        }
      }'`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscribers">
            {/* Subscribers List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>المشتركين</CardTitle>
                    <CardDescription>قائمة المشتركين في التطبيق ({subscribers.length} مشترك)</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    <RefreshCw className="h-4 w-4" />
                    تحديث
                  </Button>
                  <Button variant="default" size="sm" onClick={downloadJSON}>
                    <Download className="h-4 w-4" />
                    تصدير JSON
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                 <DataTable 
                   columns={columns} 
                   data={subscribers} 
                   emptyLabel="لا توجد بيانات حتى الآن"
                   className="border rounded-md"
                 />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data">
            {/* Data Submissions List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>البيانات المستلمة</CardTitle>
                    <CardDescription>بيانات تم إرسالها من خلال التطبيق ({submissions.length} سجل)</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4" />
                  تحديث
                </Button>
              </CardHeader>
              <CardContent>
                 {submissions.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">لا توجد بيانات مستلمة حتى الآن</div>
                 ) : (
                    <div className="space-y-4">
                      {submissions.map((sub) => (
                        <div key={sub.id} className="border rounded-lg p-4 bg-card text-card-foreground shadow-sm">
                          <div className="flex justify-between items-center mb-3">
                            <Badge variant="outline">{sub.submission_type}</Badge>
                            <span className="text-xs text-muted-foreground" dir="ltr">
                              {new Date(sub.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="bg-muted p-3 rounded-md overflow-x-auto">
                            <pre className="text-xs font-mono" dir="ltr">
                              {JSON.stringify(sub.data, null, 2)}
                            </pre>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground flex gap-4">
                             <span>Clinic: {String(sub.clinic_id).substring(0,8)}...</span>
                             <span>Status: {sub.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                 )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
