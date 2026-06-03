/// <reference types="vite/client" />

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
