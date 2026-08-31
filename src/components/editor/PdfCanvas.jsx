import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { fabric } from 'fabric';
import { loadPdfDocument, renderPageToDataURL } from '@/utils/pdfRenderer';

const PdfCanvas = forwardRef(({ 
  fileBuffer, 
  pageNumber, 
  scale = 1.0, 
  initialFabricData, 
  onCanvasChange,
  onSelectionChange,
  activeTool,
  drawColor = '#ef4444',
  drawWidth = 3
}, ref) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  
  const [bgImage, setBgImage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    addText: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const text = new fabric.IText('Text here', {
        left: 50,
        top: 50,
        fill: '#0f172a',
        fontSize: 24 * scale,
        fontFamily: 'Helvetica',
      });
      canvas.add(text);
      canvas.setActiveObject(text);
      canvas.renderAll();
      if (onCanvasChange) onCanvasChange(canvas.toJSON());
    },
    addRect: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const rect = new fabric.Rect({
        left: 50,
        top: 50,
        fill: 'transparent',
        stroke: '#ef4444',
        strokeWidth: 2 * scale,
        width: 100 * scale,
        height: 100 * scale,
      });
      canvas.add(rect);
      canvas.setActiveObject(rect);
      canvas.renderAll();
      if (onCanvasChange) onCanvasChange(canvas.toJSON());
    },
    addImage: (url) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      fabric.Image.fromURL(url, (img) => {
        img.scaleToWidth(150 * scale);
        img.set({ left: 50, top: 50 });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        if (onCanvasChange) onCanvasChange(canvas.toJSON());
      });
    },
    deleteSelected: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length) {
        canvas.discardActiveObject();
        activeObjects.forEach((obj) => canvas.remove(obj));
        if (onCanvasChange) onCanvasChange(canvas.toJSON());
      }
    },
    updateSelectedObject: (props) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        activeObj.set(props);
        canvas.renderAll();
        if (onCanvasChange) onCanvasChange(canvas.toJSON());
      }
    }
  }));

  // 1. Render PDF page to image
  useEffect(() => {
    let isMounted = true;
    
    async function renderPdf() {
      try {
        setLoading(true);
        const pdfDoc = await loadPdfDocument(fileBuffer);
        
        // Render at requested scale
        const dataUrl = await renderPageToDataURL(pdfDoc, pageNumber, scale);
        
        if (isMounted) {
          setBgImage(dataUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error rendering PDF page:', err);
        if (isMounted) setLoading(false);
      }
    }
    
    if (fileBuffer && pageNumber) {
      renderPdf();
    }
    
    return () => { isMounted = false; };
  }, [fileBuffer, pageNumber, scale]);

  // 2. Initialize Fabric.js
  useEffect(() => {
    if (!canvasRef.current || !bgImage) return;

    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
    }

    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: activeTool === 'draw',
    });
    
    fabricCanvasRef.current = canvas;

    fabric.Image.fromURL(bgImage, function(img) {
      // Set canvas dimensions exactly to the rendered PDF image
      canvas.setWidth(img.width);
      canvas.setHeight(img.height);
      
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));

      if (initialFabricData) {
        canvas.loadFromJSON(initialFabricData, function() {
          canvas.renderAll();
        });
      }

      // Notify parent of changes
      const handleChange = () => {
        if (onCanvasChange) onCanvasChange(canvas.toJSON());
      };

      const handleSelection = () => {
        if (onSelectionChange) {
          const activeObj = canvas.getActiveObject();
          if (!activeObj) {
            onSelectionChange(null);
          } else {
            onSelectionChange({
              type: activeObj.type,
              fill: activeObj.fill,
              stroke: activeObj.stroke,
              strokeWidth: activeObj.strokeWidth,
              fontSize: activeObj.fontSize,
              opacity: activeObj.opacity
            });
          }
        }
      };

      canvas.on('object:added', handleChange);
      canvas.on('object:modified', handleChange);
      canvas.on('object:removed', handleChange);
      canvas.on('path:created', handleChange);

      canvas.on('selection:created', handleSelection);
      canvas.on('selection:updated', handleSelection);
      canvas.on('selection:cleared', handleSelection);
    });

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgImage]); 

  // 3. Handle active tool changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = activeTool === 'draw';
    
    if (activeTool === 'draw' && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = drawColor;
      canvas.freeDrawingBrush.width = drawWidth * scale;
    }
  }, [activeTool, drawColor, drawWidth, scale]);

  return (
    <div ref={containerRef} className="relative inline-block bg-white shadow-2xl transition-all">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
        </div>
      )}
      <canvas ref={canvasRef} className="border border-slate-300" />
    </div>
  );
});

export default PdfCanvas;
