import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  MousePointerClickIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface CROSummary {
  totalPosts: number;
  totalProductClicks: number;
  totalConversions: number;
  totalRevenue: number;
  postsWithRecommendations: number;
}

interface TopPerformingPost {
  _id: string;
  title: string;
  slug: string;
  cro: {
    productClickThroughs: number;
    productConversions: number;
    revenueGenerated: number;
  };
}

interface CROAnalyticsData {
  summary: CROSummary;
  topPerformingPosts: TopPerformingPost[];
  conversionRate: number;
  averageRevenuePerPost: number;
}

const CROAnalytics: React.FC = () => {
  const [data, setData] = useState<CROAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  // Fetch CRO analytics data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/blog/admin/analytics/cro?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CRO analytics');
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Batch update product recommendations
  const handleBatchUpdate = async () => {
    try {
      const response = await fetch('/api/blog/admin/posts/batch-update-recommendations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to start batch update');
      }

      alert('Batch update started! This process will run in the background.');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeframe]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const getTimeframeLabel = (tf: string) => {
    switch (tf) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      default: return 'Last 30 Days';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-red-600 mb-4">
          <ChartBarIcon className="mx-auto h-12 w-12 mb-2" />
          <p className="font-medium">Failed to load CRO analytics</p>
          {error && <p className="text-sm text-gray-500 mt-1">{error}</p>}
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
        >
          <ArrowPathIcon className="mr-2 h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blog CRO Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track product recommendations performance and revenue impact
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Timeframe Selector */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          {/* Batch Update Button */}
          <button
            onClick={handleBatchUpdate}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            <ArrowPathIcon className="mr-2 h-4 w-4" />
            Update All Recommendations
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MousePointerClickIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Product Clicks
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {formatNumber(data.summary.totalProductClicks)}
                </dd>
              </dl>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShoppingCartIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Conversions
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {formatNumber(data.summary.totalConversions)}
                </dd>
              </dl>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUpIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Conversion Rate
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {formatPercentage(data.conversionRate)}
                </dd>
              </dl>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Revenue Generated
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {formatCurrency(data.summary.totalRevenue)}
                </dd>
              </dl>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Blog Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total Blog Posts</span>
              <span className="font-medium">{formatNumber(data.summary.totalPosts)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Posts with Recommendations</span>
              <span className="font-medium">{formatNumber(data.summary.postsWithRecommendations)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Coverage Rate</span>
              <span className="font-medium">
                {formatPercentage(
                  data.summary.totalPosts > 0 
                    ? (data.summary.postsWithRecommendations / data.summary.totalPosts) * 100 
                    : 0
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Average Revenue per Post</span>
              <span className="font-medium">{formatCurrency(data.averageRevenuePerPost)}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Performing Posts ({getTimeframeLabel(timeframe)})
          </h3>
          
          {data.topPerformingPosts.length === 0 ? (
            <div className="text-center py-8">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">No performance data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.topPerformingPosts.slice(0, 5).map((post, index) => (
                <div
                  key={post._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className={cn(
                        'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mr-3',
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-50 text-gray-600'
                      )}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {post.title}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{post.cro.productClickThroughs} clicks</span>
                          <span>{post.cro.productConversions} conversions</span>
                          <span>{formatCurrency(post.cro.revenueGenerated)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {post.cro.productClickThroughs > 0 ? (
                      <TrendingUpIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDownIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Insights and Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights & Recommendations</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Performance Insights</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              {data.conversionRate < 2 && (
                <li className="flex items-start">
                  <span className="text-yellow-500 mr-2">⚠️</span>
                  Conversion rate is below 2%. Consider improving product relevance or positioning.
                </li>
              )}
              {data.conversionRate > 5 && (
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✅</span>
                  Excellent conversion rate! Your product recommendations are highly effective.
                </li>
              )}
              {data.summary.postsWithRecommendations < data.summary.totalPosts * 0.8 && (
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">💡</span>
                  Consider running a batch update to add recommendations to more posts.
                </li>
              )}
              {data.summary.totalRevenue > 1000 && (
                <li className="flex items-start">
                  <span className="text-purple-500 mr-2">🎉</span>
                  Great job! Blog-driven revenue is making a significant impact.
                </li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Action Items</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-gray-400 mr-2">•</span>
                Review top-performing posts to understand what drives conversions
              </li>
              <li className="flex items-start">
                <span className="text-gray-400 mr-2">•</span>
                Update product recommendations monthly to maintain relevance
              </li>
              <li className="flex items-start">
                <span className="text-gray-400 mr-2">•</span>
                A/B test different product positioning strategies
              </li>
              <li className="flex items-start">
                <span className="text-gray-400 mr-2">•</span>
                Create more content around high-converting product categories
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CROAnalytics;