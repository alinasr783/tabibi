import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import supabase from '../services/supabase';
import { Calendar, User, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

// Fallback data
const DUMMY_ARTICLES = [
    {
        id: '1',
        slug: 'importance-of-digital-clinic-management',
        title: 'أهمية التحول الرقمي في إدارة العيادات الطبية',
        content: `
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
        `,
        featured_image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
        published_at: new Date().toISOString(),
        author_name: 'فريق طبيبي'
    },
    {
        id: '2',
        slug: 'how-to-improve-patient-experience',
        title: '5 طرق لتحسين تجربة المريض في عيادتك',
        content: '<p>تجربة المريض تبدأ من لحظة البحث عن طبيب وحتى ما بعد الزيارة.</p><h2>1. سهولة الحجز</h2><p>وفر نظام حجز إلكتروني يسهل على المريض اختيار الموعد المناسب.</p><h2>2. تقليل وقت الانتظار</h2><p>احترم وقت المريض من خلال تنظيم المواعيد بدقة.</p>',
        featured_image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
        published_at: new Date(Date.now() - 86400000).toISOString(),
        author_name: 'د. أحمد علي'
    },
    {
        id: '3',
        slug: 'telemedicine-future-in-egypt',
        title: 'مستقبل التطبيب عن بعد في مصر',
        content: '<p>شهدت مصر طفرة في خدمات الطب الاتصالي خاصة بعد الجائحة.</p><p>يتجه العالم ومصر نحو دمج الاستشارات الطبية عن بعد كجزء أساسي من منظومة الرعاية الصحية.</p>',
        featured_image: 'https://images.unsplash.com/photo-1576091160550-217358c7c8c9?auto=format&fit=crop&w=800&q=80',
        published_at: new Date(Date.now() - 172800000).toISOString(),
        author_name: 'سارة محمد'
    }
];

export default function ArticlePage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticle() {
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (error) throw error;
        setArticle(data);
      } catch (err) {
        console.error("Error fetching article:", err);
        // Fallback
        const dummy = DUMMY_ARTICLES.find(a => a.slug === slug);
        setArticle(dummy);
      } finally {
        setLoading(false);
      }
    }
    fetchArticle();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  
  if (!article) return <div className="min-h-screen flex items-center justify-center">المقال غير موجود</div>;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Helmet>
        <title>{article.meta_title || `${article.title} - مدونة طبيبي`}</title>
        <meta name="description" content={article.meta_description || article.excerpt} />
        {article.keywords && <meta name="keywords" content={Array.isArray(article.keywords) ? article.keywords.join(', ') : article.keywords} />}
        <link rel="canonical" href={`https://tabibi.app/blog/${article.slug}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={article.meta_title || article.title} />
        <meta property="og:description" content={article.meta_description || article.excerpt} />
        <meta property="og:image" content={article.featured_image} />
        <meta property="og:url" content={`https://tabibi.app/blog/${article.slug}`} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={article.published_at} />
        <meta property="article:author" content={article.author_name} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.meta_title || article.title} />
        <meta name="twitter:description" content={article.meta_description || article.excerpt} />
        <meta name="twitter:image" content={article.featured_image} />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": article.title,
            "image": article.featured_image,
            "datePublished": article.published_at,
            "dateModified": article.updated_at || article.published_at,
            "author": {
              "@type": "Person",
              "name": article.author_name
            },
            "publisher": {
              "@type": "Organization",
              "name": "Tabibi",
              "logo": {
                "@type": "ImageObject",
                "url": "https://tabibi.app/logo.jpeg"
              }
            },
            "description": article.excerpt
          })}
        </script>
      </Helmet>
      <Header />
      <main className="flex-grow pt-24 pb-12">
        {/* Hero Image */}
        <div className="w-full h-[400px] relative mb-8">
            <div className="absolute inset-0 bg-black/40 z-10" style={{direction : "rtl"}}></div>
            <img 
                src={article.featured_image} 
                alt={article.title}
                className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 z-20 container flex items-end pb-12" style={{direction : "rtl"}}>
                <div className="text-white max-w-3xl">
                    <div className="flex items-center gap-4 text-sm mb-4 opacity-90">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(article.published_at).toLocaleDateString('ar-EG')}
                        </span>
                        {article.author_name && (
                            <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {article.author_name}
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">{article.title}</h1>
                </div>
            </div>
        </div>

        <div className="container grid md:grid-cols-[1fr_300px] gap-12" style={{direction : "rtl"}}>
            {/* Main Content */}
            <article className="article-content">
                <style>{`
                    .article-content {
                        font-size: 1.125rem;
                        line-height: 1.8;
                        color: #374151;
                    }
                    .article-content h2 {
                        font-size: 1.5rem;
                        font-weight: 700;
                        color: #111827;
                        margin-top: 2rem;
                        margin-bottom: 1rem;
                    }
                    .article-content h3 {
                        font-size: 1.25rem;
                        font-weight: 600;
                        color: #111827;
                        margin-top: 1.5rem;
                        margin-bottom: 0.75rem;
                    }
                    .article-content p {
                        margin-bottom: 1.25rem;
                    }
                    .article-content ul, .article-content ol {
                        margin-bottom: 1.25rem;
                        padding-right: 1.5rem;
                        list-style-type: disc;
                    }
                    .article-content li {
                        margin-bottom: 0.5rem;
                    }
                `}</style>
                <div dangerouslySetInnerHTML={{ __html: article.content }} />
            </article>

            {/* Sidebar */}
            <aside className="space-y-8">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                    <h3 className="font-bold text-lg mb-4">شارك المقال</h3>
                    <div className="flex gap-4">
                        <button className="p-2 rounded-full bg-white text-blue-600 hover:bg-blue-50 border border-gray-200 transition-colors">
                            <Facebook className="w-5 h-5" />
                        </button>
                        <button className="p-2 rounded-full bg-white text-sky-500 hover:bg-sky-50 border border-gray-200 transition-colors">
                            <Twitter className="w-5 h-5" />
                        </button>
                        <button className="p-2 rounded-full bg-white text-blue-700 hover:bg-blue-50 border border-gray-200 transition-colors">
                            <Linkedin className="w-5 h-5" />
                        </button>
                        <button className="p-2 rounded-full bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 transition-colors">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                <div className="bg-primary/5 p-6 rounded-xl border border-primary/10">
                    <h3 className="font-bold text-lg mb-2">اشترك في نشرتنا</h3>
                    <p className="text-sm text-gray-600 mb-4">احصل على أحدث المقالات والنصائح مباشرة إلى بريدك الإلكتروني.</p>
                    <input 
                        type="email" 
                        placeholder="بريدك الإلكتروني" 
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 mb-2 focus:outline-none focus:border-primary"
                    />
                    <button className="w-full bg-primary text-white font-medium py-2 rounded-lg hover:bg-primary/90 transition-colors">
                        اشترك الآن
                    </button>
                </div>
            </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
