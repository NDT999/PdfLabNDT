import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { readFileAsArrayBuffer, downloadBlob } from '@/utils/fileUtils';
import FileDropzone from '@/components/common/FileDropzone';
import ToolPageWrapper from '@/components/common/ToolPageWrapper';

export default function ImageToPdf() {
  const [images, setImages] = useState([]);
  const [pageSize, setPageSize] = useState('fit'); // fit, a4, letter
  const [margin, setMargin] = useState('none'); // none, small, medium
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = (files) => {
    const newImages = Array.from(files).map(f => ({
      file: f,
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(f)
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  const moveUp = (index) => {
    if (index === 0) return;
    const newImgs = [...images];
    [newImgs[index - 1], newImgs[index]] = [newImgs[index], newImgs[index - 1]];
    setImages(newImgs);
  };

  const moveDown = (index) => {
    if (index === images.length - 1) return;
    const newImgs = [...images];
    [newImgs[index + 1], newImgs[index]] = [newImgs[index], newImgs[index + 1]];
    setImages(newImgs);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const convertToPdf = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      
      const marginMap = { none: 0, small: 20, medium: 40 };
      const m = marginMap[margin];

      for (const imgObj of images) {
        const file = imgObj.file;
        const imageBytes = await readFileAsArrayBuffer(file);
        
        let pdfImage;
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          pdfImage = await pdfDoc.embedJpg(imageBytes);
        } else if (file.type === 'image/png') {
          pdfImage = await pdfDoc.embedPng(imageBytes);
        } else {
          pdfImage = await pdfDoc.embedPng(imageBytes); // fallback
        }

        let { width, height } = pdfImage.scale(1);
        let pageWidth, pageHeight;

        if (pageSize === 'a4') {
          pageWidth = 595.28;
          pageHeight = 841.89;
        } else if (pageSize === 'letter') {
          pageWidth = 612;
          pageHeight = 792;
        } else {
          pageWidth = width + m * 2;
          pageHeight = height + m * 2;
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        
        const drawAreaW = pageWidth - m * 2;
        const drawAreaH = pageHeight - m * 2;
        
        const scale = Math.min(drawAreaW / width, drawAreaH / height);
        const finalW = width * scale;
        const finalH = height * scale;

        const x = (pageWidth - finalW) / 2;
        const y = (pageHeight - finalH) / 2;

        page.drawImage(pdfImage, { x, y, width: finalW, height: finalH });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      downloadBlob(blob, 'converted_images.pdf');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageWrapper title="Images to PDF" description="Convert multiple images into a single PDF document." icon="🖼️">
      <div className="space-y-6">
        <FileDropzone 
          accept="image/png,image/jpeg,image/webp"
          multiple={true}
          label="Drop images here"
          sublabel="PNG, JPEG, WebP supported"
          onFiles={handleFiles}
        />

        {images.length > 0 && (
          <div className="card p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-medium text-white">Images ({images.length})</h3>
              <div className="space-y-2">
                {images.map((img, i) => (
                  <div key={img.id} className="flex items-center gap-4 bg-surface-0 p-2 border border-surface-100 rounded">
                    <img src={img.preview} alt="preview" className="w-16 h-16 object-cover rounded bg-black" />
                    <span className="flex-1 truncate text-sm text-surface-50">{img.file.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveUp(i)} disabled={i === 0} className="p-1 text-surface-100 hover:text-white disabled:opacity-30">▲</button>
                      <button onClick={() => moveDown(i)} disabled={i === images.length - 1} className="p-1 text-surface-100 hover:text-white disabled:opacity-30">▼</button>
                      <button onClick={() => removeImage(i)} className="p-1 text-rose-500 hover:text-rose-400 ml-2">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-surface-50">Page Size</label>
                <select value={pageSize} onChange={e => setPageSize(e.target.value)} className="bg-surface-0 border border-surface-100 rounded p-2 text-white focus:border-brand-500 focus:outline-none">
                  <option value="fit">Fit to Image</option>
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-surface-50">Margin</label>
                <select value={margin} onChange={e => setMargin(e.target.value)} className="bg-surface-0 border border-surface-100 rounded p-2 text-white focus:border-brand-500 focus:outline-none">
                  <option value="none">None</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                </select>
              </div>
            </div>

            <button onClick={convertToPdf} disabled={isProcessing} className="btn-primary py-3">
              {isProcessing ? 'Converting...' : 'Convert to PDF'}
            </button>
          </div>
        )}
      </div>
    </ToolPageWrapper>
  );
}
