import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GalleryItem } from '../types';
import { getOptimizedImageUrl } from '../services/api';

interface GallerySlideProps {
  item: GalleryItem;
  priority?: boolean;
}

const GallerySlide: React.FC<GallerySlideProps> = ({ item, priority = false }) => {
  const [loaded, setLoaded] = useState(false);
  const asset = item.image?.asset;
  
  if (!asset) return null;
  const highResUrl = getOptimizedImageUrl(asset.url, 1200);
  const thumbnailSrc = getOptimizedImageUrl(asset.url, 400); // Matches card thumbnail
  
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
  
  const aspectRatio = finalHeight > 0 ? finalWidth / finalHeight : 0.8;

  // Calculate strict pixel dimensions for the wrapper to ensure Framer Motion
  // can interpolate smoothly from the Card size to this Slide size.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  
  // Constraints: 90vw width, 60vh height (reduced to allow space for text)
  const maxH = vh * 0.60;
  const maxW = vw * 0.9;

  // Fit within the box maintaining aspect ratio
  let renderWidth = maxH * aspectRatio;
  let renderHeight = maxH;

  if (renderWidth > maxW) {
    renderWidth = maxW;
    renderHeight = maxW / aspectRatio;
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {/* 
        Image Wrapper Object
        Uses motion.div for smooth entry animation.
        The wrapper size is explicitly calculated to avoid layout thrashing.
      */}
      <div className="relative flex-shrink-0 flex items-center justify-center p-4">
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative shadow-2xl overflow-hidden bg-black/10"
            style={{
              width: renderWidth,
              height: renderHeight,
            }}
        >
          {/* Thumbnail Image - Visible immediately, acts as the placeholder */}
          <img 
            src={thumbnailSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-contain blur-sm scale-105"
            style={{ opacity: loaded ? 0 : 1, transition: 'opacity 0.5s ease-out' }}
          />

          {/* High Res Image - Fades in strictly ONLY after loading */}
          <img 
              src={highResUrl}
              alt={item.title || "Gallery Item"}
              className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
              loading={priority ? "eager" : "lazy"}
              draggable="false"
              onLoad={() => setLoaded(true)}
          />
        </motion.div>
      </div>

      {/* Meta Info Row */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col items-center justify-center mt-10 px-6 text-center max-w-3xl mx-auto pb-20 z-10 cursor-default" 
        style={{ color: 'inherit' }}
      >
          {item.title && (
            <h2 className="font-bold text-xl md:text-2xl mb-3 tracking-tight drop-shadow-sm">
                {item.title}
            </h2>
          )}
          {item.desc && (
            <p className="text-sm md:text-base font-medium opacity-90 leading-relaxed drop-shadow-sm max-w-prose">
              {item.desc}
            </p>
          )}
      </motion.div>
    </div>
  );
};

export default GallerySlide;