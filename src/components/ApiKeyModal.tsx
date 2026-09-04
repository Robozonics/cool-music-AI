import React, { useState, useEffect } from 'react';
import { X, Key, CheckCircle, ExternalLink } from 'lucide-react';
import { getGeminiKey, saveGeminiKey } from '../services/keyManager';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [keyInput, setKeyInput] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getGeminiKey().then(k => {
        if (k) setKeyInput(k);
        setIsSaved(!!k);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (keyInput.trim()) {
      await saveGeminiKey(keyInput.trim());
      setIsSaved(true);
      setTimeout(() => {
        onClose();
        setIsSaved(false);
      }, 1000);
    }
  };

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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Gemini API Key
            </label>
            <input 
              type="password"
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                setIsSaved(false);
              }}
              placeholder="Paste your Gemini API Key here"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-acid-lime focus:ring-1 focus:ring-acid-lime transition-all"
            />
          </div>

          <a 
            href="https://aistudio.google.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center text-sm text-gray-400 hover:text-acid-lime transition-colors mt-2"
          >
            Get a 100% Free API Key from Google AI Studio (No Credit Card Required)
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>

          <button 
            onClick={handleSave}
            disabled={!keyInput.trim()}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center transition-all ${
              isSaved 
                ? 'bg-green-500 text-white' 
                : keyInput.trim() 
                  ? 'bg-acid-lime text-obsidian hover:bg-[#b3e600]' 
                  : 'bg-white/10 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSaved ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Key Saved!
              </>
            ) : (
              'Save Key'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
