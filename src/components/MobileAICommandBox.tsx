import { useState, useRef, useEffect } from 'react';
import { Mic, Send, X, Loader2 } from 'lucide-react';
import { useAICommandProcessor } from '../hooks/useAICommandProcessor';
import { motion, AnimatePresence } from 'framer-motion';

export const MobileAICommandBox = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { isProcessing, processCommand } = useAICommandProcessor();

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setText(transcript);
        setIsRecording(false);
        handleProcessCommand(transcript);
      };

      recognitionRef.current.onerror = () => {
        setIsRecording(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
      }
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!recognitionRef.current) {
        alert("Voice recognition is not supported on this browser. Try Chrome or Android.");
        return;
      }
      setText('');
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        console.warn('Speech recognition start failed', e);
        alert("Could not start microphone. Please check permissions.");
      }
    }
  };

  const handleProcessCommand = async (commandToProcess: string = text) => {
    await processCommand(commandToProcess, undefined);
    setText('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0, y: -10 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -10 }}
          className="px-6 py-2 overflow-hidden"
        >
          <div className="bg-white/5 border border-purple-500/30 rounded-2xl p-2 flex items-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.15)] relative">
            <button 
              onClick={toggleRecording}
              className={`p-2 rounded-xl transition-all flex-shrink-0 ${isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'}`}
              title="Voice Command"
            >
              <Mic className="w-5 h-5" />
            </button>
            <input 
              type="text" 
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Drop some heat... (no cap) 🔥"
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none px-2 min-w-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleProcessCommand();
              }}
              disabled={isProcessing || isRecording}
            />
            {isProcessing ? (
              <div className="p-2 text-acid-lime shrink-0">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (
              <button 
                onClick={() => handleProcessCommand()}
                disabled={!text.trim()}
                className="p-2 bg-acid-lime text-black rounded-xl hover:bg-acid-lime/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                title="Send Command"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
            
            {/* Close button */}
            <button 
              onClick={onClose} 
              className="absolute -top-2 -right-2 bg-zinc-800 text-zinc-400 p-1 rounded-full border border-white/10 hover:text-white hover:bg-zinc-700"
            >
               <X className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
