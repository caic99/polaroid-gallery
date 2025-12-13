import React, { useState } from 'react';
import { ExhibitItem } from '../types';
import { getOptimizedImageUrl } from '../services/api';

interface ExhibitCardProps {
  exhibit: ExhibitItem;
  onClick: (exhibit: ExhibitItem, initialIndex?: number) => void;
  index: number;
}

const CardImage = ({ src }: { src: string }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative aspect-[41/50] w-full overflow-hidden bg-white">
      <img
        src={src}
        alt=""
        className={`w-full h-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

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

  const displayImages = uniqueImages;

  // Extract Palette Colors specifically from the Cover Image (Gallery Identity)
  const coverAsset = exhibit.coverImages?.[0]?.asset;

  // Fallback to first display asset if cover is missing, but prioritize cover.
  const paletteSource = coverAsset || displayImages[0]?.asset;
  const palette = paletteSource?.metadata?.palette;

  // Use 'dominant' color as requested
  const bgColor = palette?.dominant?.background || '#151520';
  const txtColor = palette?.dominant?.foreground || '#ffffff';

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick(exhibit, 0);
  };

  return (
    <div
      onClick={handleCardClick}
      className="rounded-2xl p-6 cursor-pointer border border-white/5 shadow-xl group"
      style={{
        backgroundColor: bgColor,
        color: txtColor
      }}
    >
      {/* Header Text */}
      <div className="flex flex-col gap-1 mb-6">
        <span
          className="text-xs font-medium uppercase tracking-wider opacity-70 transition-colors"
          style={{ color: 'inherit' }}
        >
          {exhibit.subtitle || "Weekly 8 Gallery"}
        </span>
        <h3
          className="text-2xl md:text-3xl font-bold leading-tight transition-colors"
          style={{ color: 'inherit' }}
        >
          {exhibit.title}
        </h3>
      </div>

      {/* Scrollable Row of Photos */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6"
        onClick={(e) => e.stopPropagation()} // Allow scrolling without triggering card click? No, we want card click on background.
        // Actually, if we click and drag, we don't want to trigger card click.
        // But if we click an image, we want to trigger image click.
        // The image click handler has e.stopPropagation().
        // The container scroll shouldn't trigger card click.
      >
        {displayImages.map((img, i) => {
          const asset = img.asset;
          const url = asset ? getOptimizedImageUrl(asset.url, 400) : null;

          // Find the index of this image in the main gallery items list for deep linking
          const galleryIndex = exhibit.gallery?.galleryItems?.findIndex(
            (gi) => gi.image?.asset?.assetId === asset?.assetId
          );

          // If found in gallery, use that index. Otherwise default to 0.
          const targetIndex = (galleryIndex !== undefined && galleryIndex > -1) ? galleryIndex : 0;

          if (!url) {
            return <div key={i} className="flex-shrink-0 w-24 md:w-32 aspect-[41/50] bg-white/5" />;
          }

          return (
            <div
              key={i}
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                onClick(exhibit, targetIndex);
              }}
              className="flex-shrink-0 w-24 md:w-32 hover:opacity-80 transition-opacity"
            >
              <CardImage src={url} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExhibitCard;