import { Link } from 'react-router-dom';

/*
 * Dashboard — Grid of tool cards.
 * Routes will be wired up as each tool module is implemented.
 */

const TOOL_CATEGORIES = [
  {
    title: 'Organize & Modify',
    tools: [
      {
        name: 'Merge PDFs',
        desc: 'Combine multiple PDFs into a single document.',
        icon: '📎',
        path: '/merge',
        color: 'brand',
      },
      {
        name: 'Split PDF',
        desc: 'Extract pages or split by range.',
        icon: '✂️',
        path: '/split',
        color: 'brand',
      },
      {
        name: 'Rearrange Pages',
        desc: 'Drag-and-drop to reorder, rotate, or delete pages.',
        icon: '🔀',
        path: '/organize',
        color: 'brand',
      },
      {
        name: 'Advanced Editor',
        desc: 'Visually add text, images, shapes, and signatures.',
        icon: '✏️',
        path: '/editor',
        color: 'brand',
      },
    ],
  },
  {
    title: 'OCR & Text',
    tools: [
      {
        name: 'OCR — Extract Text',
        desc: 'Recognize text from scanned PDFs or images.',
        icon: '🔍',
        path: '/ocr',
        color: 'amber',
      },
    ],
  },
  {
    title: 'Convert',
    tools: [
      {
        name: 'Images → PDF',
        desc: 'Convert JPG / PNG images into a PDF.',
        icon: '🖼️',
        path: '/image-to-pdf',
        color: 'emerald',
      },
      {
        name: 'PDF → Images',
        desc: 'Export each page as a PNG image (ZIP).',
        icon: '📸',
        path: '/pdf-to-images',
        color: 'emerald',
      },
    ],
  },
  {
    title: 'Security & Watermark',
    tools: [
      {
        name: 'Encrypt PDF',
        desc: 'Add a password to protect your PDF.',
        icon: '🔒',
        path: '/encrypt',
        color: 'rose',
      },
      {
        name: 'Watermark',
        desc: 'Add text or image watermarks with adjustable opacity.',
        icon: '💧',
        path: '/watermark',
        color: 'rose',
      },
    ],
  },
];

const colorMap = {
  brand:   'border-brand-500/30 hover:border-brand-400 hover:shadow-brand-500/10',
  amber:   'border-amber-500/30 hover:border-amber-400 hover:shadow-amber-500/10',
  emerald: 'border-emerald-500/30 hover:border-emerald-400 hover:shadow-emerald-500/10',
  rose:    'border-rose-500/30 hover:border-rose-400 hover:shadow-rose-500/10',
};

const iconBgMap = {
  brand:   'bg-brand-500/15 text-brand-400',
  amber:   'bg-amber-500/15 text-amber-400',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  rose:    'bg-rose-500/15 text-rose-400',
};

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Your Offline PDF Toolkit
        </h1>
        <p className="mt-3 text-base text-slate-400 sm:text-lg">
          All processing happens in your browser. Nothing is uploaded — ever.
        </p>
      </section>

      {/* Tool categories */}
      {TOOL_CATEGORIES.map((cat) => (
        <section key={cat.title}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            {cat.title}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cat.tools.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                className={`group flex flex-col rounded-xl border bg-surface-50 p-5 shadow-lg transition-all duration-200 hover:shadow-xl ${colorMap[tool.color]}`}
              >
                <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-lg text-xl ${iconBgMap[tool.color]}`}>
                  {tool.icon}
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-brand-300">
                  {tool.name}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  {tool.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
