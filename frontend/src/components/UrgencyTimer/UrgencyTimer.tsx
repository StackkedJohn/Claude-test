import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClockIcon, FireIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface UrgencyTimerProps {
  endTime: Date;
  message: string;
  className?: string;
  variant?: 'default' | 'compact' | 'prominent';
  onExpire?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const UrgencyTimer: React.FC<UrgencyTimerProps> = ({
  endTime,
  message,
  className,
  variant = 'default',
  onExpire
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const endTimeStamp = endTime.getTime();
      const difference = endTimeStamp - now;

      if (difference <= 0) {
        setIsExpired(true);
        onExpire?.();
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, onExpire]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  // Different urgency levels based on time remaining
  const totalMinutesLeft = timeLeft.days * 24 * 60 + timeLeft.hours * 60 + timeLeft.minutes;
  const urgencyLevel = totalMinutesLeft <= 30 ? 'critical' : 
                      totalMinutesLeft <= 180 ? 'high' : 
                      totalMinutesLeft <= 1440 ? 'medium' : 'low';

  const getVariantStyles = () => {
    const baseStyles = "relative overflow-hidden rounded-2xl border backdrop-blur-sm";
    
    switch (variant) {
      case 'compact':
        return cn(baseStyles, "p-3");
      case 'prominent':
        return cn(baseStyles, "p-6 lg:p-8");
      default:
        return cn(baseStyles, "p-4");
    }
  };

  const getUrgencyStyles = () => {
    switch (urgencyLevel) {
      case 'critical':
        return {
          bg: 'bg-gradient-to-r from-red-500/90 to-orange-500/90',
          border: 'border-red-400/50',
          text: 'text-white',
          shadow: 'shadow-lg shadow-red-500/25',
          pulse: true
        };
      case 'high':
        return {
          bg: 'bg-gradient-to-r from-orange-500/90 to-yellow-500/90',
          border: 'border-orange-400/50',
          text: 'text-white',
          shadow: 'shadow-lg shadow-orange-500/25',
          pulse: false
        };
      case 'medium':
        return {
          bg: 'bg-gradient-to-r from-yellow-500/90 to-amber-500/90',
          border: 'border-yellow-400/50',
          text: 'text-gray-900',
          shadow: 'shadow-lg shadow-yellow-500/25',
          pulse: false
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-primary-500/90 to-secondary-500/90',
          border: 'border-primary-400/50',
          text: 'text-white',
          shadow: 'shadow-lg shadow-primary-500/25',
          pulse: false
        };
    }
  };

  if (isExpired || !isVisible) {
    return null;
  }

  const urgencyStyles = getUrgencyStyles();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          ...(urgencyStyles.pulse && {
            scale: [1, 1.02, 1],
            transition: { 
              scale: { repeat: Infinity, duration: 2 }
            }
          })
        }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          getVariantStyles(),
          urgencyStyles.bg,
          urgencyStyles.border,
          urgencyStyles.shadow,
          urgencyStyles.text,
          className
        )}
      >
        {/* Background Animation */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              repeatType: "loop",
              ease: "linear"
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Icon with animation */}
              <motion.div
                animate={urgencyStyles.pulse ? { 
                  rotate: [0, -10, 10, 0],
                  scale: [1, 1.1, 1]
                } : {}}
                transition={{ 
                  duration: 2,
                  repeat: urgencyStyles.pulse ? Infinity : 0
                }}
                className="flex items-center justify-center"
              >
                {urgencyLevel === 'critical' ? (
                  <FireIcon className="h-6 w-6" />
                ) : (
                  <ClockIcon className="h-6 w-6" />
                )}
              </motion.div>

              {/* Message */}
              <div className="flex flex-col">
                <span className={cn(
                  "font-bold",
                  variant === 'prominent' ? "text-lg lg:text-xl" : "text-sm lg:text-base"
                )}>
                  {message}
                </span>
                {variant === 'prominent' && (
                  <span className="text-sm opacity-90">
                    {urgencyLevel === 'critical' ? 'Hurry! Time is running out!' :
                     urgencyLevel === 'high' ? 'Limited time remaining' :
                     'Don\'t miss out on this deal'}
                  </span>
                )}
              </div>
            </div>

            {/* Dismiss Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleDismiss}
              className="opacity-60 hover:opacity-100 transition-opacity duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>

          {/* Timer Display */}
          <div className="mt-4 flex items-center justify-center gap-2 lg:gap-4">
            {timeLeft.days > 0 && (
              <TimeUnit 
                value={timeLeft.days} 
                label="Days" 
                variant={variant}
                critical={urgencyLevel === 'critical'}
              />
            )}
            <TimeUnit 
              value={timeLeft.hours} 
              label="Hours" 
              variant={variant}
              critical={urgencyLevel === 'critical'}
            />
            <TimeSeparator critical={urgencyLevel === 'critical'} />
            <TimeUnit 
              value={timeLeft.minutes} 
              label="Min" 
              variant={variant}
              critical={urgencyLevel === 'critical'}
            />
            <TimeSeparator critical={urgencyLevel === 'critical'} />
            <TimeUnit 
              value={timeLeft.seconds} 
              label="Sec" 
              variant={variant}
              critical={urgencyLevel === 'critical'}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

interface TimeUnitProps {
  value: number;
  label: string;
  variant: 'default' | 'compact' | 'prominent';
  critical: boolean;
}

const TimeUnit: React.FC<TimeUnitProps> = ({ value, label, variant, critical }) => {
  return (
    <motion.div
      key={value} // Re-mount on value change for animation
      initial={{ scale: 1 }}
      animate={critical && value !== undefined ? { 
        scale: [1, 1.15, 1],
        transition: { duration: 0.3 }
      } : {}}
      className="text-center"
    >
      <motion.div
        className={cn(
          "font-bold tabular-nums bg-black/20 rounded-lg px-2 py-1 min-w-[2.5rem] backdrop-blur-sm",
          variant === 'prominent' ? "text-2xl lg:text-3xl px-3 py-2" :
          variant === 'compact' ? "text-base px-2 py-1" : "text-xl px-2 py-1"
        )}
      >
        {value.toString().padStart(2, '0')}
      </motion.div>
      <div className={cn(
        "font-medium uppercase tracking-wide opacity-90",
        variant === 'prominent' ? "text-xs mt-1" : "text-xs mt-0.5"
      )}>
        {label}
      </div>
    </motion.div>
  );
};

const TimeSeparator: React.FC<{ critical: boolean }> = ({ critical }) => {
  return (
    <motion.div
      animate={critical ? {
        opacity: [1, 0.3, 1],
        transition: { duration: 1, repeat: Infinity }
      } : {}}
      className="text-xl font-bold"
    >
      :
    </motion.div>
  );
};

export { UrgencyTimer };