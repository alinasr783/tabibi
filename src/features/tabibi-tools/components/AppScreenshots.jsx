import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-cards';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

export default function AppScreenshots({ app }) {
  // Logic to determine images to display in carousel
  const getScreenshots = () => {
    if (app.screenshots && app.screenshots.length > 0) {
      return typeof app.screenshots === 'string' ? JSON.parse(app.screenshots) : app.screenshots;
    }
    if (app.images && app.images.length > 0) {
      return typeof app.images === 'string' ? JSON.parse(app.images) : app.images;
    }
    // Fallback to show the carousel using the main image if available
    if (app.image_url) {
      return [app.image_url, app.image_url, app.image_url];
    }
    return [];
  };

  const displayImages = getScreenshots();

  if (displayImages.length === 0) return null;

  return (
    <div className="w-full bg-background overflow-hidden">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <style>{`
          .swiper {
            width: 280px;
            height: 420px;
          }
          @media (min-width: 768px) {
            .swiper {
              width: 400px;
              height: 550px;
            }
          }
          .swiper-slide {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 18px;
            font-size: 22px;
            font-weight: bold;
            color: #fff;
            background-color: #fff;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          .swiper-pagination-bullet-active {
            background: hsl(var(--primary));
          }
        `}</style>
        <div className="space-y-4 flex flex-col items-center">
            <h3 className="font-bold text-lg px-2 w-full text-start">صور التطبيق</h3>
            <div className="py-8" dir="ltr">
              <Swiper
                effect={'cards'}
                grabCursor={true}
                modules={[EffectCards, Pagination, Navigation]}
                pagination={{ 
                  clickable: true,
                  dynamicBullets: true
                }}
                cardsEffect={{
                  perSlideOffset: 8,
                  perSlideRotate: 2,
                  slideShadows: false,
                }}
                className="mySwiper"
              >
                {displayImages.map((img, idx) => (
                  <SwiperSlide key={idx} className="border bg-background">
                    <div className="relative w-full h-full p-2 flex items-center justify-center bg-secondary/5">
                      <img 
                        src={img} 
                        alt={`Screenshot ${idx + 1}`} 
                        className="w-full h-full object-contain rounded-xl select-none"
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
        </div>
      </div>
    </div>
  );
}
