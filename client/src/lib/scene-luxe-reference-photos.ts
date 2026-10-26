export const SCENE_LUXE_MAX_PHOTOS = 9;

export type SceneLuxePhotoRef = {
  id: string;
  previewUrl: string;
  base64: string;
  role: string;
};

export type SceneLuxePhotoSlots = [
  SceneLuxePhotoRef | null,
  SceneLuxePhotoRef | null,
  SceneLuxePhotoRef | null,
  SceneLuxePhotoRef | null,
  SceneLuxePhotoRef | null,
  SceneLuxePhotoRef | null,
  SceneLuxePhotoRef | null,
  SceneLuxePhotoRef | null,
  SceneLuxePhotoRef | null,
];

export function createEmptySceneLuxeSlots(): SceneLuxePhotoSlots {
  return [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ];
}

let scenePhotoIdSeq = 0;

export function newSceneLuxePhotoId(): string {
  scenePhotoIdSeq += 1;
  return `scene-luxe-${Date.now()}-${scenePhotoIdSeq}`;
}

export function sceneLuxeFilledPhotos(
  slots: readonly (SceneLuxePhotoRef | null)[],
): SceneLuxePhotoRef[] {
  return slots.filter((s): s is SceneLuxePhotoRef => Boolean(s));
}

export function sceneLuxeFilledCount(
  slots: readonly (SceneLuxePhotoRef | null)[],
): number {
  return sceneLuxeFilledPhotos(slots).length;
}
