import React, { useState } from 'react';
import ToolPageWrapper from '@/components/common/ToolPageWrapper';
import FileDropzone from '@/components/common/FileDropzone';
import { loadPdfDocument, renderAllThumbnails } from '@/utils/pdfRenderer';
import { readFileAsArrayBuffer, downloadBlob } from '@/utils/fileUtils';
import { PDFDocument, degrees } from '@/utils/pdfEngine';
import { Loader2, RotateCcw, RotateCw, Trash2, Grip, X } from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  rectSortingStrategy,
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: transform ? 1 : 0,
  };

  const { item, onRotate, onDelete } = props;

  return (
    <div ref={setNodeRef} style={style} className={`relative flex flex-col items-center p-2 bg-surface-0 rounded-lg shadow-sm border-2 ${item.deleted ? 'border-red-500 opacity-60' : 'border-surface-200'} transition-opacity`}>
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-2 left-2 cursor-grab active:cursor-grabbing text-surface-400 hover:text-surface-700 p-1 bg-surface-50 rounded shadow-sm z-10"
      >
        <Grip className="w-4 h-4" />
      </div>
      
      <div className="w-full flex justify-end gap-1 mb-2 z-10">
        <button onClick={() => onRotate(item.id, -90)} className="p-1 text-surface-500 hover:bg-surface-100 rounded">
          <RotateCcw className="w-4 h-4" />
        </button>
        <button onClick={() => onRotate(item.id, 90)} className="p-1 text-surface-500 hover:bg-surface-100 rounded">
          <RotateCw className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(item.id)} className={`p-1 rounded ${item.deleted ? 'text-red-500 bg-red-50' : 'text-surface-500 hover:bg-red-50 hover:text-red-500'}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 flex items-center justify-center overflow-hidden w-full h-48 bg-surface-50 rounded mb-2">
        {item.deleted && (
          <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center z-10 pointer-events-none">
            <span className="text-red-600 font-bold bg-white px-2 py-1 rounded">DELETED</span>
          </div>
        )}
        <img 
          src={item.thumbnailUrl} 
          alt={`Page ${item.originalPage}`} 
          style={{ transform: `rotate(${item.rotation}deg)` }}
          className="max-w-full max-h-full object-contain transition-transform duration-300 pointer-events-none" 
        />
      </div>
      
      <div className="text-sm font-medium text-surface-700">
        Page {item.originalPage}
      </div>
    </div>
  );
}

export default function OrganizeTool() {
  const [fileData, setFileData] = useState(null);
  const [pages, setPages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFiles = async (newFiles) => {
    const file = Array.from(newFiles).find(f => f.type === 'application/pdf');
    if (!file) return;

    setIsLoading(true);
    try {
      const buffer = await readFileAsArrayBuffer(file);
      const pdfDoc = await loadPdfDocument(buffer);
      
      const thumbnails = await renderAllThumbnails(pdfDoc, 0.4);
      const initialPages = thumbnails.map((thumb, idx) => ({
        id: `page-${idx + 1}`,
        originalPage: idx + 1,
        thumbnailUrl: thumb,
        rotation: 0,
        deleted: false
      }));

      setPages(initialPages);
      setFileData({
        file,
        buffer,
        name: file.name
      });
    } catch (err) {
      console.error("Failed to load PDF:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRotate = (id, deg) => {
    setPages(pages.map(p => {
      if (p.id === id) {
        return { ...p, rotation: p.rotation + deg };
      }
      return p;
    }));
  };

  const handleDelete = (id) => {
    setPages(pages.map(p => {
      if (p.id === id) {
        return { ...p, deleted: !p.deleted };
      }
      return p;
    }));
  };

  const resetAll = () => {
    setFileData(null);
    setPages([]);
  };

  const handleSave = async () => {
    if (!fileData) return;
    setIsProcessing(true);
    
    try {
      const originalPdf = await PDFDocument.load(fileData.buffer);
      const newPdf = await PDFDocument.create();
      
      const activePages = pages.filter(p => !p.deleted);
      const indices = activePages.map(p => p.originalPage - 1);
      
      const copiedPages = await newPdf.copyPages(originalPdf, indices);
      
      copiedPages.forEach((page, index) => {
        const rotationToAdd = activePages[index].rotation;
        if (rotationToAdd % 360 !== 0) {
          const currentRotation = page.getRotation().angle;
          page.setRotation(degrees(currentRotation + rotationToAdd));
        }
        newPdf.addPage(page);
      });
      
      const savedUint8 = await newPdf.save();
      const blob = new Blob([savedUint8], { type: 'application/pdf' });
      downloadBlob(blob, `organized_${fileData.name}`);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageWrapper title="Organize PDF" description="Rearrange, rotate, and delete pages from a PDF document.">
      <div className="space-y-6 max-w-6xl mx-auto">
        {!fileData ? (
          isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-surface-50 rounded-xl border border-surface-200">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
              <p className="text-surface-600">Rendering PDF pages...</p>
            </div>
          ) : (
            <FileDropzone onFiles={handleFiles} accept={{ 'application/pdf': ['.pdf'] }} />
          )
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-surface-50 rounded-lg border border-surface-200">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{fileData.name}</h3>
                  <p className="text-sm text-surface-500">{pages.filter(p => !p.deleted).length} of {pages.length} pages</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={resetAll} className="btn-secondary">
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={isProcessing || pages.filter(p => !p.deleted).length === 0}
                  className="btn-primary flex items-center gap-2"
                >
                  {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save PDF
                </button>
              </div>
            </div>

            <div className="bg-surface-50 p-6 rounded-xl border border-surface-200">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={pages.map(p => p.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {pages.map((page) => (
                      <SortableItem 
                        key={page.id} 
                        id={page.id} 
                        item={page} 
                        onRotate={handleRotate}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}
      </div>
    </ToolPageWrapper>
  );
}
