
export interface SanityPaletteSwatch {
  background?: string;
  foreground?: string;
  population?: number;
  title?: string;
}

export interface SanityPalette {
  dominant?: SanityPaletteSwatch;
  darkMuted?: SanityPaletteSwatch;
  darkVibrant?: SanityPaletteSwatch;
  muted?: SanityPaletteSwatch;
  vibrant?: SanityPaletteSwatch;
  lightMuted?: SanityPaletteSwatch;
  lightVibrant?: SanityPaletteSwatch;
}

export interface SanityDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface SanityMetadata {
  blurHash?: string;
  palette?: SanityPalette;
  dimensions?: SanityDimensions;
}

export interface SanityAsset {
  path?: string;
  url: string;
  assetId?: string;
  metadata?: SanityMetadata;
}

export interface SanityImage {
  asset: SanityAsset;
}

export interface GalleryItem {
  title?: string;
  desc?: string;
  image?: SanityImage;
  submissionEntryIdentifier?: string;
}

export interface Gallery {
  title?: string;
  galleryItems?: GalleryItem[];
}

export interface ExhibitItem {
  identifier: string;
  title: string;
  subtitle?: string;
  coverImages?: SanityImage[];
  gallery?: Gallery;
}

export interface ExhibitGroup {
  items: ExhibitItem[];
}

export interface APIResponse<T> {
  result: T;
  ms: number;
  query: string;
}