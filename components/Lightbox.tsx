import React, { useEffect, useState } from 'react';
import { GalleryItem } from '../types';
import { getOptimizedImageUrl } from '../services/api';

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-zoom-out"
      onClick={onClose}
    >
      <div
        className="relative max-w-full max-h-full flex flex-col items-center justify-center"
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
