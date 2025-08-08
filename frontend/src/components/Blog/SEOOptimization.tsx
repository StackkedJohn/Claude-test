import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  LinkIcon,
  PhotoIcon,
  TagIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface SEOAnalysis {
  score: number;
  issues: SEOIssue[];
  recommendations: SEORecommendation[];
  metaData: {
    title: string;
    description: string;
    keywords: string[];
    readabilityScore: number;
    wordCount: number;
    headingStructure: HeadingAnalysis;
    imageOptimization: ImageAnalysis;
    linkAnalysis: LinkAnalysis;
  };
}

interface SEOIssue {
  type: 'critical' | 'warning' | 'minor';
  message: string;
  element?: string;
  suggestion: string;
}

interface SEORecommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'content' | 'technical' | 'keywords' | 'meta';
  title: string;
  description: string;
  implementation: string;
}

interface HeadingAnalysis {
  h1Count: number;
  h2Count: number;
  h3Count: number;
  missingH1: boolean;
  properHierarchy: boolean;
  headingsWithKeywords: number;
}

interface ImageAnalysis {
  totalImages: number;
  missingAlt: number;
  oversizedImages: number;
  optimizationScore: number;
}

interface LinkAnalysis {
  internalLinks: number;
  externalLinks: number;
  brokenLinks: string[];
  linkDiversity: number;
}

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  status: string;
  analysis?: SEOAnalysis;
}

interface SEORecommendationsData {
  summary: {
    totalPosts: number;
    averageScore: number;
    postsNeedingAttention: number;
    topIssueTypes: [string, number][];
    topRecommendationCategories: [string, number][];
  };
  postsNeedingImprovement: Array<{
    postId: string;
    title: string;
    slug: string;
    analysis: SEOAnalysis;
  }>;
  globalRecommendations: SEORecommendation[];
}

const SEOOptimization: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'recommendations'>('overview');
  const [selectedPost, setSelectedPost] = useState<string>('');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [seoData, setSeoData] = useState<SEORecommendationsData | null>(null);
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch posts and SEO overview data
  useEffect(() => {
    fetchSEOOverview();
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/blog/admin/posts?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const fetchSEOOverview = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/blog/admin/seo/recommendations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSeoData(data);
      }
    } catch (error) {
      setError('Failed to fetch SEO data');
      console.error('Error fetching SEO overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzePost = async (postId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/blog/admin/posts/${postId}/seo-analysis`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      } else {
        setError('Failed to analyze post');
      }
    } catch (error) {
      setError('Error analyzing post');
      console.error('Error analyzing post:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreColorRing = (score: number) => {
    if (score >= 80) return 'stroke-green-500';
    if (score >= 60) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'critical': return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default: return <ExclamationTriangleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'content': return <DocumentTextIcon className="h-4 w-4" />;
      case 'technical': return <LinkIcon className="h-4 w-4" />;
      case 'keywords': return <TagIcon className="h-4 w-4" />;
      case 'meta': return <MagnifyingGlassIcon className="h-4 w-4" />;
      default: return <CheckCircleIcon className="h-4 w-4" />;
    }
  };

  const CircularProgress: React.FC<{ score: number; size?: number }> = ({ score, size = 120 }) => {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={getScoreColorRing(score)}
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-2xl font-bold', getScoreColor(score))}>
            {Math.round(score)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SEO Optimization</h2>
          <p className="text-sm text-gray-500 mt-1">
            Analyze and optimize your blog content for better search engine visibility
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'analysis', label: 'Post Analysis', icon: MagnifyingGlassIcon },
            { id: 'recommendations', label: 'Recommendations', icon: LightBulbIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm',
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className="-ml-0.5 mr-2 h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {loading ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-32 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              </div>
            ) : seoData ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total Posts</p>
                        <p className="text-2xl font-bold text-gray-900">{seoData.summary.totalPosts}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CircularProgress score={seoData.summary.averageScore} size={60} />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Avg SEO Score</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {Math.round(seoData.summary.averageScore)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Need Attention</p>
                        <p className="text-2xl font-bold text-gray-900">{seoData.summary.postsNeedingAttention}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Optimization Rate</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {Math.round(((seoData.summary.totalPosts - seoData.summary.postsNeedingAttention) / seoData.summary.totalPosts) * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Issues */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Top Issues</h3>
                    <div className="space-y-3">
                      {seoData.summary.topIssueTypes.map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center">
                            {getIssueIcon(type)}
                            <span className="ml-2 text-sm font-medium text-gray-700 capitalize">
                              {type} Issues
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendation Categories</h3>
                    <div className="space-y-3">
                      {seoData.summary.topRecommendationCategories.map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <div className="flex items-center">
                            {getCategoryIcon(category)}
                            <span className="ml-2 text-sm font-medium text-gray-700 capitalize">
                              {category}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Posts Needing Improvement */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Posts Needing Improvement</h3>
                    <p className="text-sm text-gray-500 mt-1">Sorted by lowest SEO score</p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {seoData.postsNeedingImprovement.slice(0, 5).map((post) => (
                      <div key={post.postId} className="p-6 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{post.title}</h4>
                            <div className="flex items-center mt-2 space-x-4">
                              <span className={cn(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                getScoreColor(post.analysis.score)
                              )}>
                                SEO Score: {Math.round(post.analysis.score)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {post.analysis.issues.length} issues
                              </span>
                              <span className="text-xs text-gray-500">
                                {post.analysis.recommendations.length} recommendations
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedPost(post.postId);
                              setActiveTab('analysis');
                              analyzePost(post.postId);
                            }}
                            className="ml-4 inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Analyze
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load SEO Data</h3>
                <p className="text-gray-500 mb-4">{error}</p>
                <button
                  onClick={fetchSEOOverview}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                >
                  Try Again
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Post Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <label htmlFor="post-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Post to Analyze
              </label>
              <div className="flex space-x-4">
                <select
                  id="post-select"
                  value={selectedPost}
                  onChange={(e) => setSelectedPost(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                >
                  <option value="">Choose a post...</option>
                  {posts.map((post) => (
                    <option key={post._id} value={post._id}>
                      {post.title} ({post.status})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => selectedPost && analyzePost(selectedPost)}
                  disabled={!selectedPost || loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  ) : (
                    <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                  )}
                  Analyze
                </button>
              </div>
            </div>

            {/* Analysis Results */}
            {analysis && (
              <div className="space-y-6">
                {/* SEO Score Overview */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">SEO Analysis Results</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Word Count</p>
                          <p className="font-medium">{analysis.metaData.wordCount}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Readability</p>
                          <p className="font-medium">{Math.round(analysis.metaData.readabilityScore)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Issues</p>
                          <p className="font-medium">{analysis.issues.length}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Recommendations</p>
                          <p className="font-medium">{analysis.recommendations.length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-6">
                      <CircularProgress score={analysis.score} />
                    </div>
                  </div>
                </div>

                {/* Issues */}
                {analysis.issues.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Issues Found</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {analysis.issues.map((issue, index) => (
                        <div key={index} className="p-6">
                          <div className="flex items-start">
                            {getIssueIcon(issue.type)}
                            <div className="ml-3 flex-1">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-gray-900">{issue.message}</p>
                                <span className={cn(
                                  'ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                                  issue.type === 'critical' ? 'bg-red-100 text-red-800' :
                                  issue.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                )}>
                                  {issue.type.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{issue.suggestion}</p>
                              {issue.element && (
                                <p className="text-xs text-gray-500 mt-1">Element: {issue.element}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {analysis.recommendations.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Recommendations</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {analysis.recommendations.map((rec, index) => (
                        <div key={index} className="p-6">
                          <div className="flex items-start">
                            <LightBulbIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
                            <div className="ml-3 flex-1">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-gray-900">{rec.title}</p>
                                <span className={cn(
                                  'ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                                  getPriorityColor(rec.priority)
                                )}>
                                  {rec.priority.toUpperCase()}
                                </span>
                                <span className="ml-2 inline-flex items-center">
                                  {getCategoryIcon(rec.category)}
                                  <span className="ml-1 text-xs text-gray-500 capitalize">{rec.category}</span>
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                              <p className="text-sm text-gray-700 mt-2 font-medium">
                                Implementation: {rec.implementation}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <motion.div
            key="recommendations"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {seoData?.globalRecommendations && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Global SEO Recommendations</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    These recommendations apply across multiple posts in your blog
                  </p>
                </div>
                <div className="divide-y divide-gray-200">
                  {seoData.globalRecommendations.map((rec, index) => (
                    <div key={index} className="p-6">
                      <div className="flex items-start">
                        <LightBulbIcon className="h-6 w-6 text-yellow-500 mt-0.5" />
                        <div className="ml-4 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <h4 className="text-base font-medium text-gray-900">{rec.title}</h4>
                              <span className={cn(
                                'ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                                getPriorityColor(rec.priority)
                              )}>
                                {rec.priority.toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              Affects {rec.affectedPosts} posts
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">{rec.description}</p>
                          <p className="text-sm text-gray-700 mt-3 font-medium">
                            Implementation: {rec.implementation}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SEOOptimization;