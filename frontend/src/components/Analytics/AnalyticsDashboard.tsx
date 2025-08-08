import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  EyeIcon,
  UserIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  SparklesIcon,
  GlobeAmericasIcon
} from '@heroicons/react/24/outline';
import { useAdminAnalytics } from '../../hooks/useAnalytics';
import { cn } from '../../utils/cn';

interface DashboardMetric {
  label: string;
  value: string | number;
  change: number;
  icon: React.ComponentType<any>;
  color: string;
}

interface ChartData {
  date: string;
  sessions: number;
  pageviews: number;
  conversions: number;
  revenue: number;
}

const AnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [realTimeData, setRealTimeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { getICEPACADashboard, getRealTimeData } = useAdminAnalytics();

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dashboard, realtime] = await Promise.all([
          getICEPACADashboard(timeRange),
          getRealTimeData()
        ]);
        setDashboardData(dashboard);
        setRealTimeData(realtime);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange, getICEPACADashboard, getRealTimeData]);

  // Auto-refresh real-time data
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const realtime = await getRealTimeData();
        setRealTimeData(realtime);
      } catch (error) {
        console.error('Error refreshing real-time data:', error);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [getRealTimeData]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow border">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Mock data for demonstration (in real app, this would come from dashboardData)
  const metrics: DashboardMetric[] = [
    {
      label: 'Total Sessions',
      value: dashboardData?.overview?.totals?.sessions || '12,543',
      change: 12.5,
      icon: UserIcon,
      color: 'text-blue-600'
    },
    {
      label: 'Page Views',
      value: dashboardData?.overview?.totals?.pageviews || '24,891',
      change: 8.2,
      icon: EyeIcon,
      color: 'text-green-600'
    },
    {
      label: 'Conversions',
      value: '342',
      change: 15.3,
      icon: ShoppingCartIcon,
      color: 'text-purple-600'
    },
    {
      label: 'Revenue',
      value: '$8,429',
      change: 22.1,
      icon: CurrencyDollarIcon,
      color: 'text-yellow-600'
    }
  ];

  const aiFeatureMetrics = [
    {
      name: 'AI Chatbot',
      usage: 1247,
      engagement: 78,
      conversions: 23,
      color: 'bg-blue-500'
    },
    {
      name: 'AR Preview',
      usage: 892,
      engagement: 85,
      conversions: 34,
      color: 'bg-purple-500'
    },
    {
      name: 'Dynamic Pricing',
      usage: 3241,
      engagement: 45,
      conversions: 18,
      color: 'bg-green-500'
    },
    {
      name: 'Fraud Detection',
      usage: 156,
      engagement: 95,
      conversions: 87,
      color: 'bg-red-500'
    }
  ];

  const topProducts = dashboardData?.products?.data?.slice(0, 5) || [
    { pagePath: '/products/small-pack', sessions: 1234, pageviews: 2341 },
    { pagePath: '/products/medium-pack', sessions: 1098, pageviews: 2156 },
    { pagePath: '/products/large-pack', sessions: 987, pageviews: 1876 },
    { pagePath: '/products/bundle', sessions: 756, pageviews: 1432 }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Monitor your ICEPACA store performance and AI features</p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex bg-white rounded-lg border p-1">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days as 7 | 30 | 90)}
              className={cn(
                'px-3 py-1 rounded text-sm font-medium transition-colors',
                timeRange === days
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-blue-600'
              )}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Banner */}
      {realTimeData && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center mr-6">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-sm font-medium text-gray-700">Live</span>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <span className="text-gray-600">
                  <strong className="text-gray-900">{realTimeData.activeUsers}</strong> active users
                </span>
                <span className="text-gray-600">
                  <strong className="text-gray-900">{realTimeData.currentPageViews}</strong> current views
                </span>
              </div>
            </div>
            <GlobeAmericasIcon className="h-5 w-5 text-blue-600" />
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const isPositive = metric.change > 0;
          
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-lg shadow border hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={cn('h-8 w-8', metric.color)} />
                <div className="flex items-center text-sm">
                  {isPositive ? (
                    <TrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={cn(
                    'font-medium',
                    isPositive ? 'text-green-500' : 'text-red-500'
                  )}>
                    {Math.abs(metric.change)}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
                <p className="text-sm text-gray-600">{metric.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Sessions Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-lg shadow border"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-blue-600" />
            Sessions Over Time
          </h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            {/* Placeholder for chart */}
            <p>Chart will be rendered here with real data visualization library</p>
          </div>
        </motion.div>

        {/* AI Features Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-6 rounded-lg shadow border"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <SparklesIcon className="h-5 w-5 mr-2 text-purple-600" />
            AI Features Performance
          </h3>
          <div className="space-y-4">
            {aiFeatureMetrics.map((feature) => (
              <div key={feature.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={cn('w-3 h-3 rounded-full mr-3', feature.color)}></div>
                  <span className="text-sm font-medium text-gray-700">{feature.name}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{feature.usage} uses</span>
                  <span>{feature.engagement}% engagement</span>
                  <span className="text-green-600 font-medium">{feature.conversions}% conv.</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-lg shadow border overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topProducts.map((product, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.pagePath.replace('/products/', '').replace('-', ' ').toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.sessions?.toLocaleString() || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.pageviews?.toLocaleString() || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Real-time Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-lg shadow border"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              Real-time Activity
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {realTimeData?.topPages?.slice(0, 5).map((page: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700 truncate">{page.page}</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-500">{page.activeUsers} users</span>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Real-time data will appear here</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;