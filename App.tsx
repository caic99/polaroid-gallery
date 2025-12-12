
import React, { useEffect, useState, useRef } from 'react';
import { fetchExhibits, getOptimizedImageUrl } from './services/api';
import { ExhibitItem, GalleryItem } from './types';
import ExhibitCard from './components/ExhibitCard';
import Lightbox from './components/Lightbox';
import { ArrowLeft, Loader2, AlertTriangle, ChevronLeft } from './components/Icons';

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

  return (
    <div className="min-h-screen bg-[#0e0e1a] flex flex-col font-sans text-zinc-100">
      
      {/* App Header */}
      <header className={`sticky top-0 z-40 w-full transition-colors duration-300 ${selectedExhibit ? 'bg-[#2c2435] shadow-sm' : 'bg-[#0e0e1a]/90 backdrop-blur-md border-b border-white/5'}`}>
        <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between relative">
          {selectedExhibit ? (
             <>
               <button 
                 onClick={handleBack}
                 className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-all absolute left-4 z-10"
               >
                 <ArrowLeft className="w-6 h-6" />
               </button>
               
               <div className="w-full text-center">
                 <h1 className="text-lg font-semibold tracking-wide truncate px-12">
                   {selectedExhibit.title}
                 </h1>
               </div>
               
               <div className="w-10"></div>
             </>
          ) : (
             <div className="pt-2 w-full">
                <h1 className="text-3xl font-bold tracking-tight">
                  Weekly 8
                </h1>
             </div>
          )}
        </div>
      </header>

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
              <div className="flex-1 bg-[#2c2435] relative flex flex-col">
                
                {/* Horizontal Scroll Container */}
                <div 
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 w-full overflow-x-auto snap-x snap-mandatory flex scrollbar-hide items-center"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {galleryItems.map((item, idx) => {
                        const asset = item.image?.asset;
                        if (!asset) return null;
                        const imageUrl = getOptimizedImageUrl(asset.url, 1200);
                        
                        return (
                            <div key={idx} className="min-w-full w-full h-full snap-center flex flex-col items-center justify-center p-4 md:p-8 relative">
                                
                                <div className="w-full h-full flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in-95 duration-500">
                                  {/* Image Container - Flexible width/height, NO CROP */}
                                  <div 
                                      className="relative flex items-center justify-center cursor-zoom-in transition-transform hover:scale-[1.01] duration-300"
                                      onClick={() => setSelectedImage(item)}
                                  >
                                      <img 
                                          src={imageUrl}
                                          alt={item.title || "Gallery Item"}
                                          // w-auto h-auto object-contain ensures natural aspect ratio
                                          // Max constraints ensure it fits on screen
                                          className="max-w-[90vw] max-h-[60vh] md:max-h-[70vh] w-auto h-auto object-contain shadow-2xl"
                                          loading="lazy"
                                          draggable="false"
                                      />
                                  </div>

                                  {/* Meta Info Row - Only Author/Title */}
                                  <div className="flex items-center justify-center text-white/90 mt-2">
                                      <span className="font-medium text-lg tracking-wide drop-shadow-md">
                                          {item.title || "Untitled"}
                                      </span>
                                  </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Navigation Controls Row (Buttons + Dots) */}
                <div className="absolute inset-x-0 bottom-8 flex justify-center items-center gap-6 z-10 pointer-events-none">
                  {/* Left Button */}
                  <button 
                    onClick={prevSlide}
                    disabled={currentIndex === 0}
                    className="pointer-events-auto p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm disabled:opacity-0 disabled:pointer-events-none transition-all"
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
                          idx === currentIndex ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/50'
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                  {/* Right Button */}
                  <button 
                    onClick={nextSlide}
                    disabled={currentIndex === galleryItems.length - 1}
                    className="pointer-events-auto p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm disabled:opacity-0 disabled:pointer-events-none transition-all"
                  >
                    <ChevronLeft className="w-6 h-6 rotate-180" />
                  </button>
                </div>

              </div>
            ) : (
              // HOME VIEW: Vertical Stack
              <div className="container mx-auto px-4 py-8 animate-in fade-in duration-300">
                <p className="text-zinc-400 text-sm mb-6">
                  Explore fresh galleries curated by the Polaroid team.
                </p>
                
                <div className="flex flex-col gap-8 max-w-7xl mx-auto">
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
