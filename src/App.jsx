import { Routes, Route } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';

// Layout
import Layout from '@/components/layout/Layout';

// Pages — lazy-loaded in STEP 2+
import Dashboard from '@/components/dashboard/Dashboard';

// Lazy-loaded tools
const MergeTool = lazy(() => import('@/components/merge/MergeTool'));
const SplitTool = lazy(() => import('@/components/split/SplitTool'));
const OrganizeTool = lazy(() => import('@/components/organize/OrganizeTool'));
const OcrTool = lazy(() => import('@/components/ocr/OcrTool'));
const ImageToPdf = lazy(() => import('@/components/convert/ImageToPdf'));
const PdfToImages = lazy(() => import('@/components/convert/PdfToImages'));
const EncryptTool = lazy(() => import('@/components/security/EncryptTool'));
const WatermarkTool = lazy(() => import('@/components/security/WatermarkTool'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center p-12">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
  </div>
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        
        {/* Tool routes */}
        <Route path="merge" element={<Suspense fallback={<LoadingFallback />}><MergeTool /></Suspense>} />
        <Route path="split" element={<Suspense fallback={<LoadingFallback />}><SplitTool /></Suspense>} />
        <Route path="organize" element={<Suspense fallback={<LoadingFallback />}><OrganizeTool /></Suspense>} />
        <Route path="ocr" element={<Suspense fallback={<LoadingFallback />}><OcrTool /></Suspense>} />
        <Route path="image-to-pdf" element={<Suspense fallback={<LoadingFallback />}><ImageToPdf /></Suspense>} />
        <Route path="pdf-to-images" element={<Suspense fallback={<LoadingFallback />}><PdfToImages /></Suspense>} />
        <Route path="encrypt" element={<Suspense fallback={<LoadingFallback />}><EncryptTool /></Suspense>} />
        <Route path="watermark" element={<Suspense fallback={<LoadingFallback />}><WatermarkTool /></Suspense>} />
      </Route>
    </Routes>
  );
}
