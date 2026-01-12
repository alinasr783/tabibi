import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../../services/supabase';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { Button } from '../ui/button';

// Fallback data in case table is empty or not created yet
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

export default function BlogSection() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticles() {
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(3);
        
        if (error) throw error;
        if (data && data.length > 0) {
          setArticles(data);
        } else {
            // Fallback if no data found (e.g. table empty)
             setArticles(DUMMY_ARTICLES);
        }
      } catch (err) {
        console.error("Error fetching articles:", err);
        setArticles(DUMMY_ARTICLES); // Fallback on error (e.g. table missing)
      } finally {
        setLoading(false);
      }
    }
    fetchArticles();
  }, []);

  if (loading) return null; // Or a skeleton

  return (
    <section className="py-20 bg-gray-50" id="blog">
        <div className="container">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">أحدث المقالات الطبية</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    تابع أحدث النصائح والمقالات حول إدارة العيادات والتكنولوجيا الطبية.
                </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
                {articles.map((article) => (
                    <div key={article.id || article.slug} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col h-full">
                        {/* Image */}
                        <Link to={`/blog/${article.slug}`} className="block aspect-video overflow-hidden relative group">
                             <img 
                                src={article.featured_image} 
                                alt={article.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                             />
                        </Link>
                        
                        {/* Content */}
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

            <div className="text-center mt-10">
                <Button asChild variant="outline" size="lg">
                    <Link to="/blog">عرض جميع المقالات</Link>
                </Button>
            </div>
        </div>
    </section>
  );
}
