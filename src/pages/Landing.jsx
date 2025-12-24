import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, useAnimation, useInView } from "framer-motion";
import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import Hero from "../components/sections/Hero";
import AKMediaPartnership from "../components/sections/AKMediaPartnership";
import usePageMeta from "../hooks/usePageMeta";

// Lazy load all sections
const CoreFeatures = lazy(() => import("../components/sections/CoreFeatures"));
const OnlineBooking = lazy(() => import("../components/sections/OnlineBooking"));
const PainSolution = lazy(() => import("../components/sections/PainSolution"));
const Pricing = lazy(() => import("../components/sections/Pricing"));
const Testimonials = lazy(() => import("../components/sections/Testimonials"));
const FAQ = lazy(() => import("../components/sections/FAQ"));
const CTA = lazy(() => import("../components/sections/CTA"));

// Loading skeletons for lazy components
function SectionSkeleton() {
  return (
    <div className="container py-16">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
        <div className="grid md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Animated section wrapper for advanced scroll animations
function AnimatedSection({ children, id, className = "" }) {
  const controls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  const variants = {
    hidden: { 
      opacity: 0, 
      y: 50,
      scale: 0.95,
      rotateX: 10
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      rotateX: 0,
      transition: { 
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.section
      ref={ref}
      id={id}
      className={className}
      initial="hidden"
      animate={controls}
      variants={variants}
    >
      {children}
    </motion.section>
  );
}

export default function Landing() {
  const location = useLocation();
  const [scrollProgress, setScrollProgress] = useState(0);
  const lastScrollY = useRef(0);
  const scrollVelocity = useRef(0);

  // Handle scroll progress indicator with physics-based animation
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const scrolled = (scrollTop / docHeight) * 100;
          
          // Calculate scroll velocity for physics-based animation
          scrollVelocity.current = scrollTop - lastScrollY.current;
          lastScrollY.current = scrollTop;
          
          // Apply easing based on scroll velocity for more natural feel
          const easedProgress = calculateEasedProgress(scrolled, scrollVelocity.current);
          setScrollProgress(easedProgress);
          
          // Update the progress bar
          const progressBar = document.getElementById('scroll-progress');
          if (progressBar) {
            progressBar.style.width = `${easedProgress}%`;
            
            // Add physics-based easing for smoother animation
            progressBar.style.transitionTimingFunction = getPhysicsEasing(scrollVelocity.current);
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    // Physics-based easing function
    const getPhysicsEasing = (velocity) => {
      // Slower scroll = more elastic feel, faster scroll = more momentum
      const speed = Math.abs(velocity);
      if (speed < 2) return 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // Elastic start/end
      if (speed < 5) return 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'; // Smooth
      return 'cubic-bezier(0.4, 0, 0.2, 1)'; // Momentum-based
    };

    // Easing function for progress based on velocity
    const calculateEasedProgress = (progress, velocity) => {
      const speed = Math.abs(velocity);
      // Add slight anticipation at start and overshoot at end for natural feel
      if (progress < 10) {
        return progress * (1 + (speed / 100)); // Anticipation at start
      } else if (progress > 90) {
        return progress * (1 - (speed / 500)); // Ease out at end
      }
      return progress;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!location.hash) return;

    const id = location.hash.replace("#", "");
    let attempts = 0;

    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        // Scroll to the beginning of the section (no offset needed since header is not sticky)
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (attempts < 6) {
        attempts += 1;
        setTimeout(tryScroll, 200);
      }
    };

    // small timeout to allow layout/lazy sections to mount
    setTimeout(tryScroll, 50);
  }, [location]);

  // Set SEO meta for the landing page
  usePageMeta({
    title: "تابيبي — نظام إدارة العيادات والمواعيد",
    description:
      "تابيبي نظام عربي لإدارة العيادات: حجز مواعيد، ملف طبي، فواتير، وتقارير.",
    url: typeof window !== "undefined" ? window.location.href : "/",
    canonical:
      typeof window !== "undefined" ? window.location.href.split("#")[0] : "/",
    image: "/hero-optimized.webp",
  });

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    // Make sure the main container allows normal scrolling and accounts for fixed header
    <div dir="rtl" className="min-h-svh bg-background relative">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-70">
        <div className="absolute -top-24 start-1/2 -translate-x-1/2 size-[40rem] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 end-0 size-[24rem] rounded-full bg-secondary/20 blur-3xl" />
      </div>
      
      {/* Header is now fixed and dynamically moves with scroll */}
      <Header />
      <div className="pt-16">
        <Hero />
      </div>
      
      {/* AK MEDIA Partnership Section - Added right after Hero */}
      <AKMediaPartnership />
      
      {/* Lazy load sections with fallback UI and animations */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp}>
          <Suspense fallback={<SectionSkeleton />}>
            <CoreFeatures />
          </Suspense>
        </motion.div>
        
        <motion.div variants={fadeInUp}>
          <Suspense fallback={<SectionSkeleton />}>
            <OnlineBooking />
          </Suspense>
        </motion.div>
        
        <motion.div variants={fadeInUp}>
          <Suspense fallback={<SectionSkeleton />}>
            <PainSolution />
          </Suspense>
        </motion.div>
        
        <motion.div variants={fadeInUp}>
          <Suspense fallback={<SectionSkeleton />}>
            <Pricing />
          </Suspense>
        </motion.div>
        
        <motion.div variants={fadeInUp}>
          <Suspense fallback={<SectionSkeleton />}>
            <Testimonials />
          </Suspense>
        </motion.div>
        
        <motion.div variants={fadeInUp}>
          <Suspense fallback={<SectionSkeleton />}>
            <FAQ />
          </Suspense>
        </motion.div>
        
        <motion.div variants={fadeInUp}>
          <Suspense fallback={<SectionSkeleton />}>
            <CTA />
          </Suspense>
        </motion.div>
      </motion.div>
      
      <Footer />
      
      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/+201158954215"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-all duration-300 transform hover:scale-110"
        aria-label="تواصل معنا عبر واتساب"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </div>
  );
}