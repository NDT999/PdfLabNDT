import React, { useState, useRef, useEffect, useCallback } from 'react';
import ToolPageWrapper from '@/components/common/ToolPageWrapper';
import FileDropzone from '@/components/common/FileDropzone';
import PdfCanvas from './PdfCanvas';
import { exportEditedPdf } from '@/utils/editorExport';
import { loadPdfDocument } from '@/utils/pdfRenderer';
import { Type, Square, PenTool, Trash2, Download, ArrowLeft, ArrowRight, Image as ImageIcon, Settings2, ZoomIn, ZoomOut, Undo2, Redo2, Highlighter, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';

export default function EditorTool() {
  const [file, setFile] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  
  const [pagesFabricData, setPagesFabricData] = useState({});
  const [history, setHistory] = useState([{}]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'draw', 'highlight'
  const [selectedObject, setSelectedObject] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Draw defaults
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [drawWidth, setDrawWidth] = useState(3);

  const canvasRef = useRef(null);
  const imageInputRef = useRef(null);
  const skipHistoryUpdate = useRef(false);

  const handleFileDrop = async (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      const buffer = await selectedFile.arrayBuffer();
      setFileBuffer(buffer);
      
      try {
        const pdfDoc = await loadPdfDocument(buffer.slice(0));
        setNumPages(pdfDoc.numPages);
        setCurrentPage(1);
        setPagesFabricData({});
        setHistory([{}]);
        setHistoryIndex(0);
      } catch (err) {
        console.error('Error loading PDF:', err);
      }
    }
  };

  const handleCanvasChange = useCallback((jsonData) => {
    if (skipHistoryUpdate.current) return;
    
    setPagesFabricData(prev => {
      const next = { ...prev, [currentPage - 1]: jsonData };
      
      setHistory(prevHistory => {
        const newHistory = prevHistory.slice(0, historyIndex + 1);
        newHistory.push(next);
        if (newHistory.length > 50) newHistory.shift();
        setHistoryIndex(newHistory.length - 1);
        return newHistory;
      });
      
      return next;
    });
  }, [currentPage, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      skipHistoryUpdate.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPagesFabricData(history[newIndex]);
      setTimeout(() => { skipHistoryUpdate.current = false; }, 100);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      skipHistoryUpdate.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPagesFabricData(history[newIndex]);
      setTimeout(() => { skipHistoryUpdate.current = false; }, 100);
    }
  }, [historyIndex, history]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (e.key === 'y') {
          handleRedo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleSelectionChange = (obj) => {
    setSelectedObject(obj);
  };

  const handleAddText = () => {
    setActiveTool('select');
    if (canvasRef.current) canvasRef.current.addText();
  };

  const handleAddRect = () => {
    setActiveTool('select');
    if (canvasRef.current) canvasRef.current.addRect();
  };

  const toggleDrawMode = () => {
    setActiveTool(prev => prev === 'draw' ? 'select' : 'draw');
  };

  const toggleHighlightMode = () => {
    setActiveTool(prev => prev === 'highlight' ? 'select' : 'highlight');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setActiveTool('select');
    if (canvasRef.current) canvasRef.current.addImage(url);
    e.target.value = ''; // reset
  };

  const handleDelete = () => {
    if (canvasRef.current) canvasRef.current.deleteSelected();
  };

  const updateProp = (key, value) => {
    if (canvasRef.current) {
      canvasRef.current.updateSelectedObject({ [key]: value });
    }
  };

  const handleExport = async () => {
    if (!fileBuffer) return;
    try {
      setIsExporting(true);
      const pagesDataArray = Array.from({ length: numPages }).map((_, i) => pagesFabricData[i] || null);
      const modifiedBytes = await exportEditedPdf(fileBuffer.slice(0), pagesDataArray);
      
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

  if (!fileBuffer) {
    return (
      <ToolPageWrapper title="Advanced PDF Editor" description="Visually add text, images, shapes, and signatures to your PDF." icon="✏️">
        <div className="mx-auto max-w-2xl">
          <FileDropzone onFiles={handleFileDrop} accept="application/pdf" multiple={false} label="Drop a PDF here to edit" />
        </div>
      </ToolPageWrapper>
    );
  }

  return (
    <div className="flex flex-col h-[85vh] -mx-4 -mb-12 bg-surface-100 rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-50 border-b border-slate-700/50 z-10">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button onClick={handleUndo} disabled={historyIndex <= 0} className="flex flex-col items-center justify-center w-12 h-12 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors disabled:opacity-30">
            <Undo2 className="w-5 h-5 mb-1" /> Undo
          </button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="flex flex-col items-center justify-center w-12 h-12 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors disabled:opacity-30">
            <Redo2 className="w-5 h-5 mb-1" /> Redo
          </button>
          
          <div className="w-px h-8 bg-slate-700 mx-2 self-center"></div>
          
          <button onClick={handleAddText} className="flex flex-col items-center justify-center w-14 h-12 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors">
            <Type className="w-5 h-5 mb-1" /> Text
          </button>
          <button onClick={handleAddRect} className="flex flex-col items-center justify-center w-16 h-12 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors">
            <Square className="w-5 h-5 mb-1" /> Shape
          </button>
          <button onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center justify-center w-14 h-12 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors">
            <ImageIcon className="w-5 h-5 mb-1" /> Image
          </button>
          <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageUpload} className="hidden" />
          
          <button onClick={toggleDrawMode} className={`flex flex-col items-center justify-center w-14 h-12 text-xs font-medium rounded-lg transition-colors ${activeTool === 'draw' ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}>
            <PenTool className="w-5 h-5 mb-1" /> Draw
          </button>

          <button onClick={toggleHighlightMode} className={`flex flex-col items-center justify-center w-16 h-12 text-xs font-medium rounded-lg transition-colors ${activeTool === 'highlight' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}>
            <Highlighter className="w-5 h-5 mb-1" /> Highlight
          </button>
          
          <div className="w-px h-8 bg-slate-700 mx-2 self-center"></div>
          
          <button onClick={handleDelete} className="flex flex-col items-center justify-center w-14 h-12 text-xs font-medium rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors">
            <Trash2 className="w-5 h-5 mb-1" /> Delete
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-surface-100 rounded-lg p-1 border border-slate-700/50 hidden sm:flex">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1.5 text-slate-400 hover:text-white">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-300 w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-1.5 text-slate-400 hover:text-white">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button onClick={handleExport} disabled={isExporting} className="flex items-center px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed">
            {isExporting ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white mr-2"></span> : <Download className="w-4 h-4 mr-2" />}
            Save PDF
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Canvas Area */}
        <div className="flex-1 overflow-auto bg-slate-800 p-6 flex flex-col items-center">
          <div className="mb-4 flex items-center space-x-2 bg-surface-50 rounded-lg p-1 border border-slate-700/50 shadow-sm sticky top-0 z-10">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-50">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-300 px-3 font-medium">Page {currentPage} of {numPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages} className="p-1 text-slate-400 hover:text-white disabled:opacity-50">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <PdfCanvas 
            ref={canvasRef}
            fileBuffer={fileBuffer}
            pageNumber={currentPage}
            scale={scale}
            activeTool={activeTool}
            drawColor={drawColor}
            drawWidth={drawWidth}
            initialFabricData={pagesFabricData[currentPage - 1]}
            onCanvasChange={handleCanvasChange}
            onSelectionChange={handleSelectionChange}
          />
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-72 bg-surface-50 border-l border-slate-700/50 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-slate-700/50 flex items-center space-x-2">
            <Settings2 className="w-5 h-5 text-slate-400" />
            <h3 className="font-medium text-slate-200">Properties</h3>
          </div>
          
          <div className="p-4 space-y-6">
            {activeTool === 'draw' && !selectedObject && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-2 block">Brush Color</label>
                  <HexColorPicker color={drawColor} onChange={setDrawColor} style={{ width: '100%', height: '150px' }} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-2 block">Brush Size: {drawWidth}px</label>
                  <input type="range" min="1" max="50" value={drawWidth} onChange={e => setDrawWidth(Number(e.target.value))} className="w-full" />
                </div>
              </div>
            )}
            
            {activeTool === 'highlight' && !selectedObject && (
              <div className="space-y-4">
                <div className="text-sm text-slate-300">
                  Highlighter tool is active. Draw on the document to highlight.
                </div>
              </div>
            )}

            {selectedObject && selectedObject.type === 'i-text' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-2 block">Text Formatting</label>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => updateProp('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold')}
                      className={`p-2 rounded ${selectedObject.fontWeight === 'bold' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => updateProp('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic')}
                      className={`p-2 rounded ${selectedObject.fontStyle === 'italic' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-2 block">Alignment</label>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => updateProp('textAlign', 'left')}
                      className={`p-2 rounded ${selectedObject.textAlign === 'left' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => updateProp('textAlign', 'center')}
                      className={`p-2 rounded ${selectedObject.textAlign === 'center' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => updateProp('textAlign', 'right')}
                      className={`p-2 rounded ${selectedObject.textAlign === 'right' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 mb-2 block">Text Color</label>
                  <HexColorPicker color={selectedObject.fill} onChange={c => updateProp('fill', c)} style={{ width: '100%', height: '150px' }} />
                </div>
              </div>
            )}

            {selectedObject && (selectedObject.type === 'rect' || selectedObject.type === 'path') && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-2 block">Color (Stroke/Fill)</label>
                  <HexColorPicker color={selectedObject.stroke || selectedObject.fill} onChange={c => {
                     if (selectedObject.type === 'rect' && selectedObject.fill !== 'transparent') updateProp('fill', c);
                     else updateProp('stroke', c);
                  }} style={{ width: '100%', height: '150px' }} />
                </div>
                {selectedObject.type === 'rect' && (
                  <div className="flex items-center space-x-2 mt-4">
                    <input type="checkbox" id="fill-toggle" 
                      checked={selectedObject.fill !== 'transparent'}
                      onChange={e => {
                        const isFilled = e.target.checked;
                        updateProp('fill', isFilled ? selectedObject.stroke : 'transparent');
                      }} 
                    />
                    <label htmlFor="fill-toggle" className="text-sm text-slate-300">Solid Fill (Redact)</label>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-2 block">Stroke Width</label>
                  <input type="range" min="1" max="20" value={selectedObject.strokeWidth / scale} onChange={e => updateProp('strokeWidth', Number(e.target.value) * scale)} className="w-full" />
                </div>
              </div>
            )}

            {!selectedObject && activeTool !== 'draw' && activeTool !== 'highlight' && (
              <div className="text-center py-10 text-slate-500 text-sm">
                Select an object to edit its properties.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

