# PdfLab NDT

A fully offline, client-side PDF manipulation suite built with React, Vite, and Tailwind CSS.

## Features

- **Merge** — Combine multiple PDFs into one
- **Split** — Extract pages by number or range
- **Organize** — Drag-and-drop page reordering, rotation, deletion
- **OCR** — Extract text from scanned PDFs / images (Tesseract.js)
- **Convert** — Images ↔ PDF conversion
- **Encrypt** — Password-protect PDFs
- **Watermark** — Text / image watermarks with adjustable opacity

## Privacy

All processing runs 100% in your browser. No files are ever uploaded to any server.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 6 |
| Styling | Tailwind CSS v4 |
| PDF Engine | pdf-lib |
| PDF Viewer | pdf.js |
| OCR | Tesseract.js (WASM) |
| Offline | PWA (vite-plugin-pwa) |
| Drag & Drop | dnd-kit |

## Getting Started

```bash
npm install
npm run dev
```

## Build for Production

```bash
npm run build
npm run preview
```
