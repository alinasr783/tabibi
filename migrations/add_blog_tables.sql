-- Create articles table if not exists
CREATE TABLE IF NOT EXISTS public.articles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    content text NOT NULL, -- This will store rich HTML content
    excerpt text,
    featured_image text,
    author_name text DEFAULT 'فريق طبيبي',
    published_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    meta_title text,
    meta_description text,
    keywords text[],
    views_count integer DEFAULT 0,
    CONSTRAINT articles_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view published articles" ON public.articles
    FOR SELECT USING (status = 'published');

CREATE POLICY "Authenticated users can manage articles" ON public.articles
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert dummy data with RICH HTML content
INSERT INTO public.articles (slug, title, content, excerpt, featured_image, published_at, author_name)
VALUES 
(
    'importance-of-digital-clinic-management',
    'أهمية التحول الرقمي في إدارة العيادات الطبية',
    '
    <p class="lead">في ظل التطور التكنولوجي السريع، أصبح التحول الرقمي ضرورة ملحة للمؤسسات الطبية لضمان تقديم أفضل خدمة للمرضى وتحسين الكفاءة التشغيلية.</p>
    
    <h2>لماذا التحول الرقمي؟</h2>
    <p>يساعد التحول الرقمي في تقليل الأخطاء البشرية، توفير الوقت، وتسريع الوصول للمعلومات الطبية. العيادات التي تعتمد على الورق تواجه تحديات كبيرة في تنظيم البيانات واسترجاعها.</p>
    
    <div class="my-8">
        <img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80" alt="طبيب يستخدم تابلت" class="rounded-lg shadow-md w-full" />
        <p class="text-sm text-gray-500 text-center mt-2">التكنولوجيا الحديثة تسهل عمل الأطباء</p>
    </div>

    <h3>الفوائد الرئيسية:</h3>
    <ul>
        <li><strong>أتمتة المواعيد والحجوزات:</strong> تقليل نسبة التغيب عن المواعيد من خلال التذكيرات الآلية.</li>
        <li><strong>ملفات طبية إلكترونية آمنة:</strong> حفظ بيانات المرضى بشكل آمن وسهل الوصول إليه.</li>
        <li><strong>تقارير وتحليلات دقيقة:</strong> فهم أداء العيادة المالي والتشغيلي بضغطة زر.</li>
    </ul>

    <blockquote>
        "التحول الرقمي ليس مجرد خيار، بل هو المستقبل الذي يجب أن نتبناه اليوم لنقدم رعاية صحية أفضل."
    </blockquote>

    <h3>كيف تبدأ؟</h3>
    <p>البدء بسيط. اختر نظام إدارة عيادات موثوق مثل <strong>طبيبي</strong> الذي يوفر لك كل الأدوات التي تحتاجها في منصة واحدة.</p>
    ',
    'اكتشف كيف يمكن للتحول الرقمي أن يغير مسار عيادتك ويحسن تجربة المرضى.',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    now(),
    'د. محمد علي'
),
(
    'how-to-improve-patient-experience',
    '5 طرق لتحسين تجربة المريض في عيادتك',
    '
    <p>تجربة المريض تبدأ من لحظة البحث عن طبيب وحتى ما بعد الزيارة. الاهتمام بالتفاصيل الصغيرة يصنع فرقاً كبيراً.</p>
    
    <h2>1. سهولة الحجز</h2>
    <p>وفر نظام حجز إلكتروني يسهل على المريض اختيار الموعد المناسب دون الحاجة للانتظار على الهاتف.</p>
    
    <h2>2. تقليل وقت الانتظار</h2>
    <p>احترم وقت المريض من خلال تنظيم المواعيد بدقة. استخدم أنظمة ذكية لتقدير وقت الانتظار.</p>
    
    <img src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80" alt="قاعة انتظار مريحة" class="rounded-xl my-6" />

    <h2>3. التواصل الفعال</h2>
    <p>استمع للمريض جيداً واشرح له حالته بوضوح. التواصل الجيد يبني الثقة.</p>
    ',
    'تعرف على أفضل الممارسات لتحسين رضا المرضى وضمان ولائهم لعيادتك.',
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    now() - interval '1 day',
    'سارة أحمد'
),
(
    'telemedicine-future-in-egypt',
    'مستقبل التطبيب عن بعد في مصر',
    '
    <p>شهدت مصر طفرة في خدمات الطب الاتصالي خاصة بعد الجائحة. هذا التحول فتح آفاقاً جديدة للرعاية الصحية.</p>
    
    <h3>التحديات والفرص</h3>
    <p>رغم التحديات التقنية، إلا أن الفرص واعدة جداً للوصول للمرضى في المناطق النائية.</p>
    
    <ul>
        <li>توفير الوقت والجهد</li>
        <li>تقليل تكلفة الرعاية الصحية</li>
        <li>سهولة المتابعة الدورية</li>
    </ul>
    ',
    'نظرة شاملة على واقع ومستقبل الخدمات الطبية عن بعد في السوق المصري.',
    'https://images.unsplash.com/photo-1576091160550-217358c7c8c9?auto=format&fit=crop&w=800&q=80',
    now() - interval '2 days',
    'فريق طبيبي'
)
ON CONFLICT (slug) DO UPDATE 
SET 
    content = EXCLUDED.content,
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    featured_image = EXCLUDED.featured_image,
    author_name = EXCLUDED.author_name;
