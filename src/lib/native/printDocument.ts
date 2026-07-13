/**
 * printOrShareElement — cross-platform "print" for a rendered DOM region.
 *
 * Web: opens the browser print dialog (the user can Save as PDF there).
 * Native (Capacitor): the WebView has no print dialog, so we rasterize the
 * node to a multi-page PDF and open the system share sheet (Save to Files,
 * AirPrint, Mail, Messages).
 *
 * The app theme uses HSL color tokens (not oklch), so html2canvas renders
 * the receipt faithfully.
 */
import { Capacitor } from "@capacitor/core";

// Rasterized node → multi-page letter PDF blob. Canonical html2canvas → jsPDF
// pagination: draw the full image, then shift it up one page height per added
// page (jsPDF clips to the page bounds).
async function canvasToPdfBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;
  const imgData = canvas.toDataURL("image/png");

  let heightLeft = imgH;
  let position = 0;
  pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
  heightLeft -= pageH;
  while (heightLeft > 0) {
    position = heightLeft - imgH;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
    heightLeft -= pageH;
  }
  return pdf.output("blob");
}

/** Print/share a region already rendered in the live DOM. */
export async function printOrShareElement(
  node: HTMLElement | null,
  filename: string,
  dialogTitle = "Print or share",
): Promise<void> {
  if (!Capacitor.isNativePlatform() || !node) {
    window.print();
    return;
  }

  const { default: html2canvas } = await import("html2canvas");
  const { exportBlob } = await import("@/lib/native/exportFile");
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  await exportBlob(await canvasToPdfBlob(canvas), filename, dialogTitle);
}

// Open a print window for a standalone HTML string (web behavior).
function openPrintWindow(html: string): void {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

/**
 * Print/share a standalone HTML string. On web this opens a print window; on
 * native it renders the HTML into a hidden iframe, rasterizes it, and shares
 * the result as a PDF.
 */
export async function printOrShareHtml(
  html: string,
  filename: string,
  dialogTitle = "Print or share",
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    openPrintWindow(html);
    return;
  }

  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "794px", // ~A4 width @96dpi
    height: "10px",
    border: "0",
    background: "#ffffff",
  });
  document.body.appendChild(iframe);

  try {
    const idoc = iframe.contentDocument;
    if (!idoc) return;
    idoc.open();
    idoc.write(html);
    idoc.close();

    // Let layout settle, then wait for any images to load (capped).
    await new Promise<void>((resolve) => setTimeout(resolve, 150));
    await Promise.race([
      Promise.all(
        Array.from(idoc.images || []).map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); }),
        ),
      ),
      new Promise<void>((res) => setTimeout(res, 2000)),
    ]);

    const { default: html2canvas } = await import("html2canvas");
    const { exportBlob } = await import("@/lib/native/exportFile");
    const canvas = await html2canvas(idoc.body, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: 794,
    });
    await exportBlob(await canvasToPdfBlob(canvas), filename, dialogTitle);
  } finally {
    iframe.remove();
  }
}
