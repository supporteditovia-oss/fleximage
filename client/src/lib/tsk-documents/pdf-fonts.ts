import type { jsPDF } from "jspdf";
import { TSK_BRAND } from "@/lib/tsk-brand/constants";

const registeredDocs = new WeakSet<jsPDF>();

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer).toString("base64");
  }
  if (typeof FileReader !== "undefined") {
    const blob = new Blob([buffer]);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? "");
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function registerInterFonts(doc: jsPDF): Promise<void> {
  if (registeredDocs.has(doc)) {
    doc.setFont("Inter", "normal");
    return;
  }

  const [reg, semi] = await Promise.all([
    fetch(TSK_BRAND.fonts.pdfRegular).then((r) => {
      if (!r.ok) throw new Error("Inter Regular introuvable");
      return r.arrayBuffer();
    }),
    fetch(TSK_BRAND.fonts.pdfSemiBold).then((r) => {
      if (!r.ok) throw new Error("Inter SemiBold introuvable");
      return r.arrayBuffer();
    }),
  ]);

  const regB64 = await arrayBufferToBase64(reg);
  const semiB64 = await arrayBufferToBase64(semi);

  doc.addFileToVFS("Inter-Regular.ttf", regB64);
  doc.addFileToVFS("Inter-SemiBold.ttf", semiB64);
  doc.addFont("Inter-Regular.ttf", "Inter", "normal");
  doc.addFont("Inter-SemiBold.ttf", "Inter", "bold");

  registeredDocs.add(doc);
  doc.setFont("Inter", "normal");
}

export function setFontNormal(doc: jsPDF, size: number): void {
  try {
    doc.setFont("Inter", "normal");
  } catch {
    doc.setFont("helvetica", "normal");
  }
  doc.setFontSize(size);
}

export function setFontBold(doc: jsPDF, size: number): void {
  try {
    doc.setFont("Inter", "bold");
  } catch {
    doc.setFont("helvetica", "bold");
  }
  doc.setFontSize(size);
}
