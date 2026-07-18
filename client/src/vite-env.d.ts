/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SNAP_PIXEL_ID?: string;
  readonly VITE_PUBLIC_APP_URL?: string;
  readonly VITE_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImageCapture {
  takePhoto(): Promise<Blob>;
  getPhotoCapabilities(): Promise<PhotoCapabilities>;
}

interface PhotoCapabilities {
  fillLightMode: string[];
}

declare var ImageCapture: {
  prototype: ImageCapture;
  new (track: MediaStreamTrack): ImageCapture;
};

interface Window {
  snaptr?: (...args: unknown[]) => void;
  __snapPixelReady?: boolean;
  $crisp?: unknown[];
  CRISP_WEBSITE_ID?: string;
}
