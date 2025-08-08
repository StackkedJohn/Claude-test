import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  CubeIcon,
  SparklesIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import AIChatbot from './Chat/AIChatbot';
import ARPreview from './AR/ARPreview';
import PrivacyConsent from './Privacy/PrivacyConsent';
import { cn } from '../utils/cn';

interface FloatingAIAssistantProps {
  currentProduct?: {
    _id: string;
    name: string;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    image: string;
    price: number;
  };
  onProductClick?: (productId: string) => void;
}

interface ConsentSettings {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  aiFeatures: boolean;
}

const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({ 
  currentProduct, 
  onProductClick 
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAROpen, setIsAROpen] = useState(false);
  const [showPrivacyConsent, setShowPrivacyConsent] = useState(false);
  const [consentGiven, setConsentGiven] = useState<ConsentSettings | null>(null);
  const [sessionId] = useState(() => `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'info' | 'success' | 'warning';
    message: string;
    timestamp: Date;
  }>>([]);

  // Check for existing consent on mount
  useEffect(() => {
    const savedConsent = localStorage.getItem('icepaca_privacy_consent');
    const consentTimestamp = localStorage.getItem('icepaca_consent_timestamp');
    
    if (savedConsent && consentTimestamp) {
      try {
        const consent = JSON.parse(savedConsent);
        const timestamp = new Date(consentTimestamp);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        if (timestamp > thirtyDaysAgo) {
          setConsentGiven(consent);
          initializeServices(consent);
        } else {
          // Consent expired, ask again
          setShowPrivacyConsent(true);
        }
      } catch (error) {
        console.error('Error loading consent:', error);
        setShowPrivacyConsent(true);
      }
    } else {
      // First-time visitor
      setTimeout(() => setShowPrivacyConsent(true), 2000);
    }
  }, []);

  // Initialize AI services based on consent
  const initializeServices = async (consent: ConsentSettings) => {
    try {
      if (consent.personalization || consent.aiFeatures) {
        // Initialize personalization session
        await fetch('/api/ai/personalization/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId,
            deviceInfo: getDeviceInfo(),
            location: await getLocationInfo(),
            utmParams: getUTMParams()
          })
        });

        // Update consent preferences
        await fetch('/api/ai/personalization/consent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId,
            consent: {
              analytics: consent.analytics,
              marketing: consent.marketing,
              personalization: consent.personalization
            }
          })
        });
      }

      // Track page view if analytics enabled
      if (consent.analytics) {
        trackEvent('page_view', {
          page: window.location.pathname,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error initializing services:', error);
    }
  };

  // Handle consent decision
  const handleConsentGiven = (consent: ConsentSettings) => {
    setConsentGiven(consent);
    setShowPrivacyConsent(false);
    initializeServices(consent);
    
    // Show welcome notification
    addNotification('success', 'AI features enabled! Ask me anything about ICEPACA products.');
  };

  const handleConsentDeclined = () => {
    const minimalConsent: ConsentSettings = {
      essential: true,
      analytics: false,
      marketing: false,
      personalization: false,
      aiFeatures: false
    };
    
    setConsentGiven(minimalConsent);
    setShowPrivacyConsent(false);
    
    addNotification('info', 'Essential functions only. You can enable AI features anytime in settings.');
  };

  // Track user events
  const trackEvent = async (type: string, data: any) => {
    if (!consentGiven?.analytics && !consentGiven?.personalization) return;

    try {
      await fetch('/api/ai/personalization/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          event: {
            type,
            data: {
              ...data,
              timestamp: new Date(),
              url: window.location.href
            }
          }
        })
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  };

  // Get device information
  const getDeviceInfo = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad/i.test(navigator.userAgent) || (isMobile && window.screen.width > 600);
    
    return {
      type: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
      os: navigator.platform || 'unknown',
      browser: navigator.userAgent.split(' ').slice(-1)[0] || 'unknown',
      screenResolution: `${screen.width}x${screen.height}`
    };
  };

  // Get location info (with permission)
  const getLocationInfo = async () => {
    try {
      // In production, you might use IP geolocation or browser geolocation API
      return {
        country: 'US',
        state: 'CA',
        city: 'Unknown',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    } catch (error) {
      return null;
    }
  };

  // Get UTM parameters from URL
  const getUTMParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source') || undefined,
      medium: params.get('utm_medium') || undefined,
      campaign: params.get('utm_campaign') || undefined,
      term: params.get('utm_term') || undefined,
      content: params.get('utm_content') || undefined
    };
  };

  // Add notification
  const addNotification = (type: 'info' | 'success' | 'warning', message: string) => {
    const notification = {
      id: `notif_${Date.now()}`,
      type,
      message,
      timestamp: new Date()
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  // Handle chat button click
  const handleChatClick = () => {
    if (consentGiven?.aiFeatures) {
      setIsChatOpen(!isChatOpen);
      trackEvent('ai_feature_used', { feature: 'chatbot' });
    } else {
      addNotification('warning', 'Please enable AI features to use the chatbot.');
    }
  };

  // Handle AR button click
  const handleARClick = () => {
    if (!currentProduct) {
      addNotification('info', 'Please select a product to use AR preview.');
      return;
    }

    if (consentGiven?.aiFeatures) {
      setIsAROpen(true);
      trackEvent('ai_feature_used', { feature: 'ar_preview', product: currentProduct._id });
    } else {
      addNotification('warning', 'Please enable AI features to use AR preview.');
    }
  };

  return (
    <>
      {/* Privacy Consent Modal */}
      <PrivacyConsent
        isVisible={showPrivacyConsent}
        onConsentGiven={handleConsentGiven}
        onDeclined={handleConsentDeclined}
      />

      {/* Notifications */}
      <div className="fixed top-4 right-4 space-y-2 z-40 max-w-sm">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className={cn(
                "p-4 rounded-lg shadow-lg border",
                notification.type === 'success' ? "bg-green-50 border-green-200 text-green-800" :
                notification.type === 'warning' ? "bg-yellow-50 border-yellow-200 text-yellow-800" :
                "bg-blue-50 border-blue-200 text-blue-800"
              )}
            >
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 mr-2 mt-0.5" />
                <p className="text-sm">{notification.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col-reverse items-end space-y-reverse space-y-3 z-30">
        {/* AR Preview Button */}
        {currentProduct && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            onClick={handleARClick}
            className={cn(
              "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
              consentGiven?.aiFeatures
                ? "bg-purple-600 text-white hover:bg-purple-700 hover:shadow-xl transform hover:scale-105"
                : "bg-gray-400 text-gray-200 cursor-not-allowed"
            )}
            title="AR Preview - Check if this fits your cooler"
          >
            <CubeIcon className="h-6 w-6" />
          </motion.button>
        )}

        {/* AI Chatbot Button */}
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          onClick={handleChatClick}
          className={cn(
            "relative w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-all duration-200",
            consentGiven?.aiFeatures
              ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-2xl transform hover:scale-105"
              : "bg-gray-400 text-gray-200 cursor-not-allowed"
          )}
          title="AI Assistant - Get help with ICEPACA products"
        >
          {consentGiven?.aiFeatures && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <SparklesIcon className="h-3 w-3 text-white" />
            </div>
          )}
          
          <ChatBubbleLeftRightIcon className="h-7 w-7" />
          
          {consentGiven?.aiFeatures && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full bg-blue-400 opacity-30"
            />
          )}
        </motion.button>

        {/* Feature Status Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-full px-3 py-1 shadow-md text-xs font-medium mb-2"
        >
          {consentGiven?.aiFeatures ? (
            <span className="text-green-600 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></div>
              AI Enabled
            </span>
          ) : (
            <span className="text-gray-500 flex items-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full mr-1.5"></div>
              AI Disabled
            </span>
          )}
        </motion.div>
      </div>

      {/* AI Chatbot */}
      <AIChatbot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onProductClick={(productId) => {
          onProductClick?.(productId);
          trackEvent('product_click', { source: 'chatbot', productId });
        }}
      />

      {/* AR Preview */}
      {currentProduct && (
        <ARPreview
          product={currentProduct}
          isOpen={isAROpen}
          onClose={() => setIsAROpen(false)}
        />
      )}

      {/* Privacy Settings Button (small, bottom-left) */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        onClick={() => setShowPrivacyConsent(true)}
        className="fixed bottom-6 left-6 w-10 h-10 bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors flex items-center justify-center z-30"
        title="Privacy Settings"
      >
        <InformationCircleIcon className="h-5 w-5" />
      </motion.button>
    </>
  );
};

export default FloatingAIAssistant;