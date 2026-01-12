import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import supabase from '../services/supabase';
import { Calendar, User, ArrowLeft, Search } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

// Fallback data
const DUMMY_ARTICLES = [
    {
        id: '1',
        slug: 'importance-of-digital-clinic-management',
        title: 'أهمية التحول الرقمي في إدارة العيادات الطبية',
        excerpt: 'اكتشف كيف يمكن للتحول الرقمي أن يغير مسار عيادتك ويحسن تجربة المرضى.',
        featured_image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
        published_at: new Date().toISOString(),
        author_name: 'فريق طبيبي'
    },
    {
        id: '2',
        slug: 'how-to-improve-patient-experience',
        title: '5 طرق لتحسين تجربة المريض في عيادتك',
        excerpt: 'تعرف على أفضل الممارسات لتحسين رضا المرضى وضمان ولائهم لعيادتك.',
        featured_image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
        published_at: new Date(Date.now() - 86400000).toISOString(),
        author_name: 'د. أحمد علي'
    },
    {
        id: '3',
        slug: 'telemedicine-future-in-egypt',
        title: 'مستقبل التطبيب عن بعد في مصر',
        excerpt: 'تحليل لواقع ومستقبل التطبيب عن بعد في مصر والفرص المتاحة.',
        featured_image: 'https://images.unsplash.com/photo-1576091160550-217358c7c8c9?auto=format&fit=crop&w=800&q=80',
        published_at: new Date(Date.now() - 172800000).toISOString(),
        author_name: 'سارة محمد'
    }
];

export default function BlogPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchArticles() {
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq('status', 'published')
          .order('published_at', { ascending: false });
        
        if (error) throw error;
        setArticles(data || []);
      } catch (err) {
        console.error("Error fetching articles:", err);
        setArticles(DUMMY_ARTICLES);
      } finally {
        setLoading(false);
      }
    }
    fetchArticles();
  }, []);

  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    article.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{direction: "rtl"}}>
      <Helmet>
        <title>مدونة طبيبي - مقالات ونصائح لإدارة العيادات الطبية</title>
        <meta name="description" content="اقرأ أحدث المقالات والنصائح حول إدارة العيادات الطبية، التحول الرقمي، وتحسين تجربة المرضى في مصر. مدونة طبيبي هي دليلك للنجاح." />
        <link rel="canonical" href="https://tabibi.app/blog" />
        <meta property="og:title" content="مدونة طبيبي - مقالات ونصائح لإدارة العيادات الطبية" />
        <meta property="og:description" content="اقرأ أحدث المقالات والنصائح حول إدارة العيادات الطبية، التحول الرقمي، وتحسين تجربة المرضى في مصر." />
        <meta property="og:url" content="https://tabibi.app/blog" />
      </Helmet>
      <Header />
      <main className="flex-grow pt-24 pb-12">
        <div className="container">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4">مدونة طبيبي</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                    كل ما يهمك عن إدارة العيادات، التكنولوجيا الطبية، ونصائح لتحسين رعاية المرضى.
                </p>
                
                {/* Search */}
                <div className="max-w-md mx-auto relative">
                    <input
                        type="text"
                        placeholder="ابحث عن مقال..."
                        className="w-full pl-4 pr-10 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">جاري التحميل...</div>
            ) : filteredArticles.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredArticles.map((article) => (
                        <div key={article.id || article.slug} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col h-full">
                            <Link to={`/blog/${article.slug}`} className="block aspect-video overflow-hidden relative group">
                                <img 
                                    src={article.featured_image} 
                                    alt={article.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            </Link>
                            <div className="p-6 flex flex-col flex-grow">
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(article.published_at).toLocaleDateString('ar-EG')}
                                    </span>
                                    {article.author_name && (
                                        <span className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {article.author_name}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-xl font-bold mb-2 line-clamp-2">
                                    <Link to={`/blog/${article.slug}`} className="hover:text-primary transition-colors">
                                        {article.title}
                                    </Link>
                                </h3>
                                <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
                                    {article.excerpt}
                                </p>
                                <Link 
                                    to={`/blog/${article.slug}`} 
                                    className="inline-flex items-center text-primary font-medium text-sm hover:underline mt-auto"
                                >
                                    اقرأ المزيد
                                    <ArrowLeft className="w-4 h-4 mr-1" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-muted-foreground">
                    لا توجد مقالات تطابق بحثك.
                </div>
            )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
