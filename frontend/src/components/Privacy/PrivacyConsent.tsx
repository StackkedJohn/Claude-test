import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  InformationCircleIcon,
  ShieldCheckIcon,
  EyeIcon,
  CogIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface ConsentSettings {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  aiFeatures: boolean;
}

interface PrivacyConsentProps {
  isVisible: boolean;
  onConsentGiven: (settings: ConsentSettings) => void;
  onDeclined: () => void;
  showDetailed?: boolean;
}

const PrivacyConsent: React.FC<PrivacyConsentProps> = ({
  isVisible,
  onConsentGiven,
  onDeclined,
  showDetailed = false
}) => {
  const [currentView, setCurrentView] = useState<'banner' | 'detailed' | 'preferences'>('banner');
  const [consentSettings, setConsentSettings] = useState<ConsentSettings>({
    essential: true, // Always required
    analytics: true,
    marketing: false,
    personalization: true,
    aiFeatures: true
  });

  // Load saved preferences
  useEffect(() => {
    const savedSettings = localStorage.getItem('icepaca_privacy_consent');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setConsentSettings({ ...consentSettings, ...parsed });
      } catch (error) {
        console.error('Error loading privacy settings:', error);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const allConsent = {
      essential: true,
      analytics: true,
      marketing: true,
      personalization: true,
      aiFeatures: true
    };
    
    saveConsent(allConsent);
    onConsentGiven(allConsent);
  };

  const handleAcceptSelected = () => {
    saveConsent(consentSettings);
    onConsentGiven(consentSettings);
  };

  const handleDeclineAll = () => {
    const minimalConsent = {
      essential: true,
      analytics: false,
      marketing: false,
      personalization: false,
      aiFeatures: false
    };
    
    saveConsent(minimalConsent);
    onDeclined();
  };

  const saveConsent = (settings: ConsentSettings) => {
    localStorage.setItem('icepaca_privacy_consent', JSON.stringify(settings));
    localStorage.setItem('icepaca_consent_timestamp', new Date().toISOString());
  };

  const updateSetting = (key: keyof ConsentSettings, value: boolean) => {
    setConsentSettings(prev => ({
      ...prev,
      [key]: key === 'essential' ? true : value // Essential cookies can't be disabled
    }));
  };

  const privacyCategories = [
    {
      id: 'essential',
      name: 'Essential',
      required: true,
      icon: ShieldCheckIcon,
      description: 'Required for basic website functionality, security, and user authentication.',
      details: [
        'User session management',
        'Shopping cart functionality',
        'Security and fraud prevention',
        'Remember your login status'
      ],
      impact: 'Without these cookies, the website cannot function properly.'
    },
    {
      id: 'analytics',
      name: 'Analytics',
      required: false,
      icon: EyeIcon,
      description: 'Help us understand how visitors interact with our website to improve user experience.',
      details: [
        'Page visit tracking',
        'User journey analysis',
        'Performance monitoring',
        'Feature usage statistics'
      ],
      impact: 'Used to improve website performance and user experience. No personal identification.'
    },
    {
      id: 'marketing',
      name: 'Marketing',
      required: false,
      icon: InformationCircleIcon,
      description: 'Enable personalized advertising and promotional communications.',
      details: [
        'Personalized product recommendations',
        'Email marketing campaigns',
        'Social media advertising',
        'Retargeting advertisements'
      ],
      impact: 'Used for targeted advertising and promotional emails. You can unsubscribe anytime.'
    },
    {
      id: 'personalization',
      name: 'Personalization',
      required: false,
      icon: CogIcon,
      description: 'Customize your experience based on your preferences and behavior.',
      details: [
        'Personalized homepage content',
        'Product recommendations',
        'Saved preferences',
        'Customized user interface'
      ],
      impact: 'Creates a more tailored experience but requires analyzing your browsing patterns.'
    },
    {
      id: 'aiFeatures',
      name: 'AI Features',
      required: false,
      icon: ShieldCheckIcon,
      description: 'Enable AI-powered features like chatbot, AR preview, and dynamic pricing.',
      details: [
        'AI chatbot interactions',
        'Voice query processing',
        'AR cooler fitting analysis',
        'Dynamic pricing personalization',
        'Fraud detection algorithms'
      ],
      impact: 'Powers advanced AI features. May process voice data and images you share.'
    }
  ];

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-4 z-50"
      >
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          className={cn(
            "bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-hidden flex flex-col",
            currentView === 'banner' ? "max-w-2xl" : "max-w-4xl"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-6 w-6 text-blue-600 mr-2" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Privacy & Cookies</h2>
                <p className="text-sm text-gray-600">
                  {currentView === 'banner' ? 'We value your privacy' : 
                   currentView === 'detailed' ? 'How we use your data' : 
                   'Customize your preferences'}
                </p>
              </div>
            </div>
            
            {(currentView === 'detailed' || currentView === 'preferences') && (
              <button
                onClick={() => setCurrentView('banner')}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white hover:bg-opacity-50"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* Banner View */}
              {currentView === 'banner' && (
                <motion.div
                  key="banner"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-6"
                >
                  <div className="mb-6">
                    <p className="text-gray-700 mb-4">
                      We use cookies and similar technologies to enhance your experience, provide personalized content, 
                      and analyze our traffic. This includes AI-powered features like our chatbot, AR preview, and 
                      dynamic pricing.
                    </p>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">🤖 AI Features We Offer:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• AI chatbot for product support and recommendations</li>
                        <li>• AR preview to check if products fit your cooler</li>
                        <li>• Dynamic pricing based on demand and your preferences</li>
                        <li>• Voice queries for hands-free assistance</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleAcceptAll}
                      className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Accept All
                    </button>
                    
                    <button
                      onClick={() => setCurrentView('preferences')}
                      className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      Customize
                    </button>
                    
                    <button
                      onClick={handleDeclineAll}
                      className="flex-1 text-gray-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                    >
                      Essential Only
                    </button>
                  </div>

                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setCurrentView('detailed')}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Learn more about how we use your data
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Detailed View */}
              {currentView === 'detailed' && (
                <motion.div
                  key="detailed"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6"
                >
                  <div className="mb-6">
                    <p className="text-gray-700 mb-4">
                      We believe in transparency about how we collect and use your data. Here's a detailed 
                      breakdown of our privacy practices:
                    </p>
                  </div>

                  <div className="space-y-6">
                    {privacyCategories.map((category) => {
                      const Icon = category.icon;
                      const isEnabled = consentSettings[category.id as keyof ConsentSettings];
                      
                      return (
                        <div
                          key={category.id}
                          className={cn(
                            "border rounded-lg p-6 transition-all",
                            isEnabled ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"
                          )}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                              <Icon className={cn(
                                "h-6 w-6 mr-3",
                                isEnabled ? "text-blue-600" : "text-gray-500"
                              )} />
                              <div>
                                <h3 className="font-semibold text-gray-900 flex items-center">
                                  {category.name}
                                  {category.required && (
                                    <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                      Required
                                    </span>
                                  )}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  {category.description}
                                </p>
                              </div>
                            </div>
                            
                            <div className={cn(
                              "w-6 h-6 rounded border-2 flex items-center justify-center",
                              isEnabled ? "bg-blue-600 border-blue-600" : "border-gray-300"
                            )}>
                              {isEnabled && <CheckIcon className="h-4 w-4 text-white" />}
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-gray-800 mb-2">What we collect:</h4>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {category.details.map((detail, index) => (
                                  <li key={index} className="flex items-center">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></div>
                                    {detail}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-gray-800 mb-2">Impact:</h4>
                              <p className="text-sm text-gray-600">
                                {category.impact}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={() => setCurrentView('preferences')}
                      className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Customize My Preferences
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Preferences View */}
              {currentView === 'preferences' && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-6"
                >
                  <div className="mb-6">
                    <p className="text-gray-700 mb-4">
                      Choose which types of cookies and data processing you're comfortable with. 
                      You can change these settings anytime.
                    </p>
                  </div>

                  <div className="space-y-4 mb-8">
                    {privacyCategories.map((category) => {
                      const Icon = category.icon;
                      const isEnabled = consentSettings[category.id as keyof ConsentSettings];
                      const canToggle = !category.required;
                      
                      return (
                        <div
                          key={category.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-start">
                            <Icon className={cn(
                              "h-5 w-5 mr-3 mt-0.5",
                              isEnabled ? "text-blue-600" : "text-gray-500"
                            )} />
                            <div className="flex-1">
                              <div className="flex items-center">
                                <h4 className="font-medium text-gray-900">
                                  {category.name}
                                </h4>
                                {category.required && (
                                  <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                    Required
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {category.description}
                              </p>
                            </div>
                          </div>
                          
                          <div className="ml-4">
                            <button
                              onClick={() => canToggle && updateSetting(category.id as keyof ConsentSettings, !isEnabled)}
                              disabled={!canToggle}
                              className={cn(
                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                                isEnabled ? "bg-blue-600" : "bg-gray-200",
                                !canToggle && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <span
                                className={cn(
                                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                  isEnabled ? "translate-x-6" : "translate-x-1"
                                )}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleAcceptSelected}
                        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Save Preferences
                      </button>
                      
                      <button
                        onClick={handleAcceptAll}
                        className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                      >
                        Accept All
                      </button>
                      
                      <button
                        onClick={handleDeclineAll}
                        className="flex-1 text-gray-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors border border-gray-300"
                      >
                        Essential Only
                      </button>
                    </div>

                    <div className="mt-4 text-center">
                      <p className="text-xs text-gray-500">
                        By clicking "Save Preferences", you agree to our{' '}
                        <a href="/privacy-policy" className="text-blue-600 hover:text-blue-800">
                          Privacy Policy
                        </a>{' '}
                        and{' '}
                        <a href="/cookie-policy" className="text-blue-600 hover:text-blue-800">
                          Cookie Policy
                        </a>
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PrivacyConsent;