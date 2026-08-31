import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { readFileAsArrayBuffer, downloadBlob } from '@/utils/fileUtils';
import FileDropzone from '@/components/common/FileDropzone';
import ToolPageWrapper from '@/components/common/ToolPageWrapper';

export default function EncryptTool() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = (files) => {
    if (files.length > 0) setFile(files[0]);
  };

  const handleEncrypt = async () => {
    if (!file || password !== confirmPassword || password.length === 0) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pdfBytes = await pdfDoc.save({
        userPassword: password,
        ownerPassword: password,
      });
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      downloadBlob(blob, `encrypted_${file.name}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const isValid = password.length > 0 && password === confirmPassword;

  return (
    <ToolPageWrapper title="Encrypt PDF" description="Add a password to your PDF document." icon="🔒">
      {!file ? (
        <FileDropzone accept="application/pdf" label="Drop PDF here" onFiles={handleFiles} />
      ) : (
        <div className="card p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <span className="font-medium text-white truncate max-w-[200px]">{file.name}</span>
            <button onClick={() => setFile(null)} className="text-surface-100 hover:text-white" disabled={isProcessing}>Change File</button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-surface-50">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-surface-0 border border-surface-100 rounded p-2 text-white focus:border-brand-500 focus:outline-none pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-2 text-surface-50 text-sm hover:text-white">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-surface-50">Confirm Password</label>
              <input 
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={`w-full bg-surface-0 border rounded p-2 text-white focus:outline-none ${confirmPassword && password !== confirmPassword ? 'border-rose-500 focus:border-rose-500' : 'border-surface-100 focus:border-brand-500'}`}
              />
              {confirmPassword && password !== confirmPassword && (
                <span className="text-xs text-rose-500">Passwords do not match.</span>
              )}
            </div>
          </div>

          <button onClick={handleEncrypt} disabled={!isValid || isProcessing} className="btn-primary py-3">
            {isProcessing ? 'Encrypting...' : 'Encrypt & Download'}
          </button>
        </div>
      )}
    </ToolPageWrapper>
  );
}
