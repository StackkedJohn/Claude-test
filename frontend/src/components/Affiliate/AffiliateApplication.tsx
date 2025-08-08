import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserIcon,
  GlobeAltIcon,
  ChartBarIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface SocialMediaLinks {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  blog?: string;
}

interface ApplicationFormData {
  email: string;
  name: string;
  website?: string;
  socialMedia: SocialMediaLinks;
  audienceSize: number;
  niche: string;
  promotionMethods: string[];
  reasonForJoining: string;
}

const AffiliateApplication: React.FC = () => {
  const [formData, setFormData] = useState<ApplicationFormData>({
    email: '',
    name: '',
    website: '',
    socialMedia: {},
    audienceSize: 0,
    niche: '',
    promotionMethods: [],
    reasonForJoining: ''
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 4;

  const niches = [
    'Outdoor & Adventure',
    'Sustainability & Eco-living',
    'Family & Parenting',
    'Camping & RV',
    'Food & Cooking',
    'Fitness & Health',
    'Travel',
    'Lifestyle',
    'Other'
  ];

  const promotionMethodOptions = [
    'Social Media Posts',
    'Blog Articles',
    'Email Marketing',
    'Video Content',
    'Podcast Mentions',
    'Product Reviews',
    'Influencer Collaborations',
    'Paid Advertising'
  ];

  const handleInputChange = (field: keyof ApplicationFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialMediaChange = (platform: keyof SocialMediaLinks, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value
      }
    }));
  };

  const handlePromotionMethodToggle = (method: string) => {
    setFormData(prev => ({
      ...prev,
      promotionMethods: prev.promotionMethods.includes(method)
        ? prev.promotionMethods.filter(m => m !== method)
        : [...prev.promotionMethods, method]
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.email && formData.name);
      case 2:
        return !!(formData.audienceSize > 0 && formData.niche);
      case 3:
        return formData.promotionMethods.length > 0;
      case 4:
        return !!formData.reasonForJoining.trim();
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/affiliate/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit application');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h2>
          <p className="text-lg text-gray-600 mb-6">
            Thank you for applying to the ICEPACA Affiliate Program. We'll review your application 
            and get back to you within 3-5 business days.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
            <ul className="text-blue-800 text-sm space-y-1 text-left">
              <li>• Our team reviews your application and social media presence</li>
              <li>• We check alignment with ICEPACA's sustainability values</li>
              <li>• If approved, you'll receive your affiliate dashboard access</li>
              <li>• Start earning commissions on every sale you generate!</li>
            </ul>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Join the ICEPACA Affiliate Program</h1>
        <p className="text-gray-600">Partner with us to promote sustainable cooling solutions and earn competitive commissions!</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                i + 1 <= currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="p-8">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center mb-6">
                <UserIcon className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website/Blog URL
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Social Media Profiles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instagram
                      </label>
                      <input
                        type="url"
                        value={formData.socialMedia.instagram || ''}
                        onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://instagram.com/yourusername"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        TikTok
                      </label>
                      <input
                        type="url"
                        value={formData.socialMedia.tiktok || ''}
                        onChange={(e) => handleSocialMediaChange('tiktok', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://tiktok.com/@yourusername"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        YouTube
                      </label>
                      <input
                        type="url"
                        value={formData.socialMedia.youtube || ''}
                        onChange={(e) => handleSocialMediaChange('youtube', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://youtube.com/c/yourchannel"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Blog
                      </label>
                      <input
                        type="url"
                        value={formData.socialMedia.blog || ''}
                        onChange={(e) => handleSocialMediaChange('blog', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://yourblog.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Audience & Niche */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center mb-6">
                <ChartBarIcon className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Audience & Niche</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Audience Size *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.audienceSize}
                    onChange={(e) => handleInputChange('audienceSize', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Combined followers across all platforms"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Include followers from all your social media channels, email subscribers, and website visitors
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Niche *
                  </label>
                  <select
                    value={formData.niche}
                    onChange={(e) => handleInputChange('niche', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select your primary niche</option>
                    {niches.map((niche) => (
                      <option key={niche} value={niche}>
                        {niche}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">💰 Estimated Commission Rate</h3>
                  <p className="text-green-700 text-sm">
                    Based on your audience size and niche alignment, you could earn:{' '}
                    <strong>
                      {formData.audienceSize > 100000 && ['Outdoor & Adventure', 'Sustainability & Eco-living'].includes(formData.niche)
                        ? '18-20%'
                        : formData.audienceSize > 50000 && formData.niche
                        ? '15-18%'
                        : formData.audienceSize > 10000
                        ? '12-15%'
                        : '10-12%'
                      } commission
                    </strong>
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Promotion Methods */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center mb-6">
                <GlobeAltIcon className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Promotion Methods</h2>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600">How do you plan to promote ICEPACA products? (Select all that apply)</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {promotionMethodOptions.map((method) => (
                    <label
                      key={method}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.promotionMethods.includes(method)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.promotionMethods.includes(method)}
                        onChange={() => handlePromotionMethodToggle(method)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                        formData.promotionMethods.includes(method)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {formData.promotionMethods.includes(method) && (
                          <CheckCircleIcon className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{method}</span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Motivation */}
          {currentStep === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center mb-6">
                <SparklesIcon className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Why ICEPACA?</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Why do you want to partner with ICEPACA? *
                  </label>
                  <textarea
                    value={formData.reasonForJoining}
                    onChange={(e) => handleInputChange('reasonForJoining', e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Tell us about your interest in sustainable products, outdoor activities, or why ICEPACA aligns with your content..."
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Help us understand why you're excited to promote ICEPACA and how it fits with your audience
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2">🌟 What We Look For</h3>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Genuine enthusiasm for sustainability and eco-friendly products</li>
                    <li>• Alignment with outdoor, adventure, or family-focused content</li>
                    <li>• Commitment to authentic, honest product recommendations</li>
                    <li>• Professional approach to content creation and partnerships</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!validateStep(currentStep) || isSubmitting}
                className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateApplication;