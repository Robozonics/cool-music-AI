import React, { useState } from 'react';
import { X, Key, AlertCircle, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [isInfoShown] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-[#0a0a0c] border border-acid-lime/30 rounded-2xl p-6 shadow-[0_0_50px_-12px_rgba(204,255,0,0.2)] animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-acid-lime/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-acid-lime" />
          </div>
          <h2 className="text-xl font-bold text-white">API Settings</h2>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-semibold mb-2">🔒 Secure API Handling</p>
              <p>Your Gemini API key is now managed securely on our backend servers. No manual setup needed on your device!</p>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <p className="text-sm text-green-200 font-semibold mb-2">✅ Status: Connected</p>
            <p className="text-xs text-green-300">Backend API proxy is active and ready to use.</p>
          </div>

          <a 
            href="https://aistudio.google.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center text-sm text-gray-400 hover:text-acid-lime transition-colors mt-4 py-3 border border-white/10 rounded-xl hover:border-acid-lime/30"
          >
            Get a Free Gemini API Key
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>

          <button 
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold bg-acid-lime text-obsidian hover:bg-[#b3e600] transition-all"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
