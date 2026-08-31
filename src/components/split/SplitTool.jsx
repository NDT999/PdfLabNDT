import React, { useState } from 'react';
import JSZip from 'jszip';
import ToolPageWrapper from '@/components/common/ToolPageWrapper';
import FileDropzone from '@/components/common/FileDropzone';
import { splitPDF } from '@/utils/pdfEngine';
import { loadPdfDocument } from '@/utils/pdfRenderer';
import { readFileAsArrayBuffer, downloadBlob, formatBytes } from '@/utils/fileUtils';
import { File, Loader2, X } from 'lucide-react';

export default function SplitTool() {
  const [fileData, setFileData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState('extract'); // 'extract' or 'split-all'
  const [pagesInput, setPagesInput] = useState('');

  const handleFiles = async (newFiles) => {
    const file = Array.from(newFiles).find(f => f.type === 'application/pdf');
    if (!file) return;

    setIsProcessing(true);
    try {
      const buffer = await readFileAsArrayBuffer(file);
      const pdfDoc = await loadPdfDocument(buffer);
      setFileData({
        file,
        buffer,
        name: file.name,
        size: file.size,
        pages: pdfDoc.numPages
      });
    } catch (err) {
      console.error("Failed to load PDF:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = () => {
    setFileData(null);
    setPagesInput('');
  };

  const parsePageNumbers = (input, maxPages) => {
    const pages = new Set();
    const parts = input.split(',').map(s => s.trim()).filter(Boolean);
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= maxPages) pages.add(i);
          }
        }
      } else {
        const num = Number(part);
        if (!isNaN(num) && num >= 1 && num <= maxPages) {
          pages.add(num);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const handleSplit = async () => {
    if (!fileData) return;
    setIsProcessing(true);
    
    try {
      if (mode === 'extract') {
        const pageNumbers = parsePageNumbers(pagesInput, fileData.pages);
        if (pageNumbers.length === 0) {
          alert('Please enter valid page numbers to extract.');
          setIsProcessing(false);
          return;
        }
        
        const extractedUint8 = await splitPDF(fileData.buffer, pageNumbers);
        const blob = new Blob([extractedUint8], { type: 'application/pdf' });
        downloadBlob(blob, `extracted_${fileData.name}`);
      } else if (mode === 'split-all') {
        const zip = new JSZip();
        for (let i = 1; i <= fileData.pages; i++) {
          const singlePageUint8 = await splitPDF(fileData.buffer, [i]);
          zip.file(`page_${i}.pdf`, singlePageUint8);
        }
        const zipContent = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipContent, `split_${fileData.name.replace('.pdf', '')}.zip`);
      }
    } catch (err) {
      console.error("Split failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageWrapper title="Split PDF" description="Extract specific pages or split a PDF into individual page files.">
      <div className="space-y-6 max-w-4xl mx-auto">
        {!fileData ? (
          <FileDropzone onFiles={handleFiles} accept={{ 'application/pdf': ['.pdf'] }} />
        ) : (
          <div className="card space-y-6">
            <div className="flex items-center justify-between p-4 bg-surface-50 rounded-lg border border-surface-100">
              <div className="flex items-center gap-3 overflow-hidden">
                <File className="w-8 h-8 text-brand-500 shrink-0" />
                <div className="truncate">
                  <p className="font-semibold truncate text-lg">{fileData.name}</p>
                  <p className="text-sm text-surface-500">{formatBytes(fileData.size)} • {fileData.pages} pages</p>
                </div>
              </div>
              <button onClick={removeFile} className="p-2 text-red-500 hover:bg-red-50 rounded-full shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Split Options</h3>
              
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border border-surface-200 rounded-lg cursor-pointer hover:bg-surface-50">
                  <input 
                    type="radio" 
                    name="mode" 
                    value="extract" 
                    checked={mode === 'extract'} 
                    onChange={(e) => setMode(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <span className="block font-medium">Extract specific pages</span>
                    <span className="block text-sm text-surface-500 mb-2">Create a new PDF containing only the specified pages.</span>
                    <input 
                      type="text" 
                      placeholder="e.g. 1, 3, 5-7" 
                      value={pagesInput}
                      onChange={(e) => setPagesInput(e.target.value)}
                      disabled={mode !== 'extract'}
                      className="w-full p-2 border border-surface-300 rounded focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-surface-100 disabled:opacity-50"
                    />
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-surface-200 rounded-lg cursor-pointer hover:bg-surface-50">
                  <input 
                    type="radio" 
                    name="mode" 
                    value="split-all" 
                    checked={mode === 'split-all'} 
                    onChange={(e) => setMode(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <span className="block font-medium">Split all pages</span>
                    <span className="block text-sm text-surface-500">Extract every page into a separate PDF file (downloads as a ZIP archive).</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-surface-100">
              <button 
                onClick={handleSplit} 
                disabled={isProcessing || (mode === 'extract' && !pagesInput.trim())}
                className="btn-primary flex items-center gap-2"
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'extract' ? 'Extract Pages' : 'Split to ZIP'}
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolPageWrapper>
  );
}
