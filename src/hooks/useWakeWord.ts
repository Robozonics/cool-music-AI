import { useEffect, useState, useRef } from 'react';

export const useWakeWord = (onWakeWordDetected: (command: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isEnabledRef = useRef(false);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    // For English primarily, but can adapt
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript.toLowerCase().trim();

      // Check for wake word variations
      const wakeWords = ['hey musify', 'hey music', 'music by', 'play music'];
      
      let wakeWordMatched = false;
      let command = '';

      for (const word of wakeWords) {
        if (transcript.includes(word)) {
          wakeWordMatched = true;
          // Extract the command after the wake word
          const splitIndex = transcript.indexOf(word) + word.length;
          command = transcript.substring(splitIndex).trim();
          break;
        }
      }

      if (wakeWordMatched) {
        // Stop momentarily so it doesn't double trigger while processing
        recognition.stop();
        onWakeWordDetected(command);
        
        // Restart after a brief delay
        setTimeout(() => {
          if (isEnabledRef.current) {
            try {
              recognition.start();
            } catch (e) {}
          }
        }, 1500);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setIsListening(false);
        isEnabledRef.current = false;
      }
    };

    recognition.onend = () => {
      if (isEnabledRef.current) {
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
          isEnabledRef.current = false;
        }
      } else {
        setIsListening(false);
      }
    };

    return () => {
      isEnabledRef.current = false;
      recognition.stop();
    };
  }, [onWakeWordDetected]);

  const toggleWakeWord = () => {
    if (isListening) {
      isEnabledRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        alert("Voice recognition is not supported on this browser. Try Chrome or Android.");
        return;
      }
      isEnabledRef.current = true;
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Could not start wake word listening', e);
        alert("Could not start microphone. Please check permissions.");
      }
    }
  };

  return { isListening, toggleWakeWord };
};
