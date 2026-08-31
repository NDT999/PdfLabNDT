import React from 'react';
import { Link } from 'react-router-dom';

export default function ToolPageWrapper({ title, description, icon, children }) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div>
        <Link 
          to="/" 
          className="inline-flex items-center text-sm font-medium text-surface-400 hover:text-brand-400 transition-colors mb-4"
        >
          &larr; Back to Tools
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-surface-100 text-2xl shadow-inner-surface border border-surface-0/10">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-surface-50">{title}</h1>
            <p className="text-surface-300 mt-1">{description}</p>
          </div>
        </div>
      </div>
      
      <div className="card">
        {children}
      </div>
    </div>
  );
}
