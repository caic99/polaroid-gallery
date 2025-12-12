
export interface SanityMetadata {
  blurHash?: string;
  palette?: {
    dominant?: {
      background?: string;
      foreground?: string;
    };
    muted?: {
      background?: string;
    };
    vibrant?: {
      background?: string;
    };
  };
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
