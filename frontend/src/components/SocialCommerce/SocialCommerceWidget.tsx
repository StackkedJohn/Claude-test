import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShareIcon,
  HeartIcon,
  EyeIcon,
  ChartBarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import InstagramShopButton from './InstagramShopButton';
import TikTokShopButton from './TikTokShopButton';

interface SocialCommerceWidgetProps {
  productId: string;
  productName: string;
  className?: string;
  showAnalytics?: boolean;
  layout?: 'horizontal' | 'vertical' | 'compact';
}

interface SocialContentSuggestion {
  platform: 'instagram' | 'tiktok';
  caption: string;
  hashtags: string[];
  contentSuggestions: string[];
}

interface SocialStats {
  instagram: {
    followers: number;
    engagement: number;
    reach: number;
  };
  tiktok: {
    followers: number;
    views: number;
    likes: number;
  };
}

const SocialCommerceWidget: React.FC<SocialCommerceWidgetProps> = ({
  productId,
  productName,
  className = '',
  showAnalytics = false,
  layout = 'horizontal'
}) => {
  const [contentSuggestions, setContentSuggestions] = useState<{
    instagram: SocialContentSuggestion | null;
    tiktok: SocialContentSuggestion | null;
  }>({ instagram: null, tiktok: null });
  const [socialStats, setSocialStats] = useState<SocialStats | null>(null);
  const [activeTab, setActiveTab] = useState<'buttons' | 'content' | 'analytics'>('buttons');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch content suggestions for both platforms
        const [instagramResponse, tiktokResponse] = await Promise.all([
          fetch(`/api/social-commerce/content/${productId}/instagram`),
          fetch(`/api/social-commerce/content/${productId}/tiktok`)
        ]);

        if (instagramResponse.ok) {
          const instagramData = await instagramResponse.json();
          setContentSuggestions(prev => ({ ...prev, instagram: instagramData }));
        }

        if (tiktokResponse.ok) {
          const tiktokData = await tiktokResponse.json();
          setContentSuggestions(prev => ({ ...prev, tiktok: tiktokData }));
        }

        // Mock social stats (in real app, would come from API)
        setSocialStats({
          instagram: {
            followers: 12500,
            engagement: 4.2,
            reach: 45000
          },
          tiktok: {
            followers: 8900,
            views: 125000,
            likes: 8400
          }
        });
      } catch (error) {
        console.error('Error fetching social commerce data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId]);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow border p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="flex space-x-4">
            <div className="h-10 bg-gray-200 rounded w-24"></div>
            <div className="h-10 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      </div>
    );
  }

  const layoutClasses = {
    horizontal: 'flex flex-row space-x-4',
    vertical: 'flex flex-col space-y-4',
    compact: 'flex flex-row space-x-2'
  };

  const tabButtons = [
    { id: 'buttons', label: 'Shop', icon: ShareIcon },
    { id: 'content', label: 'Content', icon: SparklesIcon },
    ...(showAnalytics ? [{ id: 'analytics', label: 'Stats', icon: ChartBarIcon }] : [])
  ];

  return (
    <div className={`bg-white rounded-lg shadow border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <ShareIcon className="h-5 w-5 mr-2 text-purple-600" />
          Social Commerce
        </h3>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {tabButtons.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2 px-4 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* Shop Buttons Tab */}
          {activeTab === 'buttons' && (
            <motion.div
              key="buttons"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <p className="text-sm text-gray-600 mb-4">
                Make this product shoppable on social media platforms
              </p>
              
              <div className={layoutClasses[layout]}>
                <InstagramShopButton
                  productId={productId}
                  productName={productName}
                  variant={layout === 'compact' ? 'badge' : 'button'}
                  size={layout === 'compact' ? 'sm' : 'md'}
                />
                
                <TikTokShopButton
                  productId={productId}
                  productName={productName}
                  variant={layout === 'compact' ? 'badge' : 'button'}
                  size={layout === 'compact' ? 'sm' : 'md'}
                />
              </div>

              {layout !== 'compact' && (
                <div className="bg-gray-50 rounded-lg p-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Why Social Commerce?</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Reach customers where they spend their time</li>
                    <li>• Seamless shopping experience within social apps</li>
                    <li>• Leverage user-generated content and reviews</li>
                    <li>• Build brand awareness through social sharing</li>
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          {/* Content Suggestions Tab */}
          {activeTab === 'content' && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Instagram Content */}
              {contentSuggestions.instagram && (
                <div className="border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600 rounded-lg mr-2"></div>
                    <h4 className="font-medium text-gray-900">Instagram Post</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Caption:</p>
                      <p className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                        {contentSuggestions.instagram.caption}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Hashtags:</p>
                      <div className="flex flex-wrap gap-1">
                        {contentSuggestions.instagram.hashtags.slice(0, 8).map((hashtag, index) => (
                          <span key={index} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            #{hashtag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Content Ideas:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {contentSuggestions.instagram.contentSuggestions.slice(0, 3).map((suggestion, index) => (
                          <li key={index}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* TikTok Content */}
              {contentSuggestions.tiktok && (
                <div className="border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-6 h-6 bg-black rounded-lg mr-2 flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-sm"></div>
                    </div>
                    <h4 className="font-medium text-gray-900">TikTok Video</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Caption:</p>
                      <p className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                        {contentSuggestions.tiktok.caption}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Hashtags:</p>
                      <div className="flex flex-wrap gap-1">
                        {contentSuggestions.tiktok.hashtags.slice(0, 6).map((hashtag, index) => (
                          <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            #{hashtag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Video Ideas:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {contentSuggestions.tiktok.contentSuggestions.slice(0, 3).map((suggestion, index) => (
                          <li key={index}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && showAnalytics && socialStats && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Instagram Stats */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <div className="w-4 h-4 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600 rounded mr-2"></div>
                    Instagram
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Followers</span>
                      <span className="text-sm font-medium">{socialStats.instagram.followers.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Engagement Rate</span>
                      <span className="text-sm font-medium">{socialStats.instagram.engagement}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Monthly Reach</span>
                      <span className="text-sm font-medium">{socialStats.instagram.reach.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* TikTok Stats */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <div className="w-4 h-4 bg-black rounded mr-2"></div>
                    TikTok
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Followers</span>
                      <span className="text-sm font-medium">{socialStats.tiktok.followers.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Views</span>
                      <span className="text-sm font-medium">{socialStats.tiktok.views.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Likes</span>
                      <span className="text-sm font-medium">{socialStats.tiktok.likes.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Tips */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                  <ChartBarIcon className="h-4 w-4 mr-1" />
                  Performance Tips
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Post during peak hours (2-4 PM on weekends)</li>
                  <li>• Use trending hashtags related to outdoor activities</li>
                  <li>• Engage with comments within the first hour</li>
                  <li>• Share behind-the-scenes content for authenticity</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SocialCommerceWidget;