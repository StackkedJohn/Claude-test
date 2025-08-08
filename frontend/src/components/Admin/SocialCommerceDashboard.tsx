import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShareIcon,
  EyeIcon,
  HeartIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  RefreshIcon,
  CameraIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface PlatformAnalytics {
  platform: 'instagram' | 'tiktok';
  summary: {
    totalPosts: number;
    totalReach: number;
    totalImpressions: number;
    totalEngagement: number;
    totalClicks: number;
    totalPurchases: number;
    totalRevenue: number;
    avgEngagementRate: number;
    avgClickThroughRate: number;
    avgConversionRate: number;
  };
  posts: Array<{
    postId: string;
    reach: number;
    impressions: number;
    engagement: number;
    clicks: number;
    purchases: number;
    revenue: number;
  }>;
}

interface ICEPACAInsights {
  topPerformingPlatform: string;
  bestTimeToPost: string;
  topHashtags: string[];
  audienceDemographics: {
    ageGroups: { [key: string]: number };
    interests: string[];
  };
  contentRecommendations: string[];
  performanceByProductType: {
    [key: string]: {
      clicks: number;
      purchases: number;
      conversionRate: number;
    };
  };
}

const SocialCommerceDashboard: React.FC = () => {
  const [instagramData, setInstagramData] = useState<PlatformAnalytics | null>(null);
  const [tiktokData, setTiktokData] = useState<PlatformAnalytics | null>(null);
  const [insights, setInsights] = useState<ICEPACAInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<{ instagram: boolean; tiktok: boolean }>({
    instagram: false,
    tiktok: false
  });
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [instagramResponse, tiktokResponse, insightsResponse] = await Promise.all([
        fetch(`/api/social-commerce/analytics/instagram?days=${timeRange}`),
        fetch(`/api/social-commerce/analytics/tiktok?days=${timeRange}`),
        fetch('/api/social-commerce/insights/icepaca')
      ]);

      if (instagramResponse.ok) {
        setInstagramData(await instagramResponse.json());
      }

      if (tiktokResponse.ok) {
        setTiktokData(await tiktokResponse.json());
      }

      if (insightsResponse.ok) {
        setInsights(await insightsResponse.json());
      }
    } catch (error) {
      console.error('Error fetching social commerce analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCatalog = async (platform: 'instagram' | 'tiktok') => {
    setSyncing(prev => ({ ...prev, [platform]: true }));
    
    try {
      const response = await fetch(`/api/social-commerce/sync/${platform}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log(`${platform} catalog synced successfully`);
        // Refresh data after sync
        await fetchAnalyticsData();
      } else {
        console.error(`Failed to sync ${platform} catalog`);
      }
    } catch (error) {
      console.error(`Error syncing ${platform} catalog:`, error);
    } finally {
      setSyncing(prev => ({ ...prev, [platform]: false }));
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow border h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const combinedMetrics = {
    totalPosts: (instagramData?.summary.totalPosts || 0) + (tiktokData?.summary.totalPosts || 0),
    totalReach: (instagramData?.summary.totalReach || 0) + (tiktokData?.summary.totalReach || 0),
    totalEngagement: (instagramData?.summary.totalEngagement || 0) + (tiktokData?.summary.totalEngagement || 0),
    totalRevenue: (instagramData?.summary.totalRevenue || 0) + (tiktokData?.summary.totalRevenue || 0)
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <ShareIcon className="h-8 w-8 mr-3 text-purple-600" />
            Social Commerce Dashboard
          </h1>
          <p className="text-gray-600">Monitor your Instagram and TikTok shop performance</p>
        </div>
        
        {/* Controls */}
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <div className="flex bg-white rounded-lg border p-1">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days as 7 | 30 | 90)}
                className={cn(
                  'px-3 py-1 rounded text-sm font-medium transition-colors',
                  timeRange === days
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:text-purple-600'
                )}
              >
                {days}d
              </button>
            ))}
          </div>
          
          {/* Sync Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleSyncCatalog('instagram')}
              disabled={syncing.instagram}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
            >
              {syncing.instagram ? (
                <RefreshIcon className="h-4 w-4 animate-spin" />
              ) : (
                <CameraIcon className="h-4 w-4" />
              )}
              <span>Sync Instagram</span>
            </button>
            
            <button
              onClick={() => handleSyncCatalog('tiktok')}
              disabled={syncing.tiktok}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {syncing.tiktok ? (
                <RefreshIcon className="h-4 w-4 animate-spin" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
              <span>Sync TikTok</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow border"
        >
          <div className="flex items-center justify-between mb-4">
            <ShareIcon className="h-8 w-8 text-blue-600" />
            <TrendingUpIcon className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{combinedMetrics.totalPosts}</p>
            <p className="text-sm text-gray-600">Total Posts</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-lg shadow border"
        >
          <div className="flex items-center justify-between mb-4">
            <EyeIcon className="h-8 w-8 text-green-600" />
            <TrendingUpIcon className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{combinedMetrics.totalReach.toLocaleString()}</p>
            <p className="text-sm text-gray-600">Total Reach</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-lg shadow border"
        >
          <div className="flex items-center justify-between mb-4">
            <HeartIcon className="h-8 w-8 text-pink-600" />
            <TrendingUpIcon className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{combinedMetrics.totalEngagement.toLocaleString()}</p>
            <p className="text-sm text-gray-600">Total Engagement</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-lg shadow border"
        >
          <div className="flex items-center justify-between mb-4">
            <ShoppingCartIcon className="h-8 w-8 text-yellow-600" />
            <TrendingUpIcon className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 mb-1">${combinedMetrics.totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-gray-600">Social Revenue</p>
          </div>
        </motion.div>
      </div>

      {/* Platform Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Instagram Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow border overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600 rounded-lg mr-3"></div>
              Instagram Performance
            </h3>
          </div>
          <div className="p-6">
            {instagramData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Avg Engagement Rate</p>
                    <p className="text-xl font-bold text-purple-600">{instagramData.summary.avgEngagementRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Conversion Rate</p>
                    <p className="text-xl font-bold text-green-600">{instagramData.summary.avgConversionRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Clicks</p>
                    <p className="text-lg font-semibold text-gray-900">{instagramData.summary.totalClicks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Purchases</p>
                    <p className="text-lg font-semibold text-gray-900">{instagramData.summary.totalPurchases}</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Posts</h4>
                  <div className="space-y-2">
                    {instagramData.posts.slice(0, 3).map((post, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">Post {index + 1}</span>
                        <span className="text-gray-900">{post.engagement} engagements</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No Instagram data available</p>
            )}
          </div>
        </motion.div>

        {/* TikTok Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow border overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <div className="w-6 h-6 bg-black rounded-lg mr-3 flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-sm"></div>
              </div>
              TikTok Performance
            </h3>
          </div>
          <div className="p-6">
            {tiktokData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Avg Engagement Rate</p>
                    <p className="text-xl font-bold text-gray-900">{tiktokData.summary.avgEngagementRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Conversion Rate</p>
                    <p className="text-xl font-bold text-green-600">{tiktokData.summary.avgConversionRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Clicks</p>
                    <p className="text-lg font-semibold text-gray-900">{tiktokData.summary.totalClicks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Purchases</p>
                    <p className="text-lg font-semibold text-gray-900">{tiktokData.summary.totalPurchases}</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Posts</h4>
                  <div className="space-y-2">
                    {tiktokData.posts.slice(0, 3).map((post, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">Post {index + 1}</span>
                        <span className="text-gray-900">{post.engagement} engagements</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No TikTok data available</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* ICEPACA Insights */}
      {insights && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-lg shadow border"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">ICEPACA Social Commerce Insights</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Top Performing Platform</h4>
                  <p className="text-2xl font-bold text-purple-600">{insights.topPerformingPlatform}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Best Time to Post</h4>
                  <p className="text-lg text-gray-700">{insights.bestTimeToPost}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Top Hashtags</h4>
                  <div className="flex flex-wrap gap-2">
                    {insights.topHashtags.map((hashtag, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        #{hashtag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Content Recommendations</h4>
                  <ul className="space-y-2">
                    {insights.contentRecommendations.map((recommendation, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Performance by Product</h4>
                  <div className="space-y-3">
                    {Object.entries(insights.performanceByProductType).map(([product, stats]) => (
                      <div key={product} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-900">{product}</span>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">{stats.clicks} clicks</div>
                          <div className="text-sm font-medium text-green-600">{stats.conversionRate}% conv.</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SocialCommerceDashboard;