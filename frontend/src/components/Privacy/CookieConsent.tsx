import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CookieIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface CookieCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  enabled: boolean;
  cookies: Array<{
    name: string;
    purpose: string;
    duration: string;
    provider: string;
  }>;
}

interface ConsentSettings {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  advertising: boolean;
  preferences: boolean;
}

const CookieConsent: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [settings, setSettings] = useState<ConsentSettings>({
    necessary: true,
    functional: false,
    analytics: false,
    advertising: false,
    preferences: false
  });

  // Detect user location for compliance requirements
  const [userLocation, setUserLocation] = useState<'EU' | 'CA' | 'US' | 'OTHER'>('OTHER');
  const [complianceType, setComplianceType] = useState<'GDPR' | 'CCPA' | 'GENERAL'>('GENERAL');

  const cookieCategories: CookieCategory[] = [
    {
      id: 'necessary',
      name: 'Strictly Necessary Cookies',
      description: 'These cookies are essential for the website to function properly. They enable core functionality such as security, network management, and accessibility.',
      required: true,
      enabled: true,
      cookies: [
        {
          name: 'session_id',
          purpose: 'Maintains user session and login state',
          duration: 'Session',
          provider: 'ICEPACA'
        },
        {
          name: 'csrf_token',
          purpose: 'Security token to prevent cross-site request forgery',
          duration: 'Session',
          provider: 'ICEPACA'
        },
        {
          name: 'cart_id',
          purpose: 'Stores shopping cart contents',
          duration: '30 days',
          provider: 'ICEPACA'
        }
      ]
    },
    {
      id: 'functional',
      name: 'Functional Cookies',
      description: 'These cookies enhance functionality and personalization, such as language settings and user preferences.',
      required: false,
      enabled: settings.functional,
      cookies: [
        {
          name: 'language_preference',
          purpose: 'Stores user language preference',
          duration: '1 year',
          provider: 'ICEPACA'
        },
        {
          name: 'currency_preference',
          purpose: 'Stores user currency preference',
          duration: '1 year',
          provider: 'ICEPACA'
        },
        {
          name: 'theme_preference',
          purpose: 'Stores user theme preference (light/dark mode)',
          duration: '1 year',
          provider: 'ICEPACA'
        }
      ]
    },
    {
      id: 'analytics',
      name: 'Analytics Cookies',
      description: 'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.',
      required: false,
      enabled: settings.analytics,
      cookies: [
        {
          name: '_ga',
          purpose: 'Distinguishes unique users',
          duration: '2 years',
          provider: 'Google Analytics'
        },
        {
          name: '_ga_*',
          purpose: 'Stores session state',
          duration: '2 years',
          provider: 'Google Analytics'
        },
        {
          name: '_gid',
          purpose: 'Distinguishes unique users',
          duration: '24 hours',
          provider: 'Google Analytics'
        },
        {
          name: 'hotjar_*',
          purpose: 'User behavior analytics',
          duration: '1 year',
          provider: 'Hotjar'
        }
      ]
    },
    {
      id: 'advertising',
      name: 'Advertising Cookies',
      description: 'These cookies are used to make advertising messages more relevant to you and your interests.',
      required: false,
      enabled: settings.advertising,
      cookies: [
        {
          name: '_fbp',
          purpose: 'Tracks conversions from Facebook ads',
          duration: '3 months',
          provider: 'Facebook'
        },
        {
          name: 'google_ads_*',
          purpose: 'Tracks conversions from Google ads',
          duration: '1 year',
          provider: 'Google Ads'
        },
        {
          name: 'retargeting_*',
          purpose: 'Enables retargeting campaigns',
          duration: '6 months',
          provider: 'Various'
        }
      ]
    },
    {
      id: 'preferences',
      name: 'Preference Cookies',
      description: 'These cookies remember your choices and preferences to provide a more personalized experience.',
      required: false,
      enabled: settings.preferences,
      cookies: [
        {
          name: 'recently_viewed',
          purpose: 'Stores recently viewed products',
          duration: '30 days',
          provider: 'ICEPACA'
        },
        {
          name: 'wishlist',
          purpose: 'Stores wishlist items',
          duration: '1 year',
          provider: 'ICEPACA'
        },
        {
          name: 'newsletter_preference',
          purpose: 'Stores newsletter subscription preferences',
          duration: '2 years',
          provider: 'ICEPACA'
        }
      ]
    }
  ];

  useEffect(() => {
    // Check for existing consent
    const existingConsent = localStorage.getItem('icepaca_cookie_consent');
    const consentDate = localStorage.getItem('icepaca_consent_date');
    
    if (existingConsent && consentDate) {
      const consentAge = Date.now() - parseInt(consentDate);
      const thirteenMonths = 13 * 30 * 24 * 60 * 60 * 1000;
      
      if (consentAge < thirteenMonths) {
        const savedSettings = JSON.parse(existingConsent);
        setSettings(savedSettings);
        setConsentGiven(true);
        applyConsentSettings(savedSettings);
        return;
      }
    }

    // Detect user location (simplified - in production, use IP geolocation)
    detectUserLocation();
    
    // Show banner after a short delay
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const detectUserLocation = async () => {
    try {
      // In production, use IP geolocation service
      const response = await fetch('/api/geolocation');
      if (response.ok) {
        const location = await response.json();
        setUserLocation(location.region);
        
        if (location.region === 'EU') {
          setComplianceType('GDPR');
        } else if (location.region === 'CA') {
          setComplianceType('CCPA');
        } else {
          setComplianceType('GENERAL');
        }
      }
    } catch (error) {
      // Fallback to timezone detection
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone.includes('Europe')) {
        setUserLocation('EU');
        setComplianceType('GDPR');
      } else if (timezone.includes('America') && (timezone.includes('Toronto') || timezone.includes('Vancouver'))) {
        setUserLocation('CA');
        setComplianceType('CCPA');
      } else {
        setUserLocation('US');
        setComplianceType('GENERAL');
      }
    }
  };

  const handleAcceptAll = () => {
    const allEnabled: ConsentSettings = {
      necessary: true,
      functional: true,
      analytics: true,
      advertising: true,
      preferences: true
    };
    
    setSettings(allEnabled);
    saveConsent(allEnabled);
    applyConsentSettings(allEnabled);
    setShowBanner(false);
    setConsentGiven(true);
  };

  const handleRejectAll = () => {
    const minimalSettings: ConsentSettings = {
      necessary: true,
      functional: false,
      analytics: false,
      advertising: false,
      preferences: false
    };
    
    setSettings(minimalSettings);
    saveConsent(minimalSettings);
    applyConsentSettings(minimalSettings);
    setShowBanner(false);
    setConsentGiven(true);
  };

  const handleSaveSettings = () => {
    saveConsent(settings);
    applyConsentSettings(settings);
    setShowSettings(false);
    setShowBanner(false);
    setConsentGiven(true);
  };

  const saveConsent = (consentSettings: ConsentSettings) => {
    localStorage.setItem('icepaca_cookie_consent', JSON.stringify(consentSettings));
    localStorage.setItem('icepaca_consent_date', Date.now().toString());
    
    // Send consent to backend for compliance logging
    fetch('/api/privacy/consent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        consent: consentSettings,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        ipAddress: 'client_ip', // Would be filled by backend
        complianceType
      })
    }).catch(error => console.error('Error saving consent:', error));
  };

  const applyConsentSettings = (consentSettings: ConsentSettings) => {
    // Analytics
    if (consentSettings.analytics) {
      // Enable Google Analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', {
          'analytics_storage': 'granted'
        });
      }
    } else {
      // Disable analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', {
          'analytics_storage': 'denied'
        });
      }
    }

    // Advertising
    if (consentSettings.advertising) {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', {
          'ad_storage': 'granted'
        });
      }
    } else {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', {
          'ad_storage': 'denied'
        });
      }
    }

    // Functional cookies
    if (consentSettings.functional) {
      // Enable functional cookies
    } else {
      // Clean up functional cookies
      document.cookie.split(';').forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (['language_preference', 'currency_preference', 'theme_preference'].includes(name)) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
    }
  };

  const getComplianceText = () => {
    switch (complianceType) {
      case 'GDPR':
        return {
          title: 'Your Privacy Matters (GDPR)',
          description: 'Under the General Data Protection Regulation (GDPR), we need your consent to use cookies that are not strictly necessary for the website to function.',
          rights: 'You have the right to access, rectify, erase, restrict processing, object to processing, and port your personal data. You can withdraw consent at any time.'
        };
      case 'CCPA':
        return {
          title: 'Your Privacy Rights (CCPA)',
          description: 'Under the California Consumer Privacy Act (CCPA), you have the right to know what personal information we collect and how we use it.',
          rights: 'You have the right to know, delete, and opt-out of the sale of your personal information. We do not sell personal information.'
        };
      default:
        return {
          title: 'Cookie Notice',
          description: 'We use cookies to enhance your browsing experience, analyze our traffic, and provide personalized content.',
          rights: 'You can manage your cookie preferences at any time through our cookie settings.'
        };
    }
  };

  const complianceText = getComplianceText();

  return (
    <>
      {/* Cookie Consent Banner */}
      <AnimatePresence>
        {showBanner && !consentGiven && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-blue-500 shadow-2xl z-50"
          >
            <div className="max-w-6xl mx-auto p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <CookieIcon className="h-8 w-8 text-blue-600" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {complianceText.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">
                    {complianceText.description}
                  </p>
                  
                  {complianceType !== 'GENERAL' && (
                    <p className="text-xs text-gray-500 mb-4">
                      {complianceText.rights}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleAcceptAll}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Accept All
                    </button>
                    
                    <button
                      onClick={handleRejectAll}
                      className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      Reject All
                    </button>
                    
                    <button
                      onClick={() => setShowSettings(true)}
                      className="text-blue-600 hover:text-blue-800 px-4 py-2 rounded-lg border border-blue-600 hover:border-blue-800 transition-colors font-medium"
                    >
                      <Cog6ToothIcon className="h-4 w-4 inline mr-2" />
                      Cookie Settings
                    </button>
                    
                    <a
                      href="/privacy-policy"
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      Privacy Policy
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cookie Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Cookie Settings</h2>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <p className="text-gray-600 mt-2">
                  Manage your cookie preferences. You can enable or disable different categories of cookies below.
                </p>
              </div>

              <div className="p-6 space-y-6">
                {cookieCategories.map((category) => (
                  <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-gray-900">{category.name}</h3>
                          {category.required && (
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                              Always Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                        
                        {/* Cookie Details */}
                        <div className="bg-gray-50 rounded p-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Cookies in this category:</h4>
                          <div className="space-y-2">
                            {category.cookies.map((cookie, index) => (
                              <div key={index} className="text-xs">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="font-medium text-gray-800">{cookie.name}</span>
                                    <p className="text-gray-600 mt-1">{cookie.purpose}</p>
                                  </div>
                                  <div className="text-right text-gray-500 ml-4">
                                    <div>{cookie.duration}</div>
                                    <div className="text-xs">{cookie.provider}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex-shrink-0">
                        {category.required ? (
                          <div className="w-12 h-6 bg-gray-300 rounded-full flex items-center justify-end pr-1">
                            <div className="w-4 h-4 bg-white rounded-full shadow"></div>
                          </div>
                        ) : (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={settings[category.id as keyof ConsentSettings]}
                              onChange={(e) => setSettings(prev => ({
                                ...prev,
                                [category.id]: e.target.checked
                              }))}
                            />
                            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {complianceType === 'GDPR' && (
                      <p>
                        By clicking "Save Settings", you consent to the storage and processing of your personal data 
                        as described in our <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>.
                      </p>
                    )}
                    {complianceType === 'CCPA' && (
                      <p>
                        For more information about your privacy rights, see our 
                        <a href="/privacy-policy" className="text-blue-600 hover:underline ml-1">Privacy Policy</a>.
                      </p>
                    )}
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowSettings(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveSettings}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <CheckIcon className="h-4 w-4 inline mr-2" />
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cookie Settings Button (always visible after consent) */}
      {consentGiven && (
        <button
          onClick={() => setShowSettings(true)}
          className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-40"
          title="Cookie Settings"
        >
          <Cog6ToothIcon className="h-5 w-5" />
        </button>
      )}
    </>
  );
};

export default CookieConsent;