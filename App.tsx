import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { fetchExhibits } from './services/api';
import { ExhibitItem } from './types';
import ExhibitCard from './components/ExhibitCard';
import GallerySlide from './components/GallerySlide';
import { Loader2, AlertTriangle, ChevronLeft } from './components/Icons';
import { interpolateColor, safeUpdateHistory } from './utils/helpers';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';

// Component to handle scroll restoration for Home View
const ScrollRestorer = ({ position }: { position: number }) => {
  useLayoutEffect(() => {
    window.scrollTo({ top: position, behavior: 'instant' });
  }, [position]);
  return null;
};

// Component to scroll to top for Detail View
const ScrollToTop = () => {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  return null;
};

const App: React.FC = () => {
  const [exhibits, setExhibits] = useState<ExhibitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExhibit, setSelectedExhibit] = useState<ExhibitItem | null>(null);
  
  // Carousel State
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  
  // Scroll Position Management
  const homeScrollPosRef = useRef(0);

  // Set base title from initial document title
  const [baseTitle] = useState(document.title);

  // Sync state from URL parameters
  const syncStateFromUrl = useCallback((items: ExhibitItem[]) => {
    // Basic search param parsing works in blob URL if query string is present
    const params = new URLSearchParams(window.location.search);
    const exhibitId = params.get('exhibit');
    const slideIndex = params.get('slide');

    if (exhibitId) {
      const foundExhibit = items.find(e => e.identifier === exhibitId);
      if (foundExhibit) {
        setSelectedExhibit(foundExhibit);
        if (slideIndex) {
          const idx = parseInt(slideIndex, 10);
          if (!isNaN(idx) && idx >= 0) {
            setCurrentIndex(idx);
          } else {
            setCurrentIndex(0);
          }
        } else {
          setCurrentIndex(0);
        }
      }
    } else {
      setSelectedExhibit(null);
      setCurrentIndex(0);
    }
  }, []);

  useEffect(() => {
    // Manual scroll restoration to prevent browser interference during transitions
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchExhibits();
        setExhibits(data);
        syncStateFromUrl(data);
      } catch (err) {
        setError("Unable to retrieve gallery data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Handle browser back/forward URL sync
  useEffect(() => {
    const handlePopState = () => {
      if (exhibits.length > 0) {
        syncStateFromUrl(exhibits);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [exhibits, syncStateFromUrl]);

  // Update document title based on current view
  useEffect(() => {
    if (selectedExhibit) {
      const galleryItems = selectedExhibit.gallery?.galleryItems?.filter(i => i.image?.asset) || [];
      const currentItem = galleryItems[currentIndex];
      
      let newTitle = selectedExhibit.title;
      // Prepend image title if it exists and is different from the exhibit title
      if (currentItem?.title && currentItem.title.toLowerCase() !== newTitle.toLowerCase()) {
        newTitle = `${currentItem.title} - ${newTitle}`;
      }
      
      document.title = `${newTitle} | ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [selectedExhibit, currentIndex, baseTitle]);

  // Use LayoutEffect to handle scrolling BEFORE paint to ensure correct entry position.
  useLayoutEffect(() => {
    if (selectedExhibit && scrollContainerRef.current) {
      const width = scrollContainerRef.current.clientWidth;
      // Instant scroll to the target slide ONLY when exhibit changes (entry)
      scrollContainerRef.current.scrollTo({
        left: width * currentIndex,
        behavior: 'instant'
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExhibit]); 

  // Effect to scroll when index changes via navigation buttons
  useEffect(() => {
    if (selectedExhibit && scrollContainerRef.current) {
       // Only smooth scroll if we are already viewing the gallery
       const width = scrollContainerRef.current.clientWidth;
       const currentScroll = scrollContainerRef.current.scrollLeft;
       const targetScroll = width * currentIndex;
       
       // Only scroll if the difference is significant (avoids micro-adjustments during manual scroll)
       if (Math.abs(currentScroll - targetScroll) > 20) {
         scrollContainerRef.current.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
          });
       }
    }
  }, [currentIndex, selectedExhibit]);

  const handleExhibitClick = (exhibit: ExhibitItem, initialIndex: number = 0) => {
    // Save current scroll position before navigating to detail view
    homeScrollPosRef.current = window.scrollY;

    setSelectedExhibit(exhibit);
    setCurrentIndex(initialIndex);
    
    const params = new URLSearchParams(window.location.search);
    params.set('exhibit', exhibit.identifier);
    params.set('slide', initialIndex.toString());
    
    const newRelativePath = `?${params.toString()}`;
    safeUpdateHistory('push', newRelativePath);
  };

  const handleBack = () => {
    setSelectedExhibit(null);
    setCurrentIndex(0);
    
    const params = new URLSearchParams(window.location.search);
    params.delete('exhibit');
    params.delete('slide');
    const newSearch = params.toString();
    const newRelativePath = newSearch ? `?${newSearch}` : window.location.pathname;
    
    safeUpdateHistory('push', newRelativePath);
  };

  // Pre-calculate colors for the current gallery
  const galleryColors = React.useMemo(() => {
    if (!selectedExhibit) return [];
    const coverColor = selectedExhibit.coverImages?.[0]?.asset?.metadata?.palette?.dominant?.background || '#2c2435';
    // Map items to their palette color or fallback
    return (selectedExhibit.gallery?.galleryItems?.filter(i => i.image?.asset) || []).map(item => 
       item.image?.asset?.metadata?.palette?.dominant?.background || coverColor
    );
  }, [selectedExhibit]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      
      const index = Math.round(scrollLeft / clientWidth);
      if (index !== currentIndex) {
        setCurrentIndex(index);
        
        if (selectedExhibit) {
           const params = new URLSearchParams(window.location.search);
           params.set('exhibit', selectedExhibit.identifier);
           params.set('slide', index.toString());
           safeUpdateHistory('replace', `?${params.toString()}`);
        }
      }

      if (galleryColors.length > 0) {
        const maxIndex = galleryColors.length - 1;
        const rawProgress = scrollLeft / clientWidth;
        const index1 = Math.floor(rawProgress);
        const index2 = Math.min(index1 + 1, maxIndex);
        const factor = rawProgress - index1;
        
        const safeIndex1 = Math.max(0, Math.min(index1, maxIndex));
        const safeIndex2 = Math.max(0, Math.min(index2, maxIndex));

        const color1 = galleryColors[safeIndex1];
        const color2 = galleryColors[safeIndex2];
        
        const newColor = interpolateColor(color1, color2, factor);

        if (mainRef.current) {
          mainRef.current.style.transition = 'none';
          mainRef.current.style.backgroundColor = newColor;
        }
        document.body.style.transition = 'none';
        document.body.style.backgroundColor = newColor;
        
        const metaThemeColor = document.querySelector("meta[name='theme-color']");
        if (metaThemeColor) metaThemeColor.setAttribute('content', newColor);
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

  const galleryItems = selectedExhibit?.gallery?.galleryItems?.filter(i => i.image?.asset) || [];

  useEffect(() => {
    if (!selectedExhibit) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      } else if (e.key === 'Escape') {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedExhibit, currentIndex]);

  let appBgColor = '#0e0e1a'; 
  let appTextColor = '#f4f4f5';

  if (selectedExhibit) {
    const currentItem = galleryItems[currentIndex];
    const currentPalette = currentItem?.image?.asset?.metadata?.palette;
    const coverAsset = selectedExhibit?.coverImages?.[0]?.asset;
    const fallbackPalette = coverAsset?.metadata?.palette;
    const displayPalette = currentPalette || fallbackPalette;
    
    appTextColor = displayPalette?.dominant?.foreground || '#ffffff';
  }

  useEffect(() => {
    if (!selectedExhibit) {
      if (mainRef.current) {
        mainRef.current.style.transition = ''; 
        mainRef.current.style.backgroundColor = ''; 
      }
      document.body.style.transition = '';
      document.body.style.backgroundColor = appBgColor;
      
      const metaThemeColor = document.querySelector("meta[name='theme-color']");
      if (metaThemeColor) metaThemeColor.setAttribute('content', appBgColor);
    } else {
      const initialColor = galleryColors[currentIndex] || galleryColors[0];
      if (initialColor) {
        if (mainRef.current) {
          mainRef.current.style.backgroundColor = initialColor;
        }
        document.body.style.backgroundColor = initialColor;
        const metaThemeColor = document.querySelector("meta[name='theme-color']");
        if (metaThemeColor) metaThemeColor.setAttribute('content', initialColor);
      }
    }
  }, [selectedExhibit, appBgColor, galleryColors, currentIndex]); 

  return (
    <div 
      ref={mainRef}
      className="min-h-screen flex flex-col font-sans transition-colors duration-700 ease-in-out"
      style={{ 
        backgroundColor: !selectedExhibit ? appBgColor : undefined, 
        color: appTextColor 
      }}
    >
      <LayoutGroup>
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
          <AnimatePresence mode="wait">
            {selectedExhibit ? (
              // DETAIL VIEW
              <motion.div 
                key="detail"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={handleBack}
                className="flex-1 relative flex flex-col w-full cursor-zoom-out"
              >
                <ScrollToTop />

                <div 
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 w-full overflow-x-auto snap-x snap-mandatory flex scrollbar-hide items-center"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {galleryItems.map((item, idx) => (
                        <div key={idx} className="min-w-full w-full h-full snap-center flex flex-col items-center justify-center p-4 md:p-8 relative">
                           {/* Only prioritize loading for current and adjacent slides */}
                           <GallerySlide item={item} priority={Math.abs(currentIndex - idx) <= 1} />
                        </div>
                    ))}
                </div>

                <div className="absolute inset-x-0 bottom-8 flex justify-center items-center gap-6 z-10 pointer-events-none">
                  <button 
                    onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                    disabled={currentIndex === 0}
                    className="pointer-events-auto p-2 rounded-full hover:bg-black/10 backdrop-blur-sm disabled:opacity-0 disabled:pointer-events-none transition-all cursor-pointer"
                    style={{ color: 'inherit' }}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div className="flex gap-2 pointer-events-auto">
                    {galleryItems.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); scrollToIndex(idx); }}
                        className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                          idx === currentIndex ? 'scale-125' : 'opacity-40 hover:opacity-60'
                        }`}
                        style={{ backgroundColor: 'currentColor' }}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                    disabled={currentIndex === galleryItems.length - 1}
                    className="pointer-events-auto p-2 rounded-full hover:bg-black/10 backdrop-blur-sm disabled:opacity-0 disabled:pointer-events-none transition-all cursor-pointer"
                    style={{ color: 'inherit' }}
                  >
                    <ChevronLeft className="w-6 h-6 rotate-180" />
                  </button>
                </div>
              </motion.div>
            ) : (
              // HOME VIEW
              <motion.div 
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="container mx-auto px-4 pt-12 pb-8 md:pt-20 md:pb-12"
              >
                <ScrollRestorer position={homeScrollPosRef.current} />
                <div className="max-w-7xl mx-auto">
                  <div className="mb-10 md:mb-14">
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-2 leading-none">
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
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
      </LayoutGroup>
    </div>
  );
};

export default App;