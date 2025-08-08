import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { useCompetitorAnalysis, useSEORecommendations } from '../../hooks/useSEO';
import { cn } from '../../utils/cn';

interface SEOMetrics {
  totalPages: number;
  pagesWithMeta: number;
  pagesWithSchema: number;
  avgTitleLength: number;
  avgDescriptionLength: number;
  keywordDensity: number;
}

interface PageAnalysis {
  id: string;
  type: 'product' | 'blog' | 'page';
  title: string;
  url: string;
  metaScore: number;
  schemaScore: number;
  issues: string[];
  lastOptimized: Date;
}

const SEODashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'competitors' | 'recommendations'>('overview');
  const [metrics, setMetrics] = useState<SEOMetrics | null>(null);
  const [pageAnalyses, setPageAnalyses] = useState<PageAnalysis[]>([]);
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);

  const { analysis, loading: competitorLoading, analyzeCompetitors } = useCompetitorAnalysis();

  // Mock data for demonstration
  useEffect(() => {
    // In a real app, this would fetch from your API
    setMetrics({
      totalPages: 45,
      pagesWithMeta: 42,
      pagesWithSchema: 38,
      avgTitleLength: 58,
      avgDescriptionLength: 148,
      keywordDensity: 2.1
    });

    setPageAnalyses([
      {
        id: '1',
        type: 'product',
        title: 'ICEPACA Small Pack',
        url: '/products/small-pack',
        metaScore: 95,
        schemaScore: 100,
        issues: [],
        lastOptimized: new Date('2024-01-15')
      },
      {
        id: '2',
        type: 'product',
        title: 'ICEPACA Medium Pack',
        url: '/products/medium-pack',
        metaScore: 85,
        schemaScore: 90,
        issues: ['Description too short'],
        lastOptimized: new Date('2024-01-10')
      },
      {
        id: '3',
        type: 'blog',
        title: 'Best Practices for Ice Pack Care',
        url: '/blog/ice-pack-care',
        metaScore: 70,
        schemaScore: 80,
        issues: ['Title too long', 'Missing keywords'],
        lastOptimized: new Date('2024-01-05')
      }
    ]);
  }, []);

  const handleCompetitorAnalysis = () => {
    const validUrls = competitorUrls.filter(url => url.trim().length > 0);
    if (validUrls.length > 0) {
      analyzeCompetitors(validUrls);
    }
  };

  const addCompetitorUrl = () => {
    setCompetitorUrls([...competitorUrls, '']);
  };

  const updateCompetitorUrl = (index: number, url: string) => {
    const updated = [...competitorUrls];
    updated[index] = url;
    setCompetitorUrls(updated);
  };

  const removeCompetitorUrl = (index: number) => {
    setCompetitorUrls(competitorUrls.filter((_, i) => i !== index));
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    return 'Needs Work';
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'pages', name: 'Page Analysis', icon: DocumentTextIcon },
    { id: 'competitors', name: 'Competitors', icon: MagnifyingGlassIcon },
    { id: 'recommendations', name: 'Recommendations', icon: ExclamationTriangleIcon }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SEO Dashboard</h1>
        <p className="text-gray-600">
          Monitor and optimize your site's search engine performance
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'py-2 px-1 border-b-2 font-medium text-sm flex items-center',
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && metrics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Total Pages</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalPages}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">With Meta Tags</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.pagesWithMeta}
                    <span className="text-sm text-green-600 ml-1">
                      ({((metrics.pagesWithMeta / metrics.totalPages) * 100).toFixed(0)}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <ShareIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">With Schema</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.pagesWithSchema}
                    <span className="text-sm text-purple-600 ml-1">
                      ({((metrics.pagesWithSchema / metrics.totalPages) * 100).toFixed(0)}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <EyeIcon className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Avg Title Length</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.avgTitleLength}
                    <span className={cn(
                      "text-sm ml-1",
                      metrics.avgTitleLength <= 60 ? "text-green-600" : "text-red-600"
                    )}>
                      chars
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SEO Health Score */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Health Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#10b981"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(metrics.pagesWithMeta / metrics.totalPages) * 352} 352`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-green-600">
                      {((metrics.pagesWithMeta / metrics.totalPages) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Meta Tag Coverage</p>
              </div>

              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#8b5cf6"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(metrics.pagesWithSchema / metrics.totalPages) * 352} 352`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-purple-600">
                      {((metrics.pagesWithSchema / metrics.totalPages) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Schema Markup Coverage</p>
              </div>

              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#f59e0b"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(metrics.keywordDensity / 5) * 352} 352`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-yellow-600">
                      {metrics.keywordDensity}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Avg Keyword Density</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Page Analysis Tab */}
      {activeTab === 'pages' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Page SEO Analysis</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Page
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Meta Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Schema Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issues
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Optimized
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pageAnalyses.map((page) => (
                    <tr key={page.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{page.title}</div>
                          <div className="text-sm text-gray-500">{page.url}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                          page.type === 'product' ? "bg-blue-100 text-blue-800" :
                          page.type === 'blog' ? "bg-green-100 text-green-800" :
                          "bg-gray-100 text-gray-800"
                        )}>
                          {page.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={cn(
                            "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                            getScoreColor(page.metaScore)
                          )}>
                            {page.metaScore}%
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            {getScoreBadge(page.metaScore)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={cn(
                            "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                            getScoreColor(page.schemaScore)
                          )}>
                            {page.schemaScore}%
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            {getScoreBadge(page.schemaScore)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {page.issues.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {page.issues.map((issue, index) => (
                              <span
                                key={index}
                                className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full"
                              >
                                {issue}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-green-600">No issues</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {page.lastOptimized.toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Competitors Tab */}
      {activeTab === 'competitors' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Competitor SEO Analysis</h3>
            
            <div className="space-y-4 mb-6">
              {competitorUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateCompetitorUrl(index, e.target.value)}
                    placeholder="Enter competitor URL..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => removeCompetitorUrl(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={addCompetitorUrl}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
              >
                Add URL
              </button>
              <button
                onClick={handleCompetitorAnalysis}
                disabled={competitorLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {competitorLoading ? 'Analyzing...' : 'Analyze Competitors'}
              </button>
            </div>

            {analysis && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Analysis Results</h4>
                <div className="space-y-4">
                  {analysis.analysis.map((comp: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">{comp.url}</h5>
                      {comp.error ? (
                        <p className="text-red-600 text-sm">{comp.error}</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">
                              <strong>Title:</strong> {comp.title || 'N/A'} 
                              {comp.titleLength && (
                                <span className={cn(
                                  "ml-2 text-xs",
                                  comp.titleLength <= 60 ? "text-green-600" : "text-red-600"
                                )}>
                                  ({comp.titleLength} chars)
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Description:</strong> {comp.description ? comp.description.slice(0, 100) + '...' : 'N/A'}
                              {comp.descriptionLength && (
                                <span className={cn(
                                  "ml-2 text-xs",
                                  comp.descriptionLength <= 160 ? "text-green-600" : "text-red-600"
                                )}>
                                  ({comp.descriptionLength} chars)
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              <strong>Keywords:</strong> {comp.keywords?.length || 0} found
                            </p>
                            {comp.recommendations && comp.recommendations.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm font-medium text-gray-700">Recommendations:</p>
                                <ul className="text-xs text-gray-600 mt-1 space-y-1">
                                  {comp.recommendations.map((rec: string, idx: number) => (
                                    <li key={idx}>• {rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Recommendations</h3>
            
            <div className="space-y-4">
              <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">High Priority</h4>
                    <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                      <li>• Fix 3 pages with missing meta descriptions</li>
                      <li>• Add schema markup to 7 product pages</li>
                      <li>• Optimize 5 pages with titles over 60 characters</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
                <div className="flex">
                  <ChartBarIcon className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800">Medium Priority</h4>
                    <ul className="mt-2 text-sm text-blue-700 space-y-1">
                      <li>• Improve keyword density on 12 pages</li>
                      <li>• Add alt text to 8 images</li>
                      <li>• Update outdated meta descriptions on 6 blog posts</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-green-400 bg-green-50 p-4">
                <div className="flex">
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-green-800">Low Priority</h4>
                    <ul className="mt-2 text-sm text-green-700 space-y-1">
                      <li>• Consider adding FAQ schema to product pages</li>
                      <li>• Optimize internal linking structure</li>
                      <li>• Add social media meta tags</li>
                    </ul>
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

export default SEODashboard;