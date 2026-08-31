import React, { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import { readFileAsArrayBuffer } from '@/utils/fileUtils';
import { loadPdfDocument, renderPageToDataURL } from '@/utils/pdfRenderer';
import FileDropzone from '@/components/common/FileDropzone';
import ProgressBar from '@/components/common/ProgressBar';
import ToolPageWrapper from '@/components/common/ToolPageWrapper';
import { Loader2, Copy, Download, FileText, X, Check, Globe, Image } from 'lucide-react';

const LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'spa', name: 'Spanish' },
  { code: 'ita', name: 'Italian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'chi_sim', name: 'Chinese (Simplified)' },
  { code: 'chi_tra', name: 'Chinese (Traditional)' },
  { code: 'vie', name: 'Vietnamese' },
  { code: 'ara', name: 'Arabic' },
];

export default function OcrTool() {
  const [file, setFile] = useState(null);
  const [lang, setLang] = useState('eng');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  const handleFiles = useCallback((files) => {
    const f = files[0];
    if (f) {
      setFile(f);
      setExtractedText('');
      setProgress(0);
      setStatusText('');
      setCopied(false);
      setPageCount(0);
      setCurrentPage(0);
    }
  }, []);

  const clearFile = () => {
    setFile(null);
    setExtractedText('');
    setProgress(0);
    setStatusText('');
    setCopied(false);
    setPageCount(0);
    setCurrentPage(0);
  };

  const handleOcr = async () => {
    if (!file) return;
    setIsProcessing(true);
    setExtractedText('');
    setProgress(0);
    setCopied(false);

    try {
      // Step 1: Prepare image sources
      let pageDataUrls = [];

      if (file.type === 'application/pdf') {
        setStatusText('Loading PDF…');
        const arrayBuffer = await readFileAsArrayBuffer(file);
        const pdf = await loadPdfDocument(arrayBuffer);
        const totalPages = pdf.numPages;
        setPageCount(totalPages);

        for (let i = 1; i <= totalPages; i++) {
          setStatusText(`Rendering page ${i} of ${totalPages}…`);
          setCurrentPage(i);
          const dataUrl = await renderPageToDataURL(pdf, i, 2.0);
          pageDataUrls.push(dataUrl);
        }
      } else {
        // Image file — create a blob URL
        setPageCount(1);
        setCurrentPage(1);
        const dataUrl = URL.createObjectURL(file);
        pageDataUrls.push(dataUrl);
      }

      // Step 2: Create Tesseract worker
      setStatusText('Initializing OCR engine…');
      const worker = await Tesseract.createWorker(lang, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pageProgress = Math.round(m.progress * 100);
            // Overall progress across all pages
            const overallProgress = pageDataUrls.length > 1
              ? Math.round(((currentPageRef - 1) / pageDataUrls.length + m.progress / pageDataUrls.length) * 100)
              : pageProgress;
            setProgress(overallProgress);
          }
        },
      });

      // Step 3: OCR each page
      let allText = '';
      let currentPageRef = 0;

      for (let i = 0; i < pageDataUrls.length; i++) {
        currentPageRef = i + 1;
        setCurrentPage(currentPageRef);
        setStatusText(`Recognizing text… Page ${currentPageRef} of ${pageDataUrls.length}`);

        const { data: { text } } = await worker.recognize(pageDataUrls[i]);

        if (pageDataUrls.length > 1 && i > 0) {
          allText += `\n--- Page ${currentPageRef} ---\n\n`;
        }
        allText += text;

        // Update progress per page
        setProgress(Math.round(((i + 1) / pageDataUrls.length) * 100));

        // Revoke blob URL if we created one
        if (file.type !== 'application/pdf' && pageDataUrls[i].startsWith('blob:')) {
          URL.revokeObjectURL(pageDataUrls[i]);
        }
      }

      await worker.terminate();
      setExtractedText(allText.trim());
      setStatusText('');
      setProgress(100);
    } catch (err) {
      console.error('OCR error:', err);
      setStatusText('Error during OCR processing. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = extractedText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name?.replace(/\.[^.]+$/, '') || 'ocr-result'}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const wordCount = extractedText
    ? extractedText.split(/\s+/).filter((w) => w.length > 0).length
    : 0;
  const charCount = extractedText.length;

  const isPdf = file?.type === 'application/pdf';

  return (
    <ToolPageWrapper
      title="OCR — Extract Text"
      description="Recognize text from scanned PDFs or images using Tesseract."
      icon="🔍"
    >
      <div className="space-y-6">
        {/* File Input */}
        {!file ? (
          <FileDropzone
            accept="application/pdf,image/png,image/jpeg,image/tiff,image/webp"
            multiple={false}
            maxSizeMB={100}
            onFiles={handleFiles}
            label="Drop a PDF or image here"
            sublabel="Supports PDF, PNG, JPG, TIFF, WebP"
          />
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-surface-50 p-4">
            <div className="flex items-center gap-3 overflow-hidden">
              {isPdf ? (
                <FileText className="h-6 w-6 shrink-0 text-brand-400" />
              ) : (
                <Image className="h-6 w-6 shrink-0 text-emerald-400" />
              )}
              <div className="truncate">
                <p className="truncate font-medium text-slate-200">{file.name}</p>
                <p className="text-sm text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB
                  {isPdf ? ' • PDF document' : ` • ${file.type.split('/')[1]?.toUpperCase()} image`}
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              disabled={isProcessing}
              className="ml-3 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-surface-100 hover:text-red-400 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Settings & Action */}
        {file && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {/* Language selector */}
            <div className="flex-1">
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300">
                <Globe className="h-4 w-4 text-slate-500" />
                OCR Language
              </label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                disabled={isProcessing}
                className="w-full rounded-lg border border-slate-700/50 bg-surface-0 px-3 py-2.5 text-sm text-slate-200 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* OCR button */}
            <button
              onClick={handleOcr}
              disabled={isProcessing}
              className="btn-primary whitespace-nowrap"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  🔍 Start OCR
                </>
              )}
            </button>
          </div>
        )}

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-3 rounded-xl border border-slate-700/50 bg-surface-50 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{statusText}</span>
              {pageCount > 1 && (
                <span className="font-mono text-xs text-slate-500">
                  Page {currentPage}/{pageCount}
                </span>
              )}
            </div>
            <ProgressBar value={progress} color="amber" />
          </div>
        )}

        {/* Results */}
        {extractedText && !isProcessing && (
          <div className="space-y-4">
            {/* Stats bar */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-slate-700/50 bg-surface-50 px-5 py-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-slate-400">OCR Complete</span>
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <span className="text-sm text-slate-400">
                <span className="font-semibold text-slate-200">{wordCount.toLocaleString()}</span> words
              </span>
              <span className="text-sm text-slate-400">
                <span className="font-semibold text-slate-200">{charCount.toLocaleString()}</span> characters
              </span>
              {pageCount > 1 && (
                <span className="text-sm text-slate-400">
                  <span className="font-semibold text-slate-200">{pageCount}</span> pages
                </span>
              )}
            </div>

            {/* Text output */}
            <div className="relative">
              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                className="h-96 w-full resize-y rounded-xl border border-slate-700/50 bg-surface-0 p-4 font-mono text-sm leading-relaxed text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Extracted text will appear here…"
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button onClick={handleCopy} className="btn-secondary">
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </button>

              <button onClick={handleDownloadTxt} className="btn-secondary">
                <Download className="h-4 w-4" />
                Download .txt
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolPageWrapper>
  );
}
