import React, { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { readFileAsArrayBuffer } from '@/utils/fileUtils';
import { loadPdfDocument, renderPageToDataURL } from '@/utils/pdfRenderer';
import FileDropzone from '@/components/common/FileDropzone';
import ProgressBar from '@/components/common/ProgressBar';
import ToolPageWrapper from '@/components/common/ToolPageWrapper';

export default function PdfToImages() {
  const [file, setFile] = useState(null);
  const [scale, setScale] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  const handleFiles = (files) => {
    if (files.length > 0) setFile(files[0]);
  };

  const exportImages = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    setStatusText('Loading PDF...');

    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const pdfDoc = await loadPdfDocument(arrayBuffer);
      const numPages = pdfDoc.numPages;

      const zip = new JSZip();

      for (let i = 1; i <= numPages; i++) {
        setStatusText(`Rendering page ${i} of ${numPages}...`);
        const dataUrl = await renderPageToDataURL(pdfDoc, i, scale);
        
        const res = await fetch(dataUrl);
        const blob = await res.blob();

        zip.file(`page-${i}.png`, blob);
        setProgress(Math.round((i / numPages) * 100));
      }

      setStatusText('Zipping images...');
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${file.name.replace('.pdf', '')}_images.zip`);
      setStatusText('Complete!');
    } catch (err) {
      console.error(err);
      setStatusText('Error occurred during export.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageWrapper title="PDF to Images" description="Convert PDF pages into PNG images." icon="📸">
      {!file ? (
        <FileDropzone accept="application/pdf" label="Drop PDF here" onFiles={handleFiles} />
      ) : (
        <div className="card p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <span className="font-medium text-white truncate max-w-[200px]">{file.name}</span>
            <button onClick={() => setFile(null)} className="text-surface-100 hover:text-white" disabled={isProcessing}>Change File</button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-surface-50">Quality / Scale</label>
            <select value={scale} onChange={e => setScale(parseFloat(e.target.value))} disabled={isProcessing} className="bg-surface-0 border border-surface-100 rounded p-2 text-white focus:border-brand-500 focus:outline-none">
              <option value={0.5}>Low (0.5x)</option>
              <option value={1}>Medium (1x)</option>
              <option value={2}>High (2x)</option>
            </select>
          </div>

          {!isProcessing && statusText !== 'Complete!' && (
            <button onClick={exportImages} className="btn-primary py-3">
              Export as Images
            </button>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <div className="text-sm text-surface-50 flex justify-between">
                <span>{statusText}</span>
                <span>{progress}%</span>
              </div>
              <ProgressBar value={progress} color="brand" />
            </div>
          )}
        </div>
      )}
    </ToolPageWrapper>
  );
}
