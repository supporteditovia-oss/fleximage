export type LandingMarqueeImage = {
  id: string;
  alt: string;
  avif_url: string;
  webp_url: string | null;
  placeholder_url: string;
};

const LANDING_MARQUEE_PUBLIC_BASE_URL =
  "https://media.larpking.com/landing/marquee";

const LANDING_MARQUEE_IMAGE_IDS = [
  "290dc4a9-1e84-409e-87ce-a22bd4740fb2",
  "4496d23d-b87f-45e2-9cf8-6c9af6a6f62b",
  "5334ccf1-6475-4aa9-aa78-569accd88613",
  "5613ecdb-f44c-4a39-8ee6-5e40f5e73358",
  "628fa562-e2f4-4fe1-af41-9c437ba36fd8",
  "682d6799-0ceb-4660-b632-2f5d2df4ff3b",
  "695fa730-acdb-42ba-9575-d0957c6bfe03",
  "6a462d38-4508-4156-86cb-5a3426febe11",
  "71658fd8-b5e1-477f-a1b8-e86f6ae1cd41",
  "8ea369b8-1dba-438e-b0e5-4d9c97e5ccc6",
  "99e8d81e-4195-4490-a85a-e47eebd20184",
  "9a369d85-b6bf-46e0-837f-a2114bf5b5ec",
  "a08e0089-297c-4428-8111-414e8152c0e5",
  "b48c3c1f-c83e-454a-bd97-e3ae3cacb91b",
  "bb04deea-c7b1-46f0-a816-d3e8be84fec8",
  "d715481e-a903-4c5d-8a9b-5f6ba27ed6ab",
  "d9391a44-5583-4431-8ade-7e8a4d29cf92",
  "e02335a4-0b37-4699-983e-c8cdf7da1f7a",
  "f234da62-79af-4695-94c2-26875d9067bb",
  "f6fd72ac-18c5-40e8-8777-66e79914cde8",
] as const;

const AVIF_ONLY_IMAGE_IDS = new Set<string>([
  "a08e0089-297c-4428-8111-414e8152c0e5",
  "b48c3c1f-c83e-454a-bd97-e3ae3cacb91b",
]);

