import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-800 px-4 py-4 text-center text-xs text-slate-500">
        PdfLab NDT — 100% offline &amp; client-side. Your files never leave your device.
      </footer>
    </div>
  );
}
