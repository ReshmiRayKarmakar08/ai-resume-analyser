export interface PdfConversionResult {
  imageUrl: string;
  file: File | null;
  error?: string;
}

let pdfjsLib: any = null;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if (loadPromise) return loadPromise;


// @ts-expect-error
loadPromise = import("pdfjs-dist/build/pdf").then((lib) => {

  // ✅ FINAL FIX: local worker
  lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

  pdfjsLib = lib;
  return lib;
});
  return loadPromise;
}

export async function convertPdfToImage(
  file: File
): Promise<PdfConversionResult> {
  try {
    const lib = await loadPdfJs();

    const arrayBuffer = await file.arrayBuffer();

    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;

    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return {
        imageUrl: "",
        file: null,
        error: "Canvas not supported",
      };
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const name = file.name.replace(/\.pdf$/i, "");

          const imageFile = new File([blob], `${name}.png`, {
            type: "image/png",
          });

          resolve({
            imageUrl: URL.createObjectURL(blob),
            file: imageFile,
          });
        } else {
          resolve({
            imageUrl: "",
            file: null,
            error: "Blob creation failed",
          });
        }
      });
    });

  } catch (err) {
    console.log("PDF ERROR:", err);

    return {
      imageUrl: "",
      file: null,
      error: `Failed to convert PDF: ${err}`,
    };
  }
}