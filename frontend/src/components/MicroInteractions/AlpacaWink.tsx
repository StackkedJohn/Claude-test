import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { cn } from '../../utils/cn';

interface AlpacaWinkProps {
  trigger?: boolean;
  onWinkComplete?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  autoWink?: boolean;
  winkInterval?: number; // milliseconds
  playSound?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const AlpacaWink: React.FC<AlpacaWinkProps> = ({
  trigger = false,
  onWinkComplete,
  size = 'md',
  className,
  autoWink = false,
  winkInterval = 5000,
  playSound = false
}) => {
  const [isWinking, setIsWinking] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const controls = useAnimation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoWinkTimer = useRef<NodeJS.Timeout>();

  // Initialize audio for wink sound effect
  useEffect(() => {
    if (playSound) {
      audioRef.current = new Audio('/sounds/wink.mp3'); // You would add this sound file
      audioRef.current.volume = 0.3;
    }
  }, [playSound]);

  // Auto-wink timer
  useEffect(() => {
    if (autoWink) {
      const startAutoWink = () => {
        autoWinkTimer.current = setInterval(() => {
          if (!isWinking) {
            performWink();
          }
        }, winkInterval);
      };

      startAutoWink();

      return () => {
        if (autoWinkTimer.current) {
          clearInterval(autoWinkTimer.current);
        }
      };
    }
  }, [autoWink, winkInterval, isWinking]);

  // Trigger wink when prop changes
  useEffect(() => {
    if (trigger && !isWinking) {
      performWink();
    }
  }, [trigger, isWinking]);

  const performWink = async () => {
    if (isWinking) return;

    setIsWinking(true);
    setShowSparkles(true);

    // Play sound effect
    if (playSound && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
      } catch (error) {
        console.log('Could not play wink sound:', error);
      }
    }

    // Animate the wink
    await controls.start({
      scaleY: [1, 0.1, 1],
      transition: {
        duration: 0.6,
        times: [0, 0.5, 1],
        ease: 'easeInOut'
      }
    });

    setTimeout(() => {
      setShowSparkles(false);
    }, 1500);

    setIsWinking(false);
    onWinkComplete?.();
  };

  return (
    <div className={cn("relative inline-block", sizeClasses[size], className)}>
      {/* Main Alpaca Face */}
      <motion.div
        className="relative w-full h-full"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Alpaca Head */}
        <div className="relative w-full h-full bg-gradient-to-br from-pink-200 to-pink-300 rounded-full border-2 border-pink-400 shadow-lg overflow-hidden">
          {/* Alpaca Ears */}
          <div className="absolute -top-2 left-1/4 w-3 h-4 bg-pink-300 rounded-full transform -rotate-12" />
          <div className="absolute -top-2 right-1/4 w-3 h-4 bg-pink-300 rounded-full transform rotate-12" />
          
          {/* Alpaca Eyes */}
          <div className="absolute top-1/3 left-1/4 flex items-center justify-center">
            <motion.div
              animate={controls}
              className="w-2 h-2 bg-black rounded-full"
            />
          </div>
          
          <div className="absolute top-1/3 right-1/4">
            <motion.div
              className="w-2 h-2 bg-black rounded-full"
              animate={isWinking ? {
                scaleY: [1, 0.1, 1],
                scaleX: [1, 1.2, 1],
                transition: { duration: 0.6, ease: 'easeInOut' }
              } : {}}
            />
          </div>

          {/* Alpaca Nose */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-pink-600 rounded-full" />

          {/* Alpaca Mouth */}
          <motion.div
            className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 w-3 h-1 border-b-2 border-pink-600 rounded-full"
            animate={isWinking ? {
              rotate: [0, 15, -15, 0],
              transition: { duration: 0.6 }
            } : {}}
          />

          {/* Cheek Blush (appears during wink) */}
          <AnimatePresence>
            {isWinking && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.7, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute top-1/2 right-2 w-2 h-1 bg-pink-400 rounded-full blur-sm"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Sparkles Effect */}
        <AnimatePresence>
          {showSparkles && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    opacity: 0, 
                    scale: 0,
                    x: '0%',
                    y: '0%',
                    rotate: 0
                  }}
                  animate={{ 
                    opacity: [0, 1, 0], 
                    scale: [0, 1, 0.5],
                    x: `${(Math.random() - 0.5) * 200}%`,
                    y: `${(Math.random() - 0.5) * 200}%`,
                    rotate: Math.random() * 360
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{
                    duration: 1.5,
                    delay: Math.random() * 0.5,
                    ease: 'easeOut'
                  }}
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                >
                  <div className="w-1 h-1 bg-yellow-400 rounded-full shadow-lg" />
                  <div className="absolute inset-0 w-1 h-1 bg-yellow-300 rounded-full animate-ping" />
                </motion.div>
              ))}
              
              {/* Heart particle */}
              <motion.div
                initial={{ opacity: 0, scale: 0, y: 0 }}
                animate={{ 
                  opacity: [0, 1, 0], 
                  scale: [0, 1, 0],
                  y: -50
                }}
                transition={{ duration: 2, ease: 'easeOut' }}
                className="absolute top-0 left-1/2 transform -translate-x-1/2 text-pink-500 text-lg"
              >
                ❤️
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Hover tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          whileHover={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none"
        >
          Click me! 😉
        </motion.div>
      </motion.div>

      {/* Ripple Effect on Click */}
      <AnimatePresence>
        {isWinking && (
          <motion.div
            initial={{ opacity: 0.6, scale: 0 }}
            animate={{ opacity: 0, scale: 3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute inset-0 border-2 border-pink-400 rounded-full pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Enhanced version with more detailed alpaca
const DetailedAlpacaWink: React.FC<AlpacaWinkProps> = (props) => {
  return (
    <div className={cn("relative", sizeClasses[props.size || 'md'])}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Alpaca body/neck */}
        <ellipse cx="50" cy="80" rx="15" ry="20" fill="#f3e8ff" stroke="#e879f9" strokeWidth="1"/>
        
        {/* Alpaca head */}
        <ellipse cx="50" cy="50" rx="25" ry="20" fill="#fae8ff" stroke="#ec4899" strokeWidth="1.5"/>
        
        {/* Alpaca ears */}
        <ellipse cx="35" cy="35" rx="6" ry="10" fill="#f3e8ff" stroke="#e879f9" strokeWidth="1" transform="rotate(-20 35 35)"/>
        <ellipse cx="65" cy="35" rx="6" ry="10" fill="#f3e8ff" stroke="#e879f9" strokeWidth="1" transform="rotate(20 65 35)"/>
        
        {/* Alpaca fluff on top */}
        <circle cx="45" cy="30" r="4" fill="#fae8ff"/>
        <circle cx="50" cy="25" r="5" fill="#fae8ff"/>
        <circle cx="55" cy="30" r="4" fill="#fae8ff"/>
        
        {/* Eyes */}
        <motion.ellipse
          cx="42" 
          cy="45" 
          rx="3" 
          ry="2" 
          fill="#000"
          animate={props.trigger ? {
            scaleY: [1, 0.1, 1],
            transition: { duration: 0.6 }
          } : {}}
        />
        <ellipse cx="58" cy="45" rx="3" ry="2" fill="#000"/>
        
        {/* Nose */}
        <ellipse cx="50" cy="52" rx="2" ry="1" fill="#ec4899"/>
        
        {/* Mouth */}
        <path d="M47 57 Q50 60 53 57" stroke="#ec4899" strokeWidth="1" fill="none"/>
        
        {/* Nostrils */}
        <circle cx="48" cy="52" r="0.5" fill="#be185d"/>
        <circle cx="52" cy="52" r="0.5" fill="#be185d"/>
      </svg>
      
      <AlpacaWink {...props} className="absolute inset-0 opacity-0" />
    </div>
  );
};

// Export both versions
export { AlpacaWink, DetailedAlpacaWink };