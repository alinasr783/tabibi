import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to load .env file manually since we don't want to add dotenv dependency just for this
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
        return process.env;
    }
    const envFile = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envFile.split('\n').forEach(line => {
      // Simple parsing: KEY=VALUE
      // Ignore comments and empty lines
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;

      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        
        env[key] = value;
      }
    });
    return env;
  } catch (e) {
    console.warn('Could not read .env file, relying on process.env', e);
    return process.env;
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.');
  console.error('Make sure you have a .env file in the root directory or environment variables set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SITE_URL = 'https://tabibi.site';

const STATIC_ROUTES = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/signup', priority: 0.8, changefreq: 'monthly' },
  { path: '/login', priority: 0.8, changefreq: 'monthly' },
  { path: '/blog', priority: 0.9, changefreq: 'daily' },
  { path: '/privacy-policy', priority: 0.5, changefreq: 'yearly' },
  { path: '/terms-of-service', priority: 0.5, changefreq: 'yearly' },
];

async function generateSitemap() {
  console.log('Generating sitemap...');
  console.log('Fetching articles from Supabase...');
  
  const { data: articles, error } = await supabase
    .from('articles')
    .select('slug, updated_at, published_at')
    .eq('status', 'published');

  if (error) {
    console.error('Error fetching articles:', error);
    // Continue with static routes only if database fails? 
    // No, better to fail so we know something is wrong, or maybe just log it.
    // We'll proceed but log the error.
  }

  const articleCount = articles ? articles.length : 0;
  console.log(`Found ${articleCount} published articles.`);

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // Add static routes
  const today = new Date().toISOString().split('T')[0];
  
  STATIC_ROUTES.forEach(route => {
    sitemap += `
  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
  });

  // Add article routes
  if (articles) {
    articles.forEach(article => {
      const dateToUse = article.updated_at || article.published_at || new Date();
      const lastmod = new Date(dateToUse).toISOString().split('T')[0];
      sitemap += `
  <url>
    <loc>${SITE_URL}/blog/${article.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });
  }

  sitemap += `
</urlset>`;

  const publicDir = path.resolve(process.cwd(), 'public');
  const sitemapPath = path.join(publicDir, 'sitemap.xml');

  fs.writeFileSync(sitemapPath, sitemap);
  console.log(`✅ Sitemap successfully generated at ${sitemapPath}`);
}

generateSitemap();
