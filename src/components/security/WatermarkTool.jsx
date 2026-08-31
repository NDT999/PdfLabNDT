import React, { useState } from 'react';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { readFileAsArrayBuffer, downloadBlob } from '@/utils/fileUtils';
import FileDropzone from '@/components/common/FileDropzone';
import ToolPageWrapper from '@/components/common/ToolPageWrapper';

export default function WatermarkTool() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(-45);
  const [position, setPosition] = useState('center'); // center, tl, tr, bl, br
  const [colorPreset, setColorPreset] = useState('gray');
  const [isProcessing, setIsProcessing] = useState(false);

  const colors = {
    red: rgb(1, 0, 0),
    gray: rgb(0.5, 0.5, 0.5),
    blue: rgb(0, 0, 1),
    black: rgb(0, 0, 0)
  };

  const handleFiles = (files) => {
    if (files.length > 0) setFile(files[0]);
  };

  const applyWatermark = async () => {
    if (!file || !text) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);

        let x = width / 2;
        let y = height / 2;

        if (position === 'center') {
          x = width / 2 - textWidth / 2;
          y = height / 2 - textHeight / 2;
        } else if (position === 'tl') {
          x = 20; y = height - 20 - textHeight;
        } else if (position === 'tr') {
          x = width - 20 - textWidth; y = height - 20 - textHeight;
        } else if (position === 'bl') {
          x = 20; y = 20;
        } else if (position === 'br') {
          x = width - 20 - textWidth; y = 20;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: colors[colorPreset] || colors.gray,
          opacity: opacity,
          rotate: degrees(rotation),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      downloadBlob(blob, `watermarked_${file.name}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageWrapper title="Watermark" description="Add a text watermark to your PDF." icon="💧">
      {!file ? (
        <FileDropzone accept="application/pdf" label="Drop PDF here" onFiles={handleFiles} />
      ) : (
        <div className="card p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <span className="font-medium text-white truncate max-w-[200px]">{file.name}</span>
            <button onClick={() => setFile(null)} className="text-surface-100 hover:text-white" disabled={isProcessing}>Change File</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-surface-50">Watermark Text</label>
              <input 
                type="text" 
                value={text} 
                onChange={e => setText(e.target.value)}
                className="bg-surface-0 border border-surface-100 rounded p-2 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-surface-50">Color</label>
              <select value={colorPreset} onChange={e => setColorPreset(e.target.value)} className="bg-surface-0 border border-surface-100 rounded p-2 text-white focus:border-brand-500 focus:outline-none">
                <option value="gray">Gray</option>
                <option value="red">Red</option>
                <option value="blue">Blue</option>
                <option value="black">Black</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-surface-50 flex justify-between">
                <span>Font Size</span>
                <span>{fontSize}px</span>
              </label>
              <input type="range" min="12" max="120" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-surface-50 flex justify-between">
                <span>Opacity</span>
                <span>{Math.round(opacity * 100)}%</span>
              </label>
              <input type="range" min="0.05" max="1.0" step="0.05" value={opacity} onChange={e => setOpacity(Number(e.target.value))} className="w-full" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-surface-50 flex justify-between">
                <span>Rotation</span>
                <span>{rotation}°</span>
              </label>
              <input type="range" min="-90" max="90" value={rotation} onChange={e => setRotation(Number(e.target.value))} className="w-full" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-surface-50">Position</label>
              <select value={position} onChange={e => setPosition(e.target.value)} className="bg-surface-0 border border-surface-100 rounded p-2 text-white focus:border-brand-500 focus:outline-none">
                <option value="center">Center</option>
                <option value="tl">Top Left</option>
                <option value="tr">Top Right</option>
                <option value="bl">Bottom Left</option>
                <option value="br">Bottom Right</option>
              </select>
            </div>
          </div>

          <button onClick={applyWatermark} disabled={isProcessing || !text} className="btn-primary py-3 mt-2">
            {isProcessing ? 'Applying...' : 'Apply Watermark & Download'}
          </button>
        </div>
      )}
    </ToolPageWrapper>
  );
}
