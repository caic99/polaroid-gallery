import React, { useEffect, useState } from 'react';
import { GalleryItem } from '../types';
import { getOptimizedImageUrl } from '../services/api';
import { XIcon } from './Icons';

interface LightboxProps {
  item: GalleryItem;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ item, onClose }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const asset = item.image?.asset;
  
  // Use a high-quality version for the lightbox
  const imageUrl = asset ? getOptimizedImageUrl(asset.url, 2000) : '';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
      >
        <XIcon className="w-8 h-8" />
      </button>

      <div 
        className="relative max-w-full max-h-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageUrl} 
          alt={item.title || 'Gallery image'}
          className={`max-h-[85vh] max-w-full object-contain shadow-2xl transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
        />
        
        <div className={`mt-4 text-center transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
          {item.title && (
            <h2 className="text-xl font-bold text-white tracking-wide">{item.title}</h2>
          )}
          {item.desc && (
            <p className="mt-2 text-sm text-zinc-400 max-w-2xl mx-auto">{item.desc}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lightbox;
