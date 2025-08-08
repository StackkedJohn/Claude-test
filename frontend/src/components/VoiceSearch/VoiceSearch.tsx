import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MicrophoneIcon,
  StopIcon,
  SpeakerWaveIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface VoiceSearchProps {
  onTranscript: (transcript: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  className?: string;
}

interface SpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
    };
  };
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const VoiceSearch: React.FC<VoiceSearchProps> = ({
  onTranscript,
  onError,
  placeholder = "Try saying 'Find large ice packs for camping'",
  className
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setIsSupported(true);
        const recognitionInstance = new SpeechRecognition();
        
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';
        recognitionInstance.maxAlternatives = 1;

        recognitionInstance.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.results.length - 1; i >= 0; i--) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript = result[0].transcript;
            } else {
              interimTranscript = result[0].transcript;
            }
          }

          setTranscript(finalTranscript);
          setInterimTranscript(interimTranscript);

          if (finalTranscript) {
            // Process natural language commands
            const processedQuery = processVoiceQuery(finalTranscript);
            onTranscript(processedQuery);
          }
        };

        recognitionInstance.onerror = (event) => {
          const errorMessage = getErrorMessage(event.error);
          setError(errorMessage);
          onError?.(errorMessage);
          setIsListening(false);
        };

        recognitionInstance.onend = () => {
          setIsListening(false);
          setInterimTranscript('');
        };

        setRecognition(recognitionInstance);
      }
    }
  }, [onTranscript, onError]);

  const processVoiceQuery = useCallback((query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    // Natural language processing for product search
    const patterns = [
      // Size patterns
      { pattern: /\b(small|little|compact|mini)\b/i, replacement: 'small' },
      { pattern: /\b(medium|mid|middle)\b/i, replacement: 'medium' },
      { pattern: /\b(large|big|huge|xl|extra large)\b/i, replacement: 'large' },
      { pattern: /\b(bundle|set|pack|combo)\b/i, replacement: 'bundle' },
      
      // Use case patterns
      { pattern: /\b(camp|camping|tent|hiking|backpack)\b/i, replacement: 'camping' },
      { pattern: /\b(boat|marine|sailing|yacht|fishing)\b/i, replacement: 'marine' },
      { pattern: /\b(lunch|lunchbox|school|work|office)\b/i, replacement: 'lunch' },
      { pattern: /\b(picnic|bbq|barbecue|park|outdoor)\b/i, replacement: 'picnic' },
      { pattern: /\b(sport|sports|game|event|tournament)\b/i, replacement: 'sports' },
      { pattern: /\b(medical|injury|recovery|therapy)\b/i, replacement: 'medical' },
      
      // Action patterns
      { pattern: /\b(find|show|search|look)\s+(me\s+)?(for\s+)?/i, replacement: '' },
      { pattern: /\bi\s+(need|want|am looking for)\s+/i, replacement: '' },
      { pattern: /\bice\s+pack(s)?\b/i, replacement: 'icepaca' },
    ];

    let processedQuery = query;
    
    patterns.forEach(({ pattern, replacement }) => {
      processedQuery = processedQuery.replace(pattern, replacement);
    });

    // Clean up extra spaces
    processedQuery = processedQuery.replace(/\s+/g, ' ').trim();
    
    return processedQuery;
  }, []);

  const getErrorMessage = (error: string): string => {
    switch (error) {
      case 'no-speech':
        return 'No speech detected. Please try again.';
      case 'audio-capture':
        return 'Microphone not accessible. Please check permissions.';
      case 'not-allowed':
        return 'Microphone permission denied. Please enable it in browser settings.';
      case 'network':
        return 'Network error. Please check your connection.';
      case 'service-not-allowed':
        return 'Speech recognition service not available.';
      default:
        return 'Speech recognition error. Please try again.';
    }
  };

  const startListening = () => {
    if (recognition && !isListening) {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  };

  if (!isSupported) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400",
        className
      )}>
        <ExclamationTriangleIcon className="h-4 w-4" />
        Voice search not supported in this browser
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Voice Search Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isListening ? stopListening : startListening}
        className={cn(
          "relative flex items-center gap-3 px-6 py-3 rounded-2xl font-medium transition-all duration-300",
          "border-2 border-transparent",
          "focus-ring",
          isListening 
            ? "bg-red-500 text-white shadow-lg shadow-red-500/25" 
            : "bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white shadow-depth-2 hover:shadow-depth-3"
        )}
        disabled={!isSupported}
      >
        <motion.div
          animate={isListening ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
          transition={{ repeat: isListening ? Infinity : 0, duration: 1 }}
        >
          {isListening ? (
            <StopIcon className="h-5 w-5" />
          ) : (
            <MicrophoneIcon className="h-5 w-5" />
          )}
        </motion.div>

        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold">
            {isListening ? 'Listening...' : 'Voice Search'}
          </span>
          {!isListening && (
            <span className="text-xs text-gray-500">
              Click to speak
            </span>
          )}
        </div>

        {/* Listening Animation */}
        {isListening && (
          <div className="absolute -inset-2 rounded-2xl">
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-red-400"
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          </div>
        )}

        {/* Sound Wave Animation */}
        {isListening && (
          <div className="absolute -right-12 flex items-center gap-1">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-red-400 rounded-full"
                animate={{ 
                  height: [4, 16, 4],
                  opacity: [0.4, 1, 0.4] 
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 0.8, 
                  delay: i * 0.1 
                }}
              />
            ))}
          </div>
        )}
      </motion.button>

      {/* Transcript Display */}
      <AnimatePresence>
        {(transcript || interimTranscript) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full mt-3 left-1/2 transform -translate-x-1/2 w-max max-w-md z-50"
          >
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-depth-4 border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start gap-3">
                <SpeakerWaveIcon className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Voice Input:
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {transcript && (
                      <span className="text-gray-900 dark:text-white font-medium">
                        {transcript}
                      </span>
                    )}
                    {interimTranscript && (
                      <span className="text-gray-500 dark:text-gray-500 italic">
                        {interimTranscript}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-3 left-1/2 transform -translate-x-1/2 w-max max-w-sm z-50"
          >
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Placeholder Text */}
      {!isListening && !transcript && (
        <div className="absolute top-full mt-3 left-1/2 transform -translate-x-1/2 w-max">
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
            {placeholder}
          </div>
        </div>
      )}
    </div>
  );
};

export { VoiceSearch };