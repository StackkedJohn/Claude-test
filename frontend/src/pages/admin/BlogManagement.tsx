import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  SparklesIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { useBlogManagement } from '../../hooks/useBlogManagement';
import { useApprovalNotifications } from '../../hooks/useApprovalNotifications';
import BlogEditor from '../../components/Blog/BlogEditor';
import AIContentGenerator from '../../components/Blog/AIContentGenerator';
import ContentScheduler from '../../components/Blog/ContentScheduler';
import BlogAnalytics from '../../components/Blog/BlogAnalytics';
import CROAnalytics from '../../components/Blog/CROAnalytics';
import ApprovalWorkflow from '../../components/Blog/ApprovalWorkflow';
import SEOOptimization from '../../components/Blog/SEOOptimization';

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  author: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  categories: Array<{
    _id: string;
    name: string;
    color: string;
  }>;
  tags: string[];
  status: 'draft' | 'pending_approval' | 'scheduled' | 'published' | 'archived';
  publishedAt?: string;
  scheduledFor?: string;
  views: number;
  likes: number;
  readingTime: number;
  aiGenerated: {
    isAIGenerated: boolean;
    reviewStatus: 'pending' | 'approved' | 'rejected';
    confidence: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  postCount?: number;
}

const BlogManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'posts' | 'categories' | 'analytics' | 'cro' | 'generator' | 'scheduler' | 'approval' | 'seo'>('posts');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [aiFilter, setAIFilter] = useState<string>('all');
  
  const {
    posts,
    categories,
    loading,
    error,
    fetchPosts,
    approvePost,
    rejectPost,
    deletePost,
    publishPost,
    stats
  } = useBlogManagement();

  const { stats: approvalStats } = useApprovalNotifications();

  useEffect(() => {
    fetchPosts({ 
      search: searchQuery,
      status: statusFilter === 'all' ? undefined : statusFilter,
      category: categoryFilter === 'all' ? undefined : categoryFilter
    });
  }, [searchQuery, statusFilter, categoryFilter]);

  const filteredPosts = posts.filter(post => {
    if (aiFilter !== 'all') {
      if (aiFilter === 'ai' && !post.aiGenerated.isAIGenerated) return false;
      if (aiFilter === 'manual' && post.aiGenerated.isAIGenerated) return false;
    }
    return true;
  });

  const handlePostAction = async (action: string, post: BlogPost) => {
    try {
      switch (action) {
        case 'approve':
          await approvePost(post._id);
          break;
        case 'reject':
          await rejectPost(post._id);
          break;
        case 'publish':
          await publishPost(post._id);
          break;
        case 'delete':
          if (window.confirm('Are you sure you want to delete this post?')) {
            await deletePost(post._id);
          }
          break;
        case 'edit':
          setSelectedPost(post);
          setIsEditorOpen(true);
          break;
      }
      fetchPosts(); // Refresh list
    } catch (error) {
      console.error(`Failed to ${action} post:`, error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-blue-100 text-blue-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'pending_approval':
        return <ClockIcon className="w-4 h-4" />;
      case 'scheduled':
        return <CalendarIcon className="w-4 h-4" />;
      case 'archived':
        return <XCircleIcon className="w-4 h-4" />;
      default:
        return <PencilIcon className="w-4 h-4" />;
    }
  };

  const tabs = [
    { id: 'posts', label: 'Posts', icon: PencilIcon },
    { id: 'approval', label: 'Approval Queue', icon: ClipboardDocumentCheckIcon },
    { id: 'categories', label: 'Categories', icon: FunnelIcon },
    { id: 'analytics', label: 'Analytics', icon: EyeIcon },
    { id: 'cro', label: 'CRO Analytics', icon: CurrencyDollarIcon },
    { id: 'seo', label: 'SEO Optimization', icon: MagnifyingGlassIcon },
    { id: 'generator', label: 'AI Generator', icon: SparklesIcon },
    { id: 'scheduler', label: 'Scheduler', icon: CalendarIcon }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Blog Management</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage your blog content, AI generation, and analytics
              </p>
            </div>
            
            {activeTab === 'posts' && (
              <button
                onClick={() => {
                  setSelectedPost(null);
                  setIsEditorOpen(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                New Post
              </button>
            )}
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm relative',
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )}
                  >
                    <Icon className="-ml-0.5 mr-2 h-5 w-5" />
                    {tab.label}
                    {tab.id === 'approval' && approvalStats.totalPending > 0 && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {approvalStats.totalPending}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'posts' && (
            <motion.div
              key="posts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Filters and Search */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search posts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                  
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={aiFilter}
                    onChange={(e) => setAIFilter(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="all">All Posts</option>
                    <option value="ai">AI Generated</option>
                    <option value="manual">Manual Posts</option>
                  </select>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <PencilIcon className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Posts</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats?.totalPosts || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ClockIcon className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Pending Approval</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {filteredPosts.filter(p => p.status === 'pending_approval').length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <SparklesIcon className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">AI Generated</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {filteredPosts.filter(p => p.aiGenerated.isAIGenerated).length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <EyeIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Views</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {filteredPosts.reduce((sum, post) => sum + post.views, 0).toLocaleString()}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Posts Table */}
              {loading ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Post
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Author
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Performance
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredPosts.map((post) => (
                          <tr key={post._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-start space-x-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {post.title}
                                    </p>
                                    {post.aiGenerated.isAIGenerated && (
                                      <SparklesIcon className="h-4 w-4 text-purple-500" title="AI Generated" />
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500 truncate mt-1">
                                    {post.excerpt}
                                  </p>
                                  <div className="flex items-center space-x-2 mt-1">
                                    {post.categories.map(category => (
                                      <span
                                        key={category._id}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                        style={{ backgroundColor: category.color + '20', color: category.color }}
                                      >
                                        {category.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={cn(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                getStatusColor(post.status)
                              )}>
                                {getStatusIcon(post.status)}
                                <span className="ml-1">{post.status.replace('_', ' ')}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {post.author.avatar && (
                                  <img
                                    className="h-8 w-8 rounded-full mr-3"
                                    src={post.author.avatar}
                                    alt=""
                                  />
                                )}
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {post.author.firstName} {post.author.lastName}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                <div>{post.views.toLocaleString()} views</div>
                                <div className="text-xs text-gray-500">
                                  {post.likes} likes • {post.readingTime} min read
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handlePostAction('edit', post)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                
                                {post.status === 'pending_approval' && (
                                  <>
                                    <button
                                      onClick={() => handlePostAction('approve', post)}
                                      className="text-green-600 hover:text-green-900"
                                    >
                                      <CheckCircleIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handlePostAction('reject', post)}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      <XCircleIcon className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                                
                                {post.status === 'draft' && (
                                  <button
                                    onClick={() => handlePostAction('publish', post)}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    <CheckCircleIcon className="h-4 w-4" />
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => handlePostAction('delete', post)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {filteredPosts.length === 0 && (
                    <div className="text-center py-12">
                      <PencilIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No posts found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating a new blog post.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'categories' && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center py-12">
                <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Category Management</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Category management interface coming soon.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'approval' && (
            <motion.div
              key="approval"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ApprovalWorkflow onPostUpdated={fetchPosts} />
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <BlogAnalytics />
            </motion.div>
          )}

          {activeTab === 'cro' && (
            <motion.div
              key="cro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <CROAnalytics />
            </motion.div>
          )}

          {activeTab === 'generator' && (
            <motion.div
              key="generator"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AIContentGenerator onContentGenerated={() => fetchPosts()} />
            </motion.div>
          )}

          {activeTab === 'seo' && (
            <motion.div
              key="seo"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <SEOOptimization />
            </motion.div>
          )}

          {activeTab === 'scheduler' && (
            <motion.div
              key="scheduler"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ContentScheduler />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Blog Editor Modal */}
      <AnimatePresence>
        {isEditorOpen && (
          <BlogEditor
            post={selectedPost}
            categories={categories}
            onClose={() => {
              setIsEditorOpen(false);
              setSelectedPost(null);
            }}
            onSaved={() => {
              fetchPosts();
              setIsEditorOpen(false);
              setSelectedPost(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BlogManagement;