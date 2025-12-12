import React, { useEffect } from 'react';
import { GalleryItem } from '../types';
import { getOptimizedImageUrl } from '../services/api';
import { XIcon } from './Icons';
import { motion } from 'framer-motion';

interface LightboxProps {
  item: GalleryItem;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ item, onClose }) => {
  const asset = item.image?.asset;
  
  // Use the same resolution as the GallerySlide (1200) for the transition source 
  // to ensure a perfect, glitch-free expansion. 
  // Loading a 2000px image here would cause a flash or blank frame during the transition.
  const imageUrl = asset ? getOptimizedImageUrl(asset.url, 1200) : '';

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden'; // Prevent scrolling
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!asset) return null;

  return (
    <motion.div 
      initial={{ backgroundColor: "rgba(0,0,0,0)" }}
      animate={{ backgroundColor: "rgba(0,0,0,0.95)" }}
      exit={{ backgroundColor: "rgba(0,0,0,0)" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
      >
        <XIcon className="w-8 h-8" />
      </button>

      <div 
        className="relative max-w-full max-h-full flex flex-col items-center justify-center pointer-events-none"
      >
        <motion.img 
          layoutId={asset.assetId}
          src={imageUrl} 
          alt={item.title || 'Gallery image'}
          className="max-h-[85vh] max-w-full object-contain shadow-2xl pointer-events-auto"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-center pointer-events-auto"
        >
          {item.title && (
            <h2 className="text-xl font-bold text-white tracking-wide">{item.title}</h2>
          )}
          {item.desc && (
            <p className="mt-2 text-sm text-zinc-400 max-w-2xl mx-auto">{item.desc}</p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Lightbox;