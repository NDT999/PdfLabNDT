import { PDFDocument, degrees } from 'pdf-lib';

export { PDFDocument, degrees };

// Merge multiple PDFs into one
export async function mergePDFs(pdfBytesArray) {
  const mergedPdf = await PDFDocument.create();
  for (const pdfBytes of pdfBytesArray) {
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  return await mergedPdf.save();
}

// Split a PDF: extract specific pages (1-indexed array)
export async function splitPDF(pdfBytes, pageNumbers) {
  const originalPdf = await PDFDocument.load(pdfBytes);
  const newPdf = await PDFDocument.create();
  const indices = pageNumbers.map((n) => n - 1).filter(n => n >= 0 && n < originalPdf.getPageCount());
  const copiedPages = await newPdf.copyPages(originalPdf, indices);
  copiedPages.forEach((page) => newPdf.addPage(page));
  return await newPdf.save();
}

// Split by ranges: returns array of Uint8Arrays, one per range
export async function splitPDFByRanges(pdfBytes, ranges) {
  const originalPdf = await PDFDocument.load(pdfBytes);
  const result = [];
  for (const range of ranges) {
    const newPdf = await PDFDocument.create();
    const indices = [];
    for (let i = range.start - 1; i <= range.end - 1; i++) {
      if (i >= 0 && i < originalPdf.getPageCount()) {
        indices.push(i);
      }
    }
    const copiedPages = await newPdf.copyPages(originalPdf, indices);
    copiedPages.forEach((page) => newPdf.addPage(page));
    result.push(await newPdf.save());
  }
  return result;
}

// Rotate a specific page (1-indexed). degrees: 90, 180, 270
export async function rotatePage(pdfBytes, pageNumber, rotationDegrees) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPage(pageNumber - 1);
  const currentRotation = page.getRotation().angle;
  page.setRotation(degrees(currentRotation + rotationDegrees));
  return await pdfDoc.save();
}

// Delete specific pages (1-indexed array)
export async function deletePages(pdfBytes, pageNumbers) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const indices = pageNumbers.map(n => n - 1).sort((a, b) => b - a);
  for (const index of indices) {
    if (index >= 0 && index < pdfDoc.getPageCount()) {
      pdfDoc.removePage(index);
    }
  }
  return await pdfDoc.save();
}

// Reorder pages. newOrder is array of 1-indexed page numbers
export async function reorderPages(pdfBytes, newOrder) {
  const originalPdf = await PDFDocument.load(pdfBytes);
  const newPdf = await PDFDocument.create();
  const indices = newOrder.map(n => n - 1).filter(n => n >= 0 && n < originalPdf.getPageCount());
  const copiedPages = await newPdf.copyPages(originalPdf, indices);
  copiedPages.forEach(page => newPdf.addPage(page));
  return await newPdf.save();
}
