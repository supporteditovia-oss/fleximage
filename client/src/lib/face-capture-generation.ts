import { authFetch } from "@/lib/api";
import {
  fetchFaceCaptureAssetBlob,
  type LatestFaceCaptureResponse,
} from "@/hooks/use-face-captures";

export const FACE_CAPTURE_POSES = [
  "frontal",
  "profile-right",
  "profile-left",
] as const;

export type FaceCapturePoseId = (typeof FACE_CAPTURE_POSES)[number];

export const FACE_CAPTURE_COMPOSITE_POSES = ["frontal", "profile-right"] as const;

export function hasCompleteFaceCapture(
  data: LatestFaceCaptureResponse | undefined,
): boolean {
  const captures = data?.session?.captures ?? [];
  return FACE_CAPTURE_POSES.every((poseId) =>
    captures.some((capture) => capture.poseId === poseId),
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to load face capture image"));
    };
    image.src = objectUrl;
  });
}

export async function composeFaceCaptureBlobs(blobs: Blob[]): Promise<Blob> {
  if (blobs.length < FACE_CAPTURE_COMPOSITE_POSES.length) {
    throw new Error("FACE_CAPTURE_REQUIRED");
  }

  const compositeBlobs = blobs.slice(0, FACE_CAPTURE_COMPOSITE_POSES.length);
  const images = await Promise.all(compositeBlobs.map((blob) => loadImageFromBlob(blob)));
  const targetHeight = 1024;
  const panelWidth = Math.round((targetHeight * 9) / 16);
  const canvas = document.createElement("canvas");
  canvas.width = panelWidth * images.length;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to compose face captures");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  let left = 0;
  images.forEach((image) => {
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = panelWidth / targetHeight;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    let sourceX = 0;
    let sourceY = 0;

    if (sourceRatio > targetRatio) {
      sourceWidth = image.naturalHeight * targetRatio;
      sourceX = (image.naturalWidth - sourceWidth) / 2;
    } else {
      sourceHeight = image.naturalWidth / targetRatio;
      sourceY = (image.naturalHeight - sourceHeight) / 2;
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      left,
      0,
      panelWidth,
      targetHeight,
    );
    left += panelWidth;
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to export face capture composite"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92,
    );
  });
}

export async function fetchLatestFaceCapture(): Promise<LatestFaceCaptureResponse> {
  const response = await authFetch("/api/face-captures/latest");
  if (!response.ok) {
    throw new Error("Failed to load face captures");
  }
  return response.json();
}

export async function loadFaceCaptureBase64Images(): Promise<string[]> {
  const data = await fetchLatestFaceCapture();
  if (!hasCompleteFaceCapture(data)) {
    throw new Error("FACE_CAPTURE_REQUIRED");
  }

  const captures = data.session!.captures;
  const ordered = FACE_CAPTURE_COMPOSITE_POSES.map((poseId) => {
    const capture = captures.find((item) => item.poseId === poseId);
    if (!capture) throw new Error("FACE_CAPTURE_REQUIRED");
    return capture;
  });

  const blobs = await Promise.all(
    ordered.map((capture) => fetchFaceCaptureAssetBlob(capture.imageUrl)),
  );
  const composite = await composeFaceCaptureBlobs(blobs);
  return [await blobToBase64(composite)];
}

export async function loadFaceCapturePreviewUrl(): Promise<string | null> {
  try {
    const data = await fetchLatestFaceCapture();
    if (!hasCompleteFaceCapture(data)) return null;
    const captures = data.session!.captures;
    const ordered = FACE_CAPTURE_COMPOSITE_POSES.map((poseId) => {
      const capture = captures.find((item) => item.poseId === poseId);
      if (!capture) throw new Error("FACE_CAPTURE_REQUIRED");
      return capture;
    });
    const blobs = await Promise.all(
      ordered.map((capture) => fetchFaceCaptureAssetBlob(capture.imageUrl)),
    );
    const composite = await composeFaceCaptureBlobs(blobs);
    return URL.createObjectURL(composite);
  } catch {
    return null;
  }
}
