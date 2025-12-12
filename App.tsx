import React, { useEffect, useState, useRef } from 'react';
import { fetchExhibits, getOptimizedImageUrl } from './services/api';
import { ExhibitItem, GalleryItem } from './types';
import ExhibitCard from './components/ExhibitCard';
import Lightbox from './components/Lightbox';
import { ArrowLeft, Loader2, AlertTriangle, ChevronLeft } from './components/Icons';

// Sub-component for individual gallery slides to handle loading state
const GallerySlide = ({ item, onClick }: { item: GalleryItem, onClick: (item: GalleryItem) => void }) => {
  const [loaded, setLoaded] = useState(false);
  const asset = item.image?.asset;
  
  if (!asset) return null;
  const highResUrl = getOptimizedImageUrl(asset.url, 1200);
  const lowResUrl = getOptimizedImageUrl(asset.url, 400); // Use the same size as grid view for cache hit
  const dims = asset.metadata?.dimensions;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in-95 duration-500">
      {/* 
        Image Container 
        Use grid to stack. The 'relative' image drives the size. 
        The 'absolute' image fills the size.
      */}
      <div className="relative grid place-items-center">
         {/* Low Res Thumbnail (Background) - Always visible to prevent flash/dip during transition */}
         <img 
             src={lowResUrl}
             alt=""
             className="absolute inset-0 w-full h-full object-contain"
             draggable="false"
             aria-hidden="true"
         />
         
         {/* High Res Image (Foreground) - Relative, defines the layout size via width/height attributes */}
         <img 
             src={highResUrl}
             alt={item.title || "Gallery Item"}
             width={dims?.width}
             height={dims?.height}
             onClick={() => onClick(item)}
             className={`relative z-10 max-w-[90vw] max-h-[60vh] md:max-h-[70vh] w-auto h-auto object-contain shadow-2xl cursor-zoom-in transition-opacity duration-700 ease-in-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
             loading="lazy"
             draggable="false"
             onLoad={() => setLoaded(true)}
         />
      </div>

      {/* Meta Info Row */}
      <div className="flex items-center justify-center mt-2 px-4 text-center" style={{ color: 'inherit' }}>
          <span className="font-medium text-lg tracking-wide drop-shadow-md opacity-90 line-clamp-2">
              {item.title || "Untitled"}
          </span>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [exhibits, setExhibits] = useState<ExhibitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExhibit, setSelectedExhibit] = useState<ExhibitItem | null>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  
  // Carousel State
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchExhibits();
        setExhibits(data);
      } catch (err) {
        setError("Unable to retrieve gallery data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleExhibitClick = (exhibit: ExhibitItem) => {
    setSelectedExhibit(exhibit);
    setCurrentIndex(0);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBack = () => {
    setSelectedExhibit(null);
    setCurrentIndex(0);
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const index = Math.round(scrollLeft / clientWidth);
      if (index !== currentIndex) {
        setCurrentIndex(index);
      }
    }
  };

  const scrollToIndex = (index: number) => {
    if (scrollContainerRef.current) {
      const width = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollTo({
        left: width * index,
        behavior: 'smooth'
      });
    }
  };

  const nextSlide = () => {
    const items = selectedExhibit?.gallery?.galleryItems?.filter(i => i.image?.asset) || [];
    if (currentIndex < items.length - 1) {
      scrollToIndex(currentIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  };

  // Filter valid items for the gallery view
  const galleryItems = selectedExhibit?.gallery?.galleryItems?.filter(i => i.image?.asset) || [];

  // Keyboard Navigation
  useEffect(() => {
    // Only active if we are in detail view and lightbox is not open
    if (!selectedExhibit || selectedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedExhibit, selectedImage, currentIndex]);

  // ---------------------------------------------------------------------------
  // DYNAMIC COLOR LOGIC (Immersive)
  // ---------------------------------------------------------------------------
  
  let appBgColor = '#0e0e1a'; // Default Home Background
  let appTextColor = '#f4f4f5'; // Default Home Text (zinc-100)

  if (selectedExhibit) {
    // Determine Dynamic Colors based on the CURRENT SLIDE (Individual Photo)
    // We prioritize the palette of the currently visible image.
    const currentItem = galleryItems[currentIndex];
    const currentPalette = currentItem?.image?.asset?.metadata?.palette;

    // Fallback to exhibit cover if specific photo palette is missing
    const coverAsset = selectedExhibit?.coverImages?.[0]?.asset;
    const fallbackPalette = coverAsset?.metadata?.palette;

    const displayPalette = currentPalette || fallbackPalette;
    
    appBgColor = displayPalette?.dominant?.background || '#2c2435';
    appTextColor = displayPalette?.dominant?.foreground || '#ffffff';
  }

  // Sync Body Background & Meta Theme Color for mobile browsers
  useEffect(() => {
    // 1. Update Body Background (covers overscroll areas)
    document.body.style.backgroundColor = appBgColor;
    
    // 2. Update Meta Theme Color (covers status bars on iOS/Android)
    let metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', appBgColor);

  }, [appBgColor]);

  return (
    <div 
      className="min-h-screen flex flex-col font-sans transition-colors duration-700 ease-in-out"
      style={{ backgroundColor: appBgColor, color: appTextColor }}
    >
      
      {/* Main Content Area */}
      <main className="flex-grow flex flex-col overflow-hidden relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500 gap-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        ) : error ? (
           <div className="flex flex-col items-center justify-center h-[50vh] text-center px-6">
            <AlertTriangle className="w-8 h-8 text-polaroid-red mb-4" />
            <p className="text-zinc-400 mb-6">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-zinc-800 text-white rounded-full text-sm font-medium"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {selectedExhibit ? (
              // DETAIL VIEW: Horizontal Gallery
              <div className="flex-1 relative flex flex-col">
                
                {/* Floating Back Button */}
                <button 
                  onClick={handleBack}
                  className="absolute top-6 left-6 md:top-8 md:left-8 z-50 p-3 -ml-3 rounded-full hover:bg-white/10 transition-all opacity-80 hover:opacity-100"
                  style={{ color: 'inherit' }}
                  aria-label="Back to gallery"
                >
                  <ArrowLeft className="w-8 h-8 md:w-10 md:h-10" />
                </button>

                {/* Horizontal Scroll Container */}
                <div 
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 w-full overflow-x-auto snap-x snap-mandatory flex scrollbar-hide items-center"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {galleryItems.map((item, idx) => (
                        <div key={idx} className="min-w-full w-full h-full snap-center flex flex-col items-center justify-center p-4 md:p-8 relative">
                           <GallerySlide item={item} onClick={setSelectedImage} />
                        </div>
                    ))}
                </div>

                {/* Navigation Controls Row */}
                <div className="absolute inset-x-0 bottom-8 flex justify-center items-center gap-6 z-10 pointer-events-none">
                  {/* Left Button */}
                  <button 
                    onClick={prevSlide}
                    disabled={currentIndex === 0}
                    className="pointer-events-auto p-2 rounded-full hover:bg-black/10 backdrop-blur-sm disabled:opacity-0 disabled:pointer-events-none transition-all"
                    style={{ color: 'inherit' }}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  {/* Dots */}
                  <div className="flex gap-2 pointer-events-auto">
                    {galleryItems.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => scrollToIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          idx === currentIndex ? 'scale-125' : 'opacity-40 hover:opacity-60'
                        }`}
                        style={{ backgroundColor: 'currentColor' }}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                  {/* Right Button */}
                  <button 
                    onClick={nextSlide}
                    disabled={currentIndex === galleryItems.length - 1}
                    className="pointer-events-auto p-2 rounded-full hover:bg-black/10 backdrop-blur-sm disabled:opacity-0 disabled:pointer-events-none transition-all"
                    style={{ color: 'inherit' }}
                  >
                    <ChevronLeft className="w-6 h-6 rotate-180" />
                  </button>
                </div>

              </div>
            ) : (
              // HOME VIEW: Vertical Stack
              <div className="container mx-auto px-4 pt-12 pb-8 md:pt-20 md:pb-12 animate-in fade-in duration-300">
                <div className="max-w-7xl mx-auto">
                  {/* Immersive Header */}
                  <div className="mb-10 md:mb-14">
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-4 leading-none">
                      Weekly 8
                    </h1>
                    <p className="text-zinc-400 text-lg md:text-2xl font-medium max-w-2xl">
                      Explore fresh galleries curated by the Polaroid team.
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-6">
                    {exhibits.map((exhibit, idx) => (
                      <ExhibitCard 
                        key={exhibit.identifier} 
                        exhibit={exhibit} 
                        onClick={handleExhibitClick} 
                        index={idx}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Lightbox Overlay */}
      {selectedImage && (
        <Lightbox 
          item={selectedImage} 
          onClose={() => setSelectedImage(null)} 
        />
      )}
    </div>
  );
};

export default App;