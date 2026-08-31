import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { fabric } from 'fabric';
import { loadPdfDocument, renderPageToDataURL } from '@/utils/pdfRenderer';

const PdfCanvas = forwardRef(({ 
  fileBuffer, 
  pageNumber, 
  scale = 1.0, 
  initialFabricData, 
  onCanvasChange,
  activeTool 
}, ref) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  
  const [bgImage, setBgImage] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    addText: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const text = new fabric.IText('Double click to edit', {
        left: 50,
        top: 50,
        fill: '#ef4444', // red
        fontSize: 24,
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
        strokeWidth: 2,
        width: 100,
        height: 100,
      });
      canvas.add(rect);
      canvas.setActiveObject(rect);
      canvas.renderAll();
      if (onCanvasChange) onCanvasChange(canvas.toJSON());
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
    }
  }));

  // 1. Render PDF page to image
  useEffect(() => {
    let isMounted = true;
    
    async function renderPdf() {
      try {
        setLoading(true);
        const pdfDoc = await loadPdfDocument(fileBuffer);
        const page = await pdfDoc.getPage(pageNumber);
        
        // Get natural dimensions
        const viewport = page.getViewport({ scale: 1.0 });
        if (isMounted) {
          setDimensions({ width: viewport.width, height: viewport.height });
        }

        // Render at scale
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

    // Cleanup previous canvas
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
    }

    const canvasWidth = dimensions.width * scale;
    const canvasHeight = dimensions.height * scale;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      isDrawingMode: activeTool === 'draw',
    });
    
    if (activeTool === 'draw' && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = '#ef4444';
      canvas.freeDrawingBrush.width = 3;
    }
    
    fabricCanvasRef.current = canvas;

    try {
      fabric.Image.fromURL(bgImage, function(img) {
        // Scale the background image to match the canvas dimensions exactly
        img.set({
          scaleX: canvasWidth / img.width,
          scaleY: canvasHeight / img.height,
          originX: 'left',
          originY: 'top'
        });
        
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));

        // Load initial data if any
        if (initialFabricData) {
          canvas.loadFromJSON(initialFabricData, function() {
            canvas.renderAll();
          });
        }

        // Event listeners to notify parent of changes
        const handleChange = () => {
          if (onCanvasChange) {
            onCanvasChange(canvas.toJSON());
          }
        };

        canvas.on('object:added', handleChange);
        canvas.on('object:modified', handleChange);
        canvas.on('object:removed', handleChange);
        canvas.on('path:created', handleChange);
      });
    } catch (err) {
      console.error('Error initializing fabric canvas:', err);
    }

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgImage, dimensions, scale]); 

  // 3. Handle active tool changes without re-initializing
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = activeTool === 'draw';
    
    if (activeTool === 'draw' && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = '#ef4444';
      canvas.freeDrawingBrush.width = 3;
    }
  }, [activeTool]);

  return (
    <div ref={containerRef} className="relative inline-block border border-slate-700 shadow-md bg-white">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
        </div>
      )}
      <canvas ref={canvasRef} />
    </div>
  );
});

export default PdfCanvas;
