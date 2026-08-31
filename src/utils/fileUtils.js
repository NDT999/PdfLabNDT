/**
 * fileUtils.js
 * Common helpers for reading files, downloading blobs, etc.
 */

/**
 * Read a File object as an ArrayBuffer.
 * @param {File} file
 * @returns {Promise<ArrayBuffer>}
 */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Read a File object as a data URL (base64).
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Trigger a browser download from a Uint8Array / ArrayBuffer.
 * @param {Uint8Array | ArrayBuffer} data
 * @param {string} filename
 * @param {string} [mimeType='application/pdf']
 */
export function downloadBlob(data, filename, mimeType = 'application/pdf') {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Format bytes to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Filter a FileList / File[] to only accepted MIME types.
 * @param {FileList | File[]} files
 * @param {string[]} acceptedTypes  e.g. ['application/pdf', 'image/png']
 * @returns {File[]}
 */
export function filterFilesByType(files, acceptedTypes) {
  return Array.from(files).filter((f) => acceptedTypes.includes(f.type));
}
