import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fetchCreativeCalls, fetchExhibits, getOptimizedImageUrl } from './services/api';
import { ExhibitItem, GalleryItem, PortableTextBlock } from './types';
import { ensureReadableText } from './utils/color';
import ExhibitCard from './components/ExhibitCard';
import { Loader2, AlertTriangle, ChevronLeft } from './components/Icons';

// Helper to parse hex to rgb
const hexToRgb = (hex: string) => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (match, r, g, b) => (void match, r + r + g + g + b + b));
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const renderDescription = (desc: string | PortableTextBlock[] | undefined) => {
  if (!desc) return null;
  if (typeof desc === 'string') return desc;
  if (Array.isArray(desc)) {
    return desc.map(block => {
      if (block._type === 'block' && block.children) {
        return block.children.map(span => span.text).join('');
      }
      return '';
    }).join('\n');
  }
  return null;
};

// Helper to interpolate between two hex colors
const interpolateColor = (c1: string, c2: string, factor: number) => {
  const rgb1 = hexToRgb(c1);
  const rgb2 = hexToRgb(c2);
  const r = Math.round(rgb1.r + factor * (rgb2.r - rgb1.r));
  const g = Math.round(rgb1.g + factor * (rgb2.g - rgb1.g));
  const b = Math.round(rgb1.b + factor * (rgb2.b - rgb1.b));
  return `rgb(${r}, ${g}, ${b})`;
};

// Sub-component for individual gallery slides to handle loading state
const GallerySlide = ({ item }: { item: GalleryItem }) => {
  const [loaded, setLoaded] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const asset = item.image?.asset;

  useEffect(() => {
    if (loaded) {
      const timer = setTimeout(() => setShowThumbnail(false), 500);
      return () => clearTimeout(timer);
    }
  }, [loaded]);

  if (!asset) return null;
  const highResUrl = getOptimizedImageUrl(asset.url, 1200);
  const thumbnailUrl = getOptimizedImageUrl(asset.url, 400);

  // Calculate Dimensions from Metadata or URL
  let width = asset.metadata?.dimensions?.width;
  let height = asset.metadata?.dimensions?.height;

  if ((!width || !height) && asset.url) {
    const match = asset.url.match(/-(\d+)x(\d+)\./);
    if (match) {
      width = parseInt(match[1], 10);
      height = parseInt(match[2], 10);
    }
  }

  // Fallback defaults if detection fails
  const finalWidth = width || 820;
  const finalHeight = height || 1000;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
      {/*
        Image Container
        Using CSS Grid to stack placeholder and image perfectly
      */}
      <div className="grid place-items-center w-full">

         {/* Thumbnail (Preview) - Fades out after delay */}
         <img
           src={thumbnailUrl}
           alt=""
           width={finalWidth}
           height={finalHeight}
           decoding="async"
           loading="lazy"
           className={`col-start-1 row-start-1 max-w-[90vw] max-h-[60svh] md:max-h-[70svh] w-full h-full object-contain transition-opacity duration-700 ease-linear ${showThumbnail ? 'opacity-100' : 'opacity-0'}`}
         />

         {/* High Res Image (Overlay) - Fades in when loaded */}
         <img
             src={highResUrl}
             alt={item.title || ''}
             width={finalWidth}
             height={finalHeight}
             className={`col-start-1 row-start-1 z-10 max-w-[90vw] max-h-[60svh] md:max-h-[70svh] w-full h-full object-contain transition-opacity duration-700 ease-linear ${loaded ? 'opacity-100' : 'opacity-0'}`}
             loading="lazy"
             decoding="async"
             draggable="false"
             onLoad={() => setLoaded(true)}
         />
      </div>

      {/* Meta Info Row */}
      <div className="flex flex-col items-center justify-center mt-2 px-4 text-center" style={{ color: 'inherit' }}>
          <span className="font-medium text-lg tracking-wide drop-shadow-md opacity-90 line-clamp-2">
              {item.title}
          </span>
          {item.desc && (
             <span className="mt-1 text-sm opacity-80 max-w-2xl line-clamp-3">
               {renderDescription(item.desc)}
             </span>
          )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [exhibits, setExhibits] = useState<ExhibitItem[]>([]);
  const [creativeCalls, setCreativeCalls] = useState<ExhibitItem[]>([]);
  const [homeTab, setHomeTab] = useState<'weekly' | 'creative'>('weekly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creativeCallsError, setCreativeCallsError] = useState<string | null>(null);
  const [selectedExhibit, setSelectedExhibit] = useState<ExhibitItem | null>(null);

  // Home tab pill pinning (keep always visible after scrolling)
  const tabsAnchorRef = useRef<HTMLDivElement>(null);
  const tabsPillRef = useRef<HTMLDivElement>(null);
  const [tabsPinned, setTabsPinned] = useState(false);
  const [tabsPinnedStyle, setTabsPinnedStyle] = useState<{ right: number } | null>(null);
  const [tabsPlaceholderHeight, setTabsPlaceholderHeight] = useState(0);
  const [tabsPlaceholderWidth, setTabsPlaceholderWidth] = useState(0);

  // Carousel State
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const isTransitioning = useRef(false);
  const scrollRafId = useRef<number | null>(null);
  const themeColorTimer = useRef<number | null>(null);
  const lastAppliedColor = useRef<string | null>(null);

  // Sync state from URL parameters
  const syncStateFromUrl = useCallback((items: ExhibitItem[]) => {
    const params = new URLSearchParams(window.location.search);
    const exhibitId = params.get('exhibit');
    const slideIndex = params.get('slide');

    if (exhibitId) {
      const foundExhibit = items.find(e => e.identifier === exhibitId);
      if (foundExhibit) {
        setSelectedExhibit(foundExhibit);
        // Clamp to the gallery bounds: a stale or hand-edited ?slide= must
        // not leave currentIndex pointing past the last slide (small
        // galleries never emit the corrective scroll event).
        const maxIdx = (foundExhibit.gallery?.galleryItems?.filter(i => i.image?.asset).length || 1) - 1;
        const idx = slideIndex ? parseInt(slideIndex, 10) : 0;
        setCurrentIndex(!isNaN(idx) ? Math.max(0, Math.min(idx, maxIdx)) : 0);
        // We need to wait for render to scroll, handled in useEffect
      }
    } else {
      setSelectedExhibit(null);
      setCurrentIndex(0);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCreativeCallsError(null);

    // The two tabs load independently: the page unblocks as soon as the
    // default (Weekly 8) data arrives, and a failure in one tab no longer
    // blanks the other.
    const weeklyPromise = fetchExhibits()
      .then((items) => {
        setExhibits(items);
        return items;
      })
      .catch(() => {
        setError('Unable to retrieve gallery data.');
        return [] as ExhibitItem[];
      });

    const creativePromise = fetchCreativeCalls()
      .then((items) => {
        setCreativeCalls(items);
        return items;
      })
      .catch(() => {
        setCreativeCalls([]);
        setCreativeCallsError('Unable to retrieve Creative Call data.');
        return [] as ExhibitItem[];
      });

    const weeklyItems = await weeklyPromise;
    setLoading(false);

    // Deep links may point at either tab, so resolve them once both settle.
    const creativeItems = await creativePromise;
    syncStateFromUrl([...weeklyItems, ...creativeItems]);
  }, [syncStateFromUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Effect to handle PopState with fresh data
  useEffect(() => {
    const handlePopState = () => {
      // Whatever entry we land on, our own pushed detail entry is gone.
      pushedDetailEntry.current = false;
      const allItems = [...exhibits, ...creativeCalls];
      if (allItems.length > 0) {
        syncStateFromUrl(allItems);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [exhibits, creativeCalls, syncStateFromUrl]);

  // Effect to scroll to currentIndex when exhibit opens or index changes
  useEffect(() => {
    if (selectedExhibit && scrollContainerRef.current) {
      const width = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollTo({
        left: width * currentIndex,
        behavior: 'instant' // Instant for initial load, user interaction handles smooth
      });
    }
  }, [selectedExhibit]); // Only on exhibit change/open. Scroll handle manages its own updates.

  // True while the top history entry is a detail entry we pushed ourselves,
  // so Back-to-home can pop it instead of pushing a third entry (which made
  // the browser Back button reopen the exhibit the user just closed).
  const pushedDetailEntry = useRef(false);
  // Home scroll offset to restore when the detail view closes.
  const homeScrollY = useRef(0);

  const handleExhibitClick = useCallback((exhibit: ExhibitItem, initialIndex: number = 0) => {
    homeScrollY.current = window.scrollY;
    setSelectedExhibit(exhibit);
    setCurrentIndex(initialIndex);

    // Push state for entering the exhibit
    const url = new URL(window.location.href);
    url.searchParams.set('exhibit', exhibit.identifier);
    url.searchParams.set('slide', initialIndex.toString());
    window.history.pushState({}, '', url.toString());
    pushedDetailEntry.current = true;

    window.scrollTo({ top: 0, behavior: 'instant' });

    // Force scroll after render
    setTimeout(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                left: scrollContainerRef.current.clientWidth * initialIndex,
                behavior: 'instant'
            });
        }
    }, 0);
  }, []);

  const handleBack = () => {
    if (pushedDetailEntry.current) {
      // We pushed the detail entry, so going back pops it: the popstate
      // handler closes the view and browser Back keeps working naturally.
      window.history.back();
      return;
    }
    // Deep link landing: there is no home entry behind us to pop.
    setSelectedExhibit(null);
    setCurrentIndex(0);
    window.history.pushState({}, '', window.location.pathname);
  };

  // Restore the home scroll offset once the home view is back in the DOM,
  // and move focus into the detail view when it opens so keyboard users
  // land where the arrow keys and Escape act.
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selectedExhibit) {
      detailRef.current?.focus({ preventScroll: true });
    } else if (homeScrollY.current > 0) {
      window.scrollTo({ top: homeScrollY.current, behavior: 'instant' });
      homeScrollY.current = 0;
    }
  }, [selectedExhibit]);

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
    // Coalesce scroll work to at most one update per frame. iOS Safari fires
    // scroll events frequently during momentum, and the background-color writes
    // below are too expensive to do on every event.
    if (scrollRafId.current !== null) return;
    scrollRafId.current = requestAnimationFrame(() => {
      scrollRafId.current = null;
      if (!scrollContainerRef.current) return;

      const { scrollLeft, clientWidth } = scrollContainerRef.current;

      // Discrete index for UI controls (dots, arrows)
      const index = Math.round(scrollLeft / clientWidth);
      if (index !== currentIndex) {
        setCurrentIndex(index);

        // Update URL quietly (replaceState) when scrolling to avoid polluting history
        if (selectedExhibit) {
           const url = new URL(window.location.href);
           url.searchParams.set('exhibit', selectedExhibit.identifier);
           url.searchParams.set('slide', index.toString());
           window.history.replaceState({}, '', url.toString());
        }
      }

      // Continuous Linear Color Interpolation
      if (galleryColors.length > 0) {
        const maxIndex = galleryColors.length - 1;
        const rawProgress = scrollLeft / clientWidth;
        const index1 = Math.floor(rawProgress);
        const index2 = Math.min(index1 + 1, maxIndex);
        const factor = rawProgress - index1;

        // Clamp indices to bounds
        const safeIndex1 = Math.max(0, Math.min(index1, maxIndex));
        const safeIndex2 = Math.max(0, Math.min(index2, maxIndex));

        const color1 = galleryColors[safeIndex1];
        const color2 = galleryColors[safeIndex2];

        const newColor = interpolateColor(color1, color2, factor);

        if (newColor !== lastAppliedColor.current) {
          lastAppliedColor.current = newColor;

          // Apply directly to DOM for instant feedback (bypassing React render cycle)
          if (mainRef.current) {
            // Only disable transition if we are not in the initial entry phase
            if (!isTransitioning.current) {
               mainRef.current.style.transition = 'none';
            }
            mainRef.current.style.backgroundColor = newColor;
          }
          if (!isTransitioning.current) {
              document.body.style.transition = 'none';
          }
          document.body.style.backgroundColor = newColor;
        }

        // Defer the meta theme-color update until the user settles. Mutating
        // this attribute repaints the iOS Safari URL bar, which is too
        // expensive to do continuously during scrolling.
        if (themeColorTimer.current !== null) {
          clearTimeout(themeColorTimer.current);
        }
        themeColorTimer.current = window.setTimeout(() => {
          themeColorTimer.current = null;
          const metaThemeColor = document.querySelector("meta[name='theme-color']");
          if (metaThemeColor && lastAppliedColor.current) {
            metaThemeColor.setAttribute('content', lastAppliedColor.current);
          }
        }, 120);
      }
    });
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

  // Filter valid items for the gallery view. Memoized so effects keyed on it
  // (document title) only re-run when the exhibit actually changes.
  const galleryItems = React.useMemo(
    () => selectedExhibit?.gallery?.galleryItems?.filter(i => i.image?.asset) || [],
    [selectedExhibit]
  );

  const nextSlide = () => {
    if (currentIndex < galleryItems.length - 1) {
      scrollToIndex(currentIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  };

  // Keyboard Navigation
  useEffect(() => {
    // Only active if we are in detail view
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

  // Dynamic Document Title
  useEffect(() => {
    const baseTitle = "Polaroid App Selections";
    if (selectedExhibit) {
      const currentItem = galleryItems[currentIndex];
      const itemTitle = currentItem?.title;
      if (itemTitle) {
        document.title = `${itemTitle} - ${selectedExhibit.title} | ${baseTitle}`;
      } else {
        document.title = `${selectedExhibit.title} | ${baseTitle}`;
      }
    } else {
      document.title = baseTitle;
    }
  }, [selectedExhibit, currentIndex, galleryItems]);

  // ---------------------------------------------------------------------------
  // DYNAMIC COLOR LOGIC
  // ---------------------------------------------------------------------------

  let appBgColor = '#0e0e1a'; // Default Home Background
  let appTextColor = '#f4f4f5'; // Default Home Text

  if (selectedExhibit) {
    // Discrete text color based on current slide (kept discrete for readability)
    const currentItem = galleryItems[currentIndex];
    const currentPalette = currentItem?.image?.asset?.metadata?.palette;
    const coverAsset = selectedExhibit?.coverImages?.[0]?.asset;
    const fallbackPalette = coverAsset?.metadata?.palette;
    const displayPalette = currentPalette || fallbackPalette;

    // Note: Background color is handled by handleScroll when in detail view
    const rawTextColor = displayPalette?.dominant?.foreground || '#ffffff';
    const currentBg = galleryColors[currentIndex] || galleryColors[0] || '#2c2435';
    // Some Sanity palettes pair low-contrast fg/bg; guard readability.
    appTextColor = ensureReadableText(rawTextColor, currentBg);
  }

  // Handle Home <-> Detail Transitions and Initial States
  useEffect(() => {
    if (!selectedExhibit) {
      // Cancel any pending scroll work so it can't overwrite the home colors.
      if (scrollRafId.current !== null) {
        cancelAnimationFrame(scrollRafId.current);
        scrollRafId.current = null;
      }
      if (themeColorTimer.current !== null) {
        clearTimeout(themeColorTimer.current);
        themeColorTimer.current = null;
      }
      lastAppliedColor.current = null;

      // Returning to Home: restore the value React's JSX also renders, so the
      // real DOM stays in sync with React's model of the inline style
      // (clearing it would leave React believing the color is still set).
      if (mainRef.current) {
        mainRef.current.style.transition = '';
        mainRef.current.style.backgroundColor = appBgColor;
      }
      document.body.style.transition = '';
      document.body.style.backgroundColor = appBgColor;

      const metaThemeColor = document.querySelector("meta[name='theme-color']");
      if (metaThemeColor) metaThemeColor.setAttribute('content', appBgColor);
    } else {
      // Entering Detail: Set initial color immediately
      const initialColor = galleryColors[currentIndex] || galleryColors[0];
      if (initialColor) {
        // Enable transition for the initial color switch
        isTransitioning.current = true;
        if (mainRef.current) {
          mainRef.current.style.transition = 'background-color 0.7s ease-out';
          mainRef.current.style.backgroundColor = initialColor;
        }
        document.body.style.transition = 'background-color 0.7s ease-out';
        document.body.style.backgroundColor = initialColor;
        const metaThemeColor = document.querySelector("meta[name='theme-color']");
        if (metaThemeColor) metaThemeColor.setAttribute('content', initialColor);

        // Disable transition lock after animation completes
        setTimeout(() => {
          isTransitioning.current = false;
        }, 750);
      }
    }
  }, [selectedExhibit, appBgColor]);
  // Dependency on appBgColor ensures home page updates if we ever change default home color logic

  const faviconHref = React.useMemo(() => {
    if (typeof document === 'undefined') return '';
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    return link?.href || '';
  }, []);

  // Keep the tab pill always visible in Home view.
  useEffect(() => {
    if (selectedExhibit) {
      // Reset so the pill isn't rendered pre-pinned for one frame when the
      // user returns home near the top of the page.
      if (tabsPinned) {
        setTabsPinned(false);
        setTabsPinnedStyle(null);
      }
      return;
    }

    const pinningEnabled = () => window.matchMedia('(min-width: 768px)').matches;

    const topOffsetPx = 8; // matches `top-2`

    const measure = () => {
      if (!tabsPillRef.current) return;
      const pillWidth = tabsPillRef.current.offsetWidth;
      const pillHeight = tabsPillRef.current.offsetHeight;
      setTabsPlaceholderHeight(pillHeight);
      setTabsPlaceholderWidth(pillWidth);

      if (!pinningEnabled()) {
        if (tabsPinned) setTabsPinned(false);
        setTabsPinnedStyle(null);
        return;
      }

      if (tabsPinned && tabsAnchorRef.current) {
        const anchorRect = tabsAnchorRef.current.getBoundingClientRect();
        // Keep the fixed pill aligned to the anchor's right edge.
        setTabsPinnedStyle({ right: window.innerWidth - anchorRect.right });
      }
    };

    const onScroll = () => {
      if (!pinningEnabled()) {
        if (tabsPinned) setTabsPinned(false);
        setTabsPinnedStyle(null);
        return;
      }
      if (!tabsAnchorRef.current) return;
      const anchorRect = tabsAnchorRef.current.getBoundingClientRect();
      const shouldPin = anchorRect.top <= topOffsetPx;

      if (shouldPin) {
        if (!tabsPinned) {
          setTabsPinned(true);
          setTabsPinnedStyle({ right: window.innerWidth - anchorRect.right });
        }
      } else if (tabsPinned) {
        setTabsPinned(false);
        setTabsPinnedStyle(null);
      }
    };

    measure();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
    };
  }, [selectedExhibit, tabsPinned]);

  return (
    <div
      ref={mainRef}
      className="min-h-svh flex flex-col font-sans transition-colors duration-700 ease-out"
      style={{
        // Only use React state for background color when in Home view.
        // In Detail view, we let the ref/scroll logic handle the background to avoid fighting.
        backgroundColor: !selectedExhibit ? appBgColor : undefined,
        color: appTextColor
      }}
    >

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col relative">
        {loading ? (
          <div
            role="status"
            aria-label="Loading galleries"
            className="flex flex-col items-center justify-center h-[60vh] text-zinc-500 gap-4"
          >
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        ) : (
          <>
            {selectedExhibit ? (
              // DETAIL VIEW: Horizontal Gallery
              <div
                ref={detailRef}
                tabIndex={-1}
                aria-label={`${selectedExhibit.title} gallery. Press Escape to close.`}
                className="flex-1 relative flex flex-col cursor-zoom-out outline-none"
                onClick={handleBack}
              >

                {/* Horizontal Scroll Container */}
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 w-full overflow-x-auto snap-x snap-mandatory flex scrollbar-hide items-center"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {galleryItems.map((item, idx) => (
                        <div
                          // Keyed by asset so slide load-state never carries
                          // over when jumping between exhibits via history.
                          key={item.image?.asset?.assetId ?? item.image?.asset?.url ?? idx}
                          className="min-w-full w-full h-full snap-center flex flex-col items-center justify-center p-4 md:p-8 relative"
                        >
                           <GallerySlide item={item} />
                        </div>
                    ))}
                </div>

                {/* Navigation Controls Row */}
                <div className="absolute inset-x-0 bottom-8 flex justify-center items-center gap-6 z-10 pointer-events-none">
                  {/* Left Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevSlide();
                    }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToIndex(idx);
                        }}
                        // 24px hit target around the 8px visual dot.
                        className="w-6 h-6 -m-2 flex items-center justify-center"
                        aria-label={`Go to slide ${idx + 1}`}
                        aria-current={idx === currentIndex}
                      >
                        <span
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            idx === currentIndex ? 'scale-125' : 'opacity-40 hover:opacity-60'
                          }`}
                          style={{ backgroundColor: 'currentColor' }}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Right Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextSlide();
                    }}
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
              <div className="container mx-auto px-4 pt-12 pb-8 md:pt-20 md:pb-12">
                  <div className="max-w-5xl mx-auto">
                  {/* Immersive Header */}
                  <div className="mb-4 md:mb-6 px-3">
                    {/* Title row (pill aligned with main title) */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                      <div className="min-w-0 flex items-center gap-3">
                        {faviconHref ? (
                          <img
                            src={faviconHref}
                            alt="Polaroid"
                            className="w-6 h-6 md:w-7 md:h-7"
                            draggable={false}
                          />
                        ) : null}
                        <h1 className="text-4xl font-bold tracking-tight text-white leading-tight">
                          Polaroid App Selections
                        </h1>
                      </div>

                      {/* Single Tab Pill: right-aligned; becomes fixed after scrolling so it stays visible */}
                      <div ref={tabsAnchorRef} className="max-w-full w-full shrink-0 flex justify-start sm:w-fit sm:justify-end">
                        {tabsPinned ? (
                          <div
                            aria-hidden
                            className="pointer-events-none"
                            style={{ height: tabsPlaceholderHeight, width: tabsPlaceholderWidth }}
                          />
                        ) : null}
                        <div
                          ref={tabsPillRef}
                          role="tablist"
                          aria-label="Gallery collections"
                          className={`inline-flex flex-row flex-nowrap items-center justify-center gap-2 rounded-full bg-white/5 backdrop-blur-lg p-1 max-w-full w-fit ${
                            tabsPinned ? 'fixed top-2 z-50' : ''
                          }`}
                          style={
                            tabsPinned && tabsPinnedStyle
                              ? { right: tabsPinnedStyle.right, left: 'auto' }
                              : undefined
                          }
                        >
                          <button
                            type="button"
                            role="tab"
                            aria-selected={homeTab === 'weekly'}
                            onClick={() => setHomeTab('weekly')}
                            className={`px-3 py-1.5 rounded-full text-sm sm:px-4 sm:py-2 sm:text-lg md:text-2xl font-semibold transition-colors ${
                              homeTab === 'weekly' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200 cursor-pointer'
                            } whitespace-nowrap text-center shrink-0`}
                          >
                            Weekly 8
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={homeTab === 'creative'}
                            onClick={() => setHomeTab('creative')}
                            className={`px-3 py-1.5 rounded-full text-sm sm:px-4 sm:py-2 sm:text-lg md:text-2xl font-semibold transition-colors ${
                              homeTab === 'creative' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200 cursor-pointer'
                            } whitespace-nowrap text-center shrink-0`}
                          >
                            Creative Call
                          </button>
                        </div>
                      </div>
                    </div>

                    {homeTab === 'weekly' ? (
                      <p className="text-zinc-400 text-base md:text-lg font-medium max-w-2xl mt-4 mx-0 sm:ml-auto sm:mr-0 text-left sm:text-right text-balance">
                        Explore fresh galleries curated by the Polaroid team.
                      </p>
                    ) : (
                      <p className="text-zinc-400 text-base md:text-lg font-medium max-w-2xl mt-4 mx-0 sm:ml-auto sm:mr-0 text-left sm:text-right text-balance">
                        Browse recent Creative Call submissions.
                      </p>
                    )}
                  </div>

                  <div className="mt-8 md:mt-10">
                    {homeTab === 'weekly' ? (
                      error ? (
                        <div className="flex flex-col items-start gap-4">
                          <p className="text-zinc-400 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-polaroid-red" />
                            {error}
                          </p>
                          <button
                            onClick={() => loadData()}
                            className="px-6 py-2 bg-zinc-800 text-white rounded-full text-sm font-medium"
                          >
                            Retry
                          </button>
                        </div>
                      ) : exhibits.length === 0 ? (
                        <p className="text-zinc-500 text-sm md:text-base">No galleries published yet — check back soon.</p>
                      ) : (
                        <div className="flex flex-col gap-6">
                          {exhibits.map((exhibit, i) => (
                            <ExhibitCard
                              key={exhibit.identifier}
                              exhibit={exhibit}
                              onClick={handleExhibitClick}
                              fallbackSubtitle="Weekly 8 Gallery"
                              priority={i === 0}
                            />
                          ))}
                        </div>
                      )
                    ) : creativeCallsError ? (
                      <div className="flex flex-col items-start gap-4">
                        <p className="text-zinc-400 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-polaroid-red" />
                          {creativeCallsError}
                        </p>
                        <button
                          onClick={() => loadData()}
                          className="px-6 py-2 bg-zinc-800 text-white rounded-full text-sm font-medium"
                        >
                          Retry
                        </button>
                      </div>
                    ) : creativeCalls.length === 0 ? (
                      <p className="text-zinc-500 text-sm md:text-base">No Creative Call submissions yet — check back soon.</p>
                    ) : (
                      <div className="flex flex-col gap-6">
                        {creativeCalls.map((call, i) => (
                          <ExhibitCard
                            key={call.identifier}
                            exhibit={call}
                            onClick={handleExhibitClick}
                            fallbackSubtitle="Creative Call"
                            priority={i === 0}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;