
export interface SanityPaletteSwatch {
  background?: string;
  foreground?: string;
}

export interface SanityPalette {
  dominant?: SanityPaletteSwatch;
}

export interface SanityDimensions {
  width: number;
  height: number;
}

export interface SanityMetadata {
  palette?: SanityPalette;
  dimensions?: SanityDimensions;
}

export interface SanityAsset {
  url: string;
  assetId?: string;
  metadata?: SanityMetadata;
}

export interface SanityImage {
  asset: SanityAsset;
}

export interface PortableTextSpan {
  _type: 'span';
  text: string;
}

export interface PortableTextBlock {
  _type: 'block';
  children: PortableTextSpan[];
}

export interface GalleryItem {
  title?: string;
  desc?: string | PortableTextBlock[];
  image?: SanityImage;
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
  ms?: number;
  query?: string;
}

export interface SubmissionItem {
  identifier: string;
  title: string;
  subtitle?: string;
  heroImage?: SanityImage;
  gallery?: Gallery;
}