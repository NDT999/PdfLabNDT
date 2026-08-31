import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// Load a PDF document from ArrayBuffer
export async function loadPdfDocument(arrayBuffer) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return await loadingTask.promise;
}

// Render a single page to a canvas and return the data URL
export async function renderPageToDataURL(pdfDoc, pageNumber, scale = 0.5) {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  const renderContext = {
    canvasContext: context,
    viewport: viewport
  };
  
  await page.render(renderContext).promise;
  return canvas.toDataURL('image/jpeg', 0.8);
}

// Render all pages to thumbnail data URLs
export async function renderAllThumbnails(pdfDoc, scale = 0.3) {
  const numPages = pdfDoc.numPages;
  const thumbnails = [];
  for (let i = 1; i <= numPages; i++) {
    const dataUrl = await renderPageToDataURL(pdfDoc, i, scale);
    thumbnails.push(dataUrl);
  }
  return thumbnails;
}
