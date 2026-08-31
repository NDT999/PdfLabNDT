import { useCallback, useRef, useState } from 'react';
import { formatBytes } from '@/utils/fileUtils';

/**
 * FileDropzone — Global drag-and-drop + click-to-browse component.
 *
 * Props:
 *   accept       — MIME types string, e.g. "application/pdf" or "image/*"
 *   multiple     — allow multiple files (default: true)
 *   maxSizeMB    — per-file size limit in MB (default: 200)
 *   onFiles      — callback(File[]) when files are selected
 *   label        — custom label text
 *   sublabel     — secondary helper text
 *   children     — optional override content
 */
export default function FileDropzone({
  accept = 'application/pdf',
  multiple = true,
  maxSizeMB = 200,
  onFiles,
  label = 'Drop files here or click to browse',
  sublabel,
  children,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(
    (fileList) => {
      const maxBytes = maxSizeMB * 1024 * 1024;
      const files = Array.from(fileList).filter((f) => f.size <= maxBytes);
      if (files.length > 0 && onFiles) onFiles(files);
    },
    [maxSizeMB, onFiles],
  );

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };
  const onClick = () => inputRef.current?.click();
  const onInputChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = ''; // allow re-selecting same file
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={`dropzone ${isDragging ? 'dropzone-active' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onInputChange}
        className="hidden"
      />

      {children || (
        <>
          <svg
            className="mb-3 h-10 w-10 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
            />
          </svg>
          <p className="text-sm font-medium">{label}</p>
          {sublabel && (
            <p className="mt-1 text-xs text-slate-500">{sublabel}</p>
          )}
          <p className="mt-2 text-xs text-slate-600">
            Max {maxSizeMB} MB per file
          </p>
        </>
      )}
    </div>
  );
}
