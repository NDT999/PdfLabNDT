import React, { useState, useRef } from 'react';
import ToolPageWrapper from '@/components/common/ToolPageWrapper';
import FileDropzone from '@/components/common/FileDropzone';
import PdfCanvas from './PdfCanvas';
import { exportEditedPdf } from '@/utils/editorExport';
import { loadPdfDocument } from '@/utils/pdfRenderer';
import { Type, Square, PenTool, Trash2, Download, ArrowLeft, ArrowRight } from 'lucide-react';

export default function EditorTool() {
  const [file, setFile] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [pagesFabricData, setPagesFabricData] = useState({});
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'draw'
  const [isExporting, setIsExporting] = useState(false);

  const canvasRef = useRef(null);

  const handleFileDrop = async (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      const buffer = await selectedFile.arrayBuffer();
      setFileBuffer(buffer);
      
      try {
        const pdfDoc = await loadPdfDocument(buffer);
        setNumPages(pdfDoc.numPages);
        setCurrentPage(1);
        setPagesFabricData({});
      } catch (err) {
        console.error('Error loading PDF:', err);
      }
    }
  };

  const handleCanvasChange = (jsonData) => {
    setPagesFabricData(prev => ({
      ...prev,
      [currentPage - 1]: jsonData
    }));
  };

  const handleAddText = () => {
    setActiveTool('select');
    if (canvasRef.current) canvasRef.current.addText();
  };

  const handleAddRect = () => {
    setActiveTool('select');
    if (canvasRef.current) canvasRef.current.addRect();
  };

  const handleDelete = () => {
    if (canvasRef.current) canvasRef.current.deleteSelected();
  };

  const toggleDrawMode = () => {
    setActiveTool(prev => prev === 'draw' ? 'select' : 'draw');
  };

  const handleExport = async () => {
    if (!fileBuffer) return;
    try {
      setIsExporting(true);
      
      const pagesDataArray = Array.from({ length: numPages }).map((_, i) => pagesFabricData[i] || null);
      
      const modifiedBytes = await exportEditedPdf(fileBuffer, pagesDataArray);
      
      const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ToolPageWrapper 
      title="Advanced PDF Editor" 
      description="Visually add text, images, shapes, and signatures to your PDF."
      icon="✏️"
    >
      {!fileBuffer ? (
        <div className="mx-auto max-w-2xl">
          <FileDropzone
            onDrop={handleFileDrop}
            accept={{ 'application/pdf': ['.pdf'] }}
            maxFiles={1}
            title="Drop a PDF here to edit"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-6">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between w-full max-w-4xl bg-surface-50 border border-slate-700 rounded-xl p-4 shadow-sm">
            <div className="flex space-x-2">
              <button 
                onClick={handleAddText}
                className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                title="Add Text"
              >
                <Type className="w-4 h-4 mr-2" /> Text
              </button>
              <button 
                onClick={handleAddRect}
                className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                title="Add Rectangle"
              >
                <Square className="w-4 h-4 mr-2" /> Rectangle
              </button>
              <button 
                onClick={toggleDrawMode}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTool === 'draw' 
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title="Draw Mode"
              >
                <PenTool className="w-4 h-4 mr-2" /> Draw
              </button>
              
              <div className="w-px h-6 bg-slate-700 mx-2 self-center"></div>
              
              <button 
                onClick={handleDelete}
                className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                title="Delete Selected"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </button>
            </div>
            
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              <div className="flex items-center space-x-2 bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-300 px-2 font-medium">
                  {currentPage} / {numPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                  disabled={currentPage >= numPages}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white mr-2"></span>
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {isExporting ? 'Exporting...' : 'Save PDF'}
              </button>
            </div>
          </div>

          {/* Canvas area */}
          <div className="w-full overflow-auto flex justify-center bg-slate-900/50 p-6 rounded-xl border border-slate-800 min-h-[60vh]">
            <PdfCanvas 
              ref={canvasRef}
              fileBuffer={fileBuffer}
              pageNumber={currentPage}
              scale={1.5}
              activeTool={activeTool}
              initialFabricData={pagesFabricData[currentPage - 1]}
              onCanvasChange={handleCanvasChange}
            />
          </div>
        </div>
      )}
    </ToolPageWrapper>
  );
}
