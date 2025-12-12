
import React from 'react';
import { ExhibitItem } from '../types';
import { getOptimizedImageUrl } from '../services/api';

interface ExhibitCardProps {
  exhibit: ExhibitItem;
  onClick: (exhibit: ExhibitItem) => void;
  index: number;
}

const ExhibitCard: React.FC<ExhibitCardProps> = ({ exhibit, onClick, index }) => {
  // Collect up to 8 images to display in the card preview
  const allImages = [];

  // Priority 1: Gallery Items (to match detail page order)
  if (exhibit.gallery?.galleryItems) {
    const galleryImages = exhibit.gallery.galleryItems
      .map(i => i.image)
      .filter((img): img is NonNullable<typeof img> => !!img);
    allImages.push(...galleryImages);
  }

  // Priority 2: Cover Images (fallback or additional)
  if (exhibit.coverImages) {
    allImages.push(...exhibit.coverImages);
  }

  // Deduplicate by assetId if available, otherwise just slice
  const seenAssets = new Set();
  const uniqueImages = allImages.filter(img => {
    if (img.asset?.assetId) {
      if (seenAssets.has(img.asset.assetId)) return false;
      seenAssets.add(img.asset.assetId);
    }
    return true;
  });

  const displayImages = uniqueImages.slice(0, 8);

  return (
    <div 
      onClick={() => onClick(exhibit)}
      className="bg-[#151520] rounded-2xl p-6 cursor-pointer active:scale-[0.99] transition-all duration-200 border border-white/5 shadow-xl hover:border-white/10 hover:shadow-2xl group"
    >
      {/* Header Text */}
      <div className="flex flex-col gap-1 mb-6">
        <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider group-hover:text-zinc-400 transition-colors">
          {exhibit.subtitle || "Weekly 8 Gallery"}
        </span>
        <h3 className="text-white text-2xl md:text-3xl font-bold leading-tight group-hover:text-polaroid-blue transition-colors">
          {exhibit.title}
        </h3>
      </div>

      {/* 8-Image Grid */}
      {/* 4 columns on mobile (2 rows), 8 columns on tablet/desktop (1 row) */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-px">
        {displayImages.map((img, i) => {
          const asset = img.asset;
          const url = asset ? getOptimizedImageUrl(asset.url, 400) : null;
          
          return (
            <div key={i} className="aspect-square relative bg-zinc-900 overflow-hidden flex items-center justify-center">
              {url ? (
                <img 
                  src={url} 
                  alt="" 
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-zinc-800" />
              )}
            </div>
          );
        })}
        {/* Fillers to maintain grid shape if needed, mostly relevant if we wanted exact empty slots, but letting it flow is fine. */}
      </div>
    </div>
  );
};

export default ExhibitCard;
