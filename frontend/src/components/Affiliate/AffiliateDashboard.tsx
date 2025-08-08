import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  LinkIcon,
  TrophyIcon,
  ClipboardIcon,
  ShareIcon,
  EyeIcon,
  ShoppingCartIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { CheckIcon, DocumentDuplicateIcon } from '@heroicons/react/24/solid';

interface AffiliateAnalytics {
  overview: {
    totalClicks: number;
    totalConversions: number;
    totalEarnings: number;
    conversionRate: number;
    averageOrderValue: number;
  };
  topProducts: Array<{
    name: string;
    sales: number;
    earnings: number;
  }>;
  recentActivity: Array<{
    date: Date;
    type: 'sale' | 'click';
    amount?: number;
    product?: string;
  }>;
  monthlyTrend: Array<{
    month: string;
    earnings: number;
    sales: number;
  }>;
}

interface AffiliateLink {
  id: string;
  customName?: string;
  affiliateUrl: string;
  shortCode: string;
  clickCount: number;
  conversionCount: number;
  createdAt: Date;
}

interface MarketingMaterials {
  banners: Array<{
    size: string;
    variants: string[];
  }>;
  productImages: Array<{
    product: string;
    images: string[];
  }>;
  copyTemplates: {
    headlines: string[];
    descriptions: string[];
    callsToActions: string[];
  };
  socialMediaTemplates: {
    instagram: string[];
    tiktok: string[];
  };
}

const AffiliateDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AffiliateAnalytics | null>(null);
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [materials, setMaterials] = useState<MarketingMaterials | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'materials' | 'leaderboard'>('overview');
  const [loading, setLoading] = useState(true);
  const [newLinkProduct, setNewLinkProduct] = useState('');
  const [newLinkName, setNewLinkName] = useState('');
  const [copiedText, setCopiedText] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [analyticsResponse, materialsResponse] = await Promise.all([
        fetch('/api/affiliate/analytics'),
        fetch('/api/affiliate/materials')
      ]);

      if (analyticsResponse.ok) {
        setAnalytics(await analyticsResponse.json());
      }

      if (materialsResponse.ok) {
        setMaterials(await materialsResponse.json());
      }

      // Mock links data
      setLinks([
        {
          id: 'link1',
          customName: 'Summer Campaign - Medium Pack',
          affiliateUrl: 'https://icepaca.com/products/medium-pack?utm_source=affiliate&utm_medium=referral&utm_campaign=summer&utm_content=ICEABC123',
          shortCode: 'abc123',
          clickCount: 45,
          conversionCount: 3,
          createdAt: new Date('2024-01-15')
        },
        {
          id: 'link2',
          customName: 'Instagram Story - Bundle',
          affiliateUrl: 'https://icepaca.com/products/adventure-bundle?utm_source=affiliate&utm_medium=referral&utm_campaign=instagram&utm_content=ICEABC123',
          shortCode: 'def456',
          clickCount: 78,
          conversionCount: 8,
          createdAt: new Date('2024-01-20')
        }
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAffiliateLink = async () => {
    if (!newLinkName.trim()) return;

    try {
      const response = await fetch('/api/affiliate/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: newLinkProduct || undefined,
          customName: newLinkName
        })
      });

      if (response.ok) {
        const { link } = await response.json();
        setLinks(prev => [...prev, {
          id: link.id,
          customName: link.customName,
          affiliateUrl: link.affiliateUrl,
          shortCode: link.shortCode,
          clickCount: 0,
          conversionCount: 0,
          createdAt: new Date()
        }]);
        setNewLinkName('');
        setNewLinkProduct('');
      }
    } catch (error) {
      console.error('Error creating affiliate link:', error);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
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

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'links', name: 'Links', icon: LinkIcon },
    { id: 'materials', name: 'Materials', icon: DocumentTextIcon },
    { id: 'leaderboard', name: 'Leaderboard', icon: TrophyIcon }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Affiliate Dashboard</h1>
        <p className="text-gray-600">Track your performance and manage your ICEPACA affiliate activities</p>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-2">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              <span className="text-2xl font-bold text-green-600">
                ${analytics.overview.totalEarnings.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-gray-600">Total Earnings</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-2">
              <EyeIcon className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">
                {analytics.overview.totalClicks.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-gray-600">Total Clicks</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-2">
              <ShoppingCartIcon className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900">
                {analytics.overview.totalConversions}
              </span>
            </div>
            <p className="text-sm text-gray-600">Total Sales</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-2">
              <ChartBarIcon className="h-8 w-8 text-orange-600" />
              <span className="text-2xl font-bold text-gray-900">
                {analytics.overview.conversionRate.toFixed(1)}%
              </span>
            </div>
            <p className="text-sm text-gray-600">Conversion Rate</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-2">
              <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
              <span className="text-2xl font-bold text-gray-900">
                ${analytics.overview.averageOrderValue.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-gray-600">Avg Order Value</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Products */}
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Top Performing Products</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {analytics.topProducts.map((product, index) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.sales} sales</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">${product.earnings.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {analytics.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'sale' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        {activity.type === 'sale' ? 'Sale' : 'Click'} - {activity.product}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.date.toLocaleDateString()}
                      </p>
                    </div>
                    {activity.amount && (
                      <span className="text-sm font-medium text-green-600">
                        +${activity.amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'links' && (
        <div className="space-y-8">
          {/* Create New Link */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Affiliate Link</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product (Optional)
                </label>
                <select
                  value={newLinkProduct}
                  onChange={(e) => setNewLinkProduct(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">General Store Link</option>
                  <option value="small-pack">ICEPACA Small Pack</option>
                  <option value="medium-pack">ICEPACA Medium Pack</option>
                  <option value="large-pack">ICEPACA Large Pack</option>
                  <option value="adventure-bundle">Adventure Bundle</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link Name
                </label>
                <input
                  type="text"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                  placeholder="e.g., Instagram Story Campaign"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={createAffiliateLink}
                  disabled={!newLinkName.trim()}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Link
                </button>
              </div>
            </div>
          </div>

          {/* Existing Links */}
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Your Affiliate Links</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Link Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clicks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conv. Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {links.map((link) => {
                    const conversionRate = link.clickCount > 0 
                      ? ((link.conversionCount / link.clickCount) * 100).toFixed(1)
                      : '0.0';
                    
                    return (
                      <tr key={link.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {link.customName || 'Unnamed Link'}
                            </div>
                            <div className="text-sm text-gray-500">
                              Created {link.createdAt.toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {link.clickCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {link.conversionCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {conversionRate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => copyToClipboard(link.affiliateUrl, link.customName || 'Link')}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                          >
                            {copiedText === (link.customName || 'Link') ? (
                              <>
                                <CheckIcon className="h-4 w-4 mr-1" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                                Copy Link
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'materials' && materials && (
        <div className="space-y-8">
          {/* Copy Templates */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Copy Templates</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Headlines</h4>
                <div className="space-y-2">
                  {materials.copyTemplates.headlines.map((headline, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{headline}</span>
                      <button
                        onClick={() => copyToClipboard(headline, `headline-${index}`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {copiedText === `headline-${index}` ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          <ClipboardIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Descriptions</h4>
                <div className="space-y-2">
                  {materials.copyTemplates.descriptions.map((desc, index) => (
                    <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700 flex-1 mr-2">{desc}</span>
                      <button
                        onClick={() => copyToClipboard(desc, `desc-${index}`)}
                        className="text-blue-600 hover:text-blue-800 mt-1"
                      >
                        {copiedText === `desc-${index}` ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          <ClipboardIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Call to Actions</h4>
                <div className="space-y-2">
                  {materials.copyTemplates.callsToActions.map((cta, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{cta}</span>
                      <button
                        onClick={() => copyToClipboard(cta, `cta-${index}`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {copiedText === `cta-${index}` ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          <ClipboardIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Social Media Templates */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Social Media Templates</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <div className="w-5 h-5 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600 rounded mr-2"></div>
                  Instagram
                </h4>
                <div className="space-y-3">
                  {materials.socialMediaTemplates.instagram.map((template, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 mb-2">{template}</p>
                      <button
                        onClick={() => copyToClipboard(template, `ig-${index}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        {copiedText === `ig-${index}` ? (
                          <>
                            <CheckIcon className="h-4 w-4 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <ClipboardIcon className="h-4 w-4 mr-1" />
                            Copy Template
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <div className="w-5 h-5 bg-black rounded mr-2"></div>
                  TikTok
                </h4>
                <div className="space-y-3">
                  {materials.socialMediaTemplates.tiktok.map((template, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 mb-2">{template}</p>
                      <button
                        onClick={() => copyToClipboard(template, `tt-${index}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        {copiedText === `tt-${index}` ? (
                          <>
                            <CheckIcon className="h-4 w-4 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <ClipboardIcon className="h-4 w-4 mr-1" />
                            Copy Template
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Banner Downloads */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Marketing Banners</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {materials.banners.map((banner) => (
                <div key={banner.size} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{banner.size}</h4>
                  <div className="space-y-2">
                    {banner.variants.map((variant, index) => (
                      <a
                        key={index}
                        href={variant}
                        download
                        className="block w-full p-2 text-center text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                      >
                        Download Variant {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Top Affiliates This Month</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <TrophyIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Leaderboard feature coming soon!</p>
              <p className="text-sm mt-1">Compete with other affiliates and win monthly bonuses.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AffiliateDashboard;