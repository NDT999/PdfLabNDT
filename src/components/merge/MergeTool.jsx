import React, { useState } from 'react';
import ToolPageWrapper from '@/components/common/ToolPageWrapper';
import FileDropzone from '@/components/common/FileDropzone';
import { mergePDFs } from '@/utils/pdfEngine';
import { loadPdfDocument } from '@/utils/pdfRenderer';
import { readFileAsArrayBuffer, downloadBlob, formatBytes } from '@/utils/fileUtils';
import { ArrowUp, ArrowDown, X, File, Loader2 } from 'lucide-react';

export default function MergeTool() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = async (newFiles) => {
    setIsProcessing(true);
    const pdfFiles = Array.from(newFiles).filter(f => f.type === 'application/pdf');
    
    const newItems = [];
    for (const file of pdfFiles) {
      try {
        const buffer = await readFileAsArrayBuffer(file);
        const pdfDoc = await loadPdfDocument(buffer);
        newItems.push({
          id: Math.random().toString(36).substring(7),
          file,
          buffer,
          name: file.name,
          size: file.size,
          pages: pdfDoc.numPages
        });
      } catch (err) {
        console.error("Failed to load PDF:", err);
      }
    }
    
    setFiles(prev => [...prev, ...newItems]);
    setIsProcessing(false);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const moveUp = (index) => {
    if (index === 0) return;
    setFiles(prev => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  };

  const moveDown = (index) => {
    if (index === files.length - 1) return;
    setFiles(prev => {
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);
    try {
      const buffers = files.map(f => f.buffer);
      const mergedUint8 = await mergePDFs(buffers);
      const blob = new Blob([mergedUint8], { type: 'application/pdf' });
      downloadBlob(blob, 'merged_document.pdf');
    } catch (err) {
      console.error("Merge failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageWrapper title="Merge PDFs" description="Combine multiple PDF files into one single document.">
      <div className="space-y-6 max-w-4xl mx-auto">
        <FileDropzone onFiles={handleFiles} multiple accept={{ 'application/pdf': ['.pdf'] }} />

        {files.length > 0 && (
          <div className="card space-y-4">
            <h3 className="font-semibold text-lg">Files to Merge ({files.length})</h3>
            <div className="space-y-2">
              {files.map((file, idx) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg border border-surface-100">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <File className="w-6 h-6 text-brand-500 shrink-0" />
                    <div className="truncate">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-surface-500">{formatBytes(file.size)} • {file.pages} pages</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-1 hover:bg-surface-200 rounded disabled:opacity-30">
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveDown(idx)} disabled={idx === files.length - 1} className="p-1 hover:bg-surface-200 rounded disabled:opacity-30">
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeFile(file.id)} className="p-1 text-red-500 hover:bg-red-50 rounded ml-2">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={handleMerge} 
                disabled={files.length < 2 || isProcessing}
                className="btn-primary flex items-center gap-2"
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                Merge PDFs
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolPageWrapper>
  );
}
