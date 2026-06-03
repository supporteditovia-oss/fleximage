import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import type { CapturedPose } from "@/lib/face-capture";

const FACE_CAPTURE_POSES = ["frontal", "profile-right", "profile-left"] as const;
const FACE_CAPTURE_QUERY_KEY = ["face-captures", "latest"] as const;

type FaceCapturePoseId = (typeof FACE_CAPTURE_POSES)[number];

type StoredFaceCapture = {
  poseId: FaceCapturePoseId;
  byteSize: number;
};

type StoreFaceCapturesResponse = {
  sessionId: string;
  captures: StoredFaceCapture[];
};

export type LatestFaceCaptureAsset = {
  poseId: FaceCapturePoseId;
  byteSize: number;
  imageUrl: string;
};

export type LatestFaceCaptureResponse = {
  session: {
    id: string;
    createdAt: string;
    captures: LatestFaceCaptureAsset[];
  } | null;
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unable to read capture image"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read capture image"));
    reader.readAsDataURL(blob);
  });
}

function isRequiredPose(poseId: string): poseId is FaceCapturePoseId {
  return FACE_CAPTURE_POSES.includes(poseId as FaceCapturePoseId);
}

export function useStoreFaceCaptures() {
  const queryClient = useQueryClient();

  return useMutation<StoreFaceCapturesResponse, Error, CapturedPose[]>({
    mutationFn: async (poses) => {
      const byPoseId = new Map(poses.map((pose) => [pose.poseId, pose]));
      const orderedPoses = FACE_CAPTURE_POSES.map((poseId) => byPoseId.get(poseId));

      if (orderedPoses.some((pose) => !pose || !isRequiredPose(pose.poseId))) {
        throw new Error("The three required face captures are missing.");
      }

      const captures = await Promise.all(
        orderedPoses.map(async (pose) => ({
          poseId: pose!.poseId as FaceCapturePoseId,
          imageBase64: await blobToBase64(pose!.blob),
          timestamp: pose!.timestamp,
          landmarks: pose!.landmarks ?? [],
          landmarkFrameWidth: pose!.landmarkFrameWidth ?? null,
          landmarkFrameHeight: pose!.landmarkFrameHeight ?? null,
        })),
      );

      const response = await authFetch("/api/face-captures", {
        method: "POST",
        body: JSON.stringify({ captures }),
      });

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FACE_CAPTURE_QUERY_KEY });
    },
  });
}

export function useLatestFaceCapture() {
  return useQuery<LatestFaceCaptureResponse>({
    queryKey: FACE_CAPTURE_QUERY_KEY,
    queryFn: async () => {
      const response = await authFetch("/api/face-captures/latest");
      return response.json();
    },
  });
}

type DeleteFaceCapturesResponse = {
  deleted: boolean;
  deletedCount?: number;
};

export function useDeleteLatestFaceCapture() {
  const queryClient = useQueryClient();

  return useMutation<DeleteFaceCapturesResponse, Error>({
    mutationFn: async () => {
      const response = await authFetch("/api/face-captures/latest", {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData<LatestFaceCaptureResponse>(FACE_CAPTURE_QUERY_KEY, {
        session: null,
      });
      queryClient.invalidateQueries({ queryKey: FACE_CAPTURE_QUERY_KEY });
    },
  });
}

export async function fetchFaceCaptureAssetBlob(assetUrl: string): Promise<Blob> {
  const response = await authFetch(assetUrl);
  return response.blob();
}