const LANDING_MARQUEE_PLACEHOLDERS: Record<string, string> = {
  "290dc4a9-1e84-409e-87ce-a22bd4740fb2":
    "data:image/webp;base64,UklGRnwAAABXRUJQVlA4IHAAAACwBACdASoSACAAP0WMvVewKKYjsBgIAgAoiWMAACSd8zuTpSlK9fT4+gPvZDbgAM3xFf2u0axkHiQ9EppAkT0XnPPXldUM6HkXMkHwAkH2f+tY+vTkrQT23Wpk+LiU4Ww3vZOQqVG3iHVHjbEAAAAA",
  "4496d23d-b87f-45e2-9cf8-6c9af6a6f62b":
    "data:image/webp;base64,UklGRnoAAABXRUJQVlA4IG4AAAAQBQCdASoSACAAP0WKulUwKSWjMBgMAgAoiUAYG4aGNK5FHUV4qfC7w7PFY2lFNmkAAP6Loc60FS3AI3yHjH56EA+M5OdrMB8xYIs68veOM+SbV6LmvHE1y7NidshLn0euNBy9SB3Sxl8UTChwAA==",
  "5334ccf1-6475-4aa9-aa78-569accd88613":
    "data:image/webp;base64,UklGRn4AAABXRUJQVlA4IHIAAADQBACdASoSACAAP0WUwlgwKicjqAqqACiJQBjMFTiV9YeTTANPI0Tu5xXRNTUGAAD+uVrAQDmHrzoDDB1DiD9+tiAMpSOnGsM4tEMkBqxut5GAwNJQkmUGzI57w07oDrN/RPfI/q1vXBTU+BfwUhyc1AA=",
  "5613ecdb-f44c-4a39-8ee6-5e40f5e73358":
    "data:image/webp;base64,UklGRqgAAABXRUJQVlA4IJwAAADQBACdASoSACAAP0WSxFewKigjqAqqACiJYwC2yC1a3TQIpSQYhPP1GHjMPEAwAAD+UuAde0hVAVEU/NzzTGlWC+iN2MaJKGgRAWBtk1NluERYUutY3zT2sIPQ5rM41xPPJg0Hq3Ni9UzajNJgJnovPEwN6ILq6ta101fL1ARIouu79mFOzMAd3LjKRfZb/M23sTHd8RSbevNcAAA=",
  "628fa562-e2f4-4fe1-af41-9c437ba36fd8":
    "data:image/webp;base64,UklGRpYAAABXRUJQVlA4IIoAAAAQBQCdASoSACAAP0WUwViwKicjqAqqACiJaAC7BAgCAMNeeLJ+AmGx0KfkZYWklK0AAP7w0njcfzrmqvChKWo5uHO0FRSjJ07CsX952/t/piTXOsYSfsNTgbuiq4yV83DlaTQTXCK2yaUYykDLa9jtc8ycDwszpsCUli6WJ5SV9YYGKhGWcIxQAAA=",
  "682d6799-0ceb-4660-b632-2f5d2df4ff3b":
    "data:image/webp;base64,UklGRpoAAABXRUJQVlA4II4AAABwBQCdASoSACAAP0WSvVawKiYjsBgIAgAoiWwAnTKDOiZ/wBg2q3ilGVHmCwyWDQqiQ6twAP2KNygXAS3qZFgUQXBtom5KAkge6iSgdfLuxigjFzRdekITJOlCS3uG4B/aJQYBHbHRve26o2ohUXcMJ0dlqT9f/bTGxnxrZiM9cJ7wRTA1znKSVmFNAAAA",
  "695fa730-acdb-42ba-9575-d0957c6bfe03":
    "data:image/webp;base64,UklGRoIAAABXRUJQVlA4IHYAAACwBACdASoSACAAP0WWwFiwKqajqAqqACiJZQC06A3oRIdR5taP/BM5t2dUY1bAAM4iNze2Z+0Xrhsxx7T2FSf7+i3Q1PGzcAcJH2vENQxrcQKwfypac8bWO4cPfdZ847sM9vEzreBlULVEGJCs0u4VybauiAAA",
  "6a462d38-4508-4156-86cb-5a3426febe11":
    "data:image/webp;base64,UklGRooAAABXRUJQVlA4IH4AAADwBACdASoSACAAP0WSw1gwKiejqAqqACiJQBerBp35ByYFLHfpek6pTtUDVOQbRwAA/tlM6IrkgNyhivjwgEt+DZyGPEl4eaH7teC/cpzATmmzwjY0USYOOHltjj1qNaKvdt23ax7PjJMixCguJj+RHtLVmAN5CFz8pYf74AA=",
  "71658fd8-b5e1-477f-a1b8-e86f6ae1cd41":
    "data:image/webp;base64,UklGRmwAAABXRUJQVlA4IGAAAADwBACdASoSACAAP0WIv1gwKCajsBgIAgAoiWUAyrQLx1rJrXOzk67Yef6dRXRP2AAA93Rvnb74tucxuF0+9+MIzSta5dYcsY9nRvnXss1fAX/mPf0wQQhjBbkoVqwAAAA=",
  "8ea369b8-1dba-438e-b0e5-4d9c97e5ccc6":
    "data:image/webp;base64,UklGRnwAAABXRUJQVlA4IHAAAAAQBQCdASoSACAAP0WIu1SwKKYjMBgMAgAoiWUAzFgvVAWigShag1EamxKbDpu3grgAAO19P3cWE1g3RMU5vOwm9uIXnRfYCXr0LwutFhnmmb/MXX9D3WpTcx6PaRswoVYk8By2Yluiumpm6NMyHVgA",
  "99e8d81e-4195-4490-a85a-e47eebd20184":
    "data:image/webp;base64,UklGRo4AAABXRUJQVlA4IIIAAAAQBQCdASoSACAAP0WMvFSwKaYjMAgCACiJZACxDQSCmn9/60JBBpWIdSvhD94gsvqwAP6DFu/vQTaR7nIszbREqPBHE9pIdfSHKlta9xGjxk1KCu1sC7hPlMjDMsmmTEhCw3U75HZBPt+Q2zlWs8mTNcPUXoZpW/cbYb+pPLoIyAAA",
  "9a369d85-b6bf-46e0-837f-a2114bf5b5ec":
    "data:image/webp;base64,UklGRoQAAABXRUJQVlA4IHgAAACwBACdASoSACAAP0WSw1ewKigjqAqqACiJYwDNwDTv2fTFhLnaDwJH/vWIw2PAAP7qZppe4zfsf34xRjdmMOTXar1PJqgORTH+nHCupoUc/ys1T8vHYpYoXTBC6QhNk5zJE9Ig96mRU4RxnHuZEFUFMy7S4TAAAAA=",
  "a08e0089-297c-4428-8111-414e8152c0e5":
    "data:image/webp;base64,UklGRqIAAABXRUJQVlA4IJYAAAAQBQCdASoSACAAP0WUwliwKicjqAqqACiJYwDA4AgBx0eUPcJekdHpOuDiYXG5rM6wAP4HYtl5GlXVFd+WNorDLuXXSAUjylfTTSjtw98RC9mGL6IhaC9ulZp+xIC4FA/wsO+l6EMywj7QvvYn3yyeqA8jUsdTs1t0Oqnhl2K1c/8vR7VVO7qNleLUi3I0IV+HmlhYuAA=",
  "b48c3c1f-c83e-454a-bd97-e3ae3cacb91b":
    "data:image/webp;base64,UklGRoYAAABXRUJQVlA4IHoAAABwBQCdASoSACAAP0WMu1SwKaYjMAgCACiJYwCw7B6x3MODHmv1Bpx+Mm2NX7vajtsfkVIAAP7Aj33kmM+XiCLVq/gC1tZa7sjXnPSHXwxizujPL9tm7+J3Ns+Yc9N9kOjFzaM1pXAqaEO5Us0W66KEamVROuLMvoQAAA==",
  "bb04deea-c7b1-46f0-a816-d3e8be84fec8":
    "data:image/webp;base64,UklGRm4AAABXRUJQVlA4IGIAAABwBACdASoSACAAP0WMuVSwKaWjMBgMAgAoiWQAzjhX7+A4Bl2p0wogfAJ/AAD+9WSV3ExMsDC629nYSnzv0GIXkpGMo5AH6zuQsxvJDyTZ4646duCAN0EMpACo/mUP/uAAAA==",
  "d715481e-a903-4c5d-8a9b-5f6ba27ed6ab":
    "data:image/webp;base64,UklGRn4AAABXRUJQVlA4IHIAAAAQBQCdASoSACAAP0WWv1kwKqajqAqqACiJYwDO7DTd2H+6crVx0zzOgOrbyuPGWpQUAP7nG86bv/ePG2HNuMW6VMyKleUNwYTGJGnpkOREGVeBhugkTNiIE9tGcZBOdCkfEpm+pVtD/tmOWmZI+vgAAAA=",
  "d9391a44-5583-4431-8ade-7e8a4d29cf92":
    "data:image/webp;base64,UklGRpgAAABXRUJQVlA4IIwAAADwBACdASoSACAAP0WSvlawKiYjsBgIAgAoiWMAzNAQ3y9+NhUVH2V2T7EWUgH1Q4AA/lX2o/ZyhTvDTRZSh2Ap9n43JpxHqN4KLoyf9GOJKGqx4Gwt2v0EIMm9E86pua5yfvu//QbuCJqYckJS7rPO9fxAwdHucw8YHOdlY5A3zSM25vNcMVW7cDQAAA==",
  "e02335a4-0b37-4699-983e-c8cdf7da1f7a":
    "data:image/webp;base64,UklGRnIAAABXRUJQVlA4IGYAAABQBACdASoSACAAP0WKu1SwKSYjMAgCACiJQBl0g1TbxbYD3SzovTirdiOAAP6MbB9SOnCAOYgcBhLvR6G+Py96Jfy71u5wZGHw2pun25QwAEMwaXQ641gCLIKMFNAM/cmi+dWQgAA=",
  "f234da62-79af-4695-94c2-26875d9067bb":
    "data:image/webp;base64,UklGRoIAAABXRUJQVlA4IHYAAADwBACdASoSACAAP0WMvFSwKaYjMAgCACiJZQDE2CHpHCBhFuRBVyZjh5hbkJrEHQAA/tDWBpUs9huguiK/URzhtbxFF06o0NeU4EB0YmKs09raIcEu8cftdCucXq040H+18h9RTS0uTEJXXOv2Xobv3ekggAAA",
  "f6fd72ac-18c5-40e8-8777-66e79914cde8":
    "data:image/webp;base64,UklGRmQAAABXRUJQVlA4IFgAAABwBACdASoSACAAP0WEu1WwJ6YksBgMAgAoiUAW2QaMwh/st1IzAbCt4yaDAAD+UM/MpyqGMpVpLFsbDCJJkBrBnVlnaFIcKixfnFKFwBe554WmqSJb8AAA",
};

export const LANDING_MARQUEE_IMAGES: LandingMarqueeImage[] =
  LANDING_MARQUEE_IMAGE_IDS.map((id, index) => ({
    id,
    alt: `LarpKing example ${index + 1}`,
    avif_url: `${LANDING_MARQUEE_PUBLIC_BASE_URL}/avif/${id}.avif`,
    webp_url: AVIF_ONLY_IMAGE_IDS.has(id)
      ? null
      : `${LANDING_MARQUEE_PUBLIC_BASE_URL}/webp/${id}.webp`,
    placeholder_url: LANDING_MARQUEE_PLACEHOLDERS[id],
  }));

export function preloadLandingMarqueeImages(count = 20) {
  if (typeof document === "undefined") return;

  for (const image of LANDING_MARQUEE_IMAGES.slice(0, count)) {
    const selector = `link[rel="preload"][href="${image.avif_url}"]`;
    if (document.head.querySelector(selector)) continue;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = image.avif_url;
    link.type = "image/avif";
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);
  }
}

export async function fetchLandingMarqueeImages(): Promise<
  LandingMarqueeImage[]
> {
  const res = await fetch("/api/landing/marquee");
  if (!res.ok) throw new Error("Failed to fetch landing marquee images");
  const remoteImages = (await res.json()) as LandingMarqueeImage[];
  const imagesById = new Map(
    LANDING_MARQUEE_IMAGES.map((image) => [image.id, image]),
  );

  for (const image of remoteImages) {
    imagesById.set(image.id, {
      ...image,
      placeholder_url:
        imagesById.get(image.id)?.placeholder_url ??
        LANDING_MARQUEE_PLACEHOLDERS[image.id],
    });
  }

  return Array.from(imagesById.values());
}
