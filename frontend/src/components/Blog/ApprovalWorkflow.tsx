import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
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
  scheduledFor?: string;
  readingTime: number;
  aiGenerated: {
    isAIGenerated: boolean;
    confidence: number;
    reviewStatus: 'pending' | 'approved' | 'rejected';
    adminNotes?: string;
    researchSources?: string[];
    generationPrompt?: string;
  };
  cro?: {
    relatedProducts: Array<{
      productId: string;
      relevanceScore: number;
      matchReason: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

interface ApprovalWorkflowProps {
  onPostUpdated: () => void;
}

const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({ onPostUpdated }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ai_pending' | 'manual_pending' | 'high_priority'>('ai_pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch pending posts
  const fetchPendingPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/blog/admin/posts?status=pending_approval&limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending posts');
      }

      const data = await response.json();
      setPosts(data.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  // Handle post approval
  const handleApproval = async (postId: string, action: 'approve' | 'reject') => {
    try {
      setActionLoading(`${action}-${postId}`);

      const response = await fetch(`/api/blog/admin/posts/${postId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adminNotes: adminNotes.trim() || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} post`);
      }

      // Remove post from list
      setPosts(prev => prev.filter(post => post._id !== postId));
      
      // Clear selection and notes
      setSelectedPost(null);
      setAdminNotes('');
      setShowPreview(false);

      onPostUpdated();
      
      // Show success message
      const message = action === 'approve' ? 'Post approved and published!' : 'Post rejected and archived.';
      alert(message);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter posts based on selected filter
  const filteredPosts = posts.filter(post => {
    switch (filter) {
      case 'ai_pending':
        return post.aiGenerated.isAIGenerated && post.aiGenerated.reviewStatus === 'pending';
      case 'manual_pending':
        return !post.aiGenerated.isAIGenerated && post.status === 'pending_approval';
      case 'high_priority':
        return (post.aiGenerated.isAIGenerated && post.aiGenerated.confidence > 0.8) ||
               new Date(post.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours
      case 'all':
      default:
        return true;
    }
  });

  const sortedPosts = filteredPosts.sort((a, b) => {
    // Sort by AI confidence (high first), then by creation date (newest first)
    if (a.aiGenerated.isAIGenerated && b.aiGenerated.isAIGenerated) {
      if (a.aiGenerated.confidence !== b.aiGenerated.confidence) {
        return b.aiGenerated.confidence - a.aiGenerated.confidence;
      }
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  useEffect(() => {
    fetchPendingPosts();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getPriorityLevel = (post: BlogPost) => {
    if (post.aiGenerated.isAIGenerated && post.aiGenerated.confidence > 0.85) return 'high';
    if (post.aiGenerated.isAIGenerated && post.aiGenerated.confidence < 0.5) return 'low';
    return 'medium';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Approval Queue</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={fetchPendingPosts}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content Approval Workflow</h2>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve AI-generated and manual content before publication
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Filter Dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="ai_pending">AI Pending Review</option>
            <option value="manual_pending">Manual Pending</option>
            <option value="high_priority">High Priority</option>
            <option value="all">All Pending</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchPendingPosts}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ClockIcon className="mr-2 h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Pending</p>
              <p className="text-2xl font-bold text-gray-900">{posts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <SparklesIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">AI Generated</p>
              <p className="text-2xl font-bold text-gray-900">
                {posts.filter(p => p.aiGenerated.isAIGenerated).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">High Priority</p>
              <p className="text-2xl font-bold text-gray-900">
                {posts.filter(p => getPriorityLevel(p) === 'high').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Last 24h</p>
              <p className="text-2xl font-bold text-gray-900">
                {posts.filter(p => 
                  new Date(p.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
                ).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {sortedPosts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No pending posts</h3>
            <p className="mt-1 text-sm text-gray-500">
              All posts have been reviewed and approved. Great work!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedPosts.map((post) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Post Header */}
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                        {post.title}
                      </h3>
                      
                      {/* AI Badge */}
                      {post.aiGenerated.isAIGenerated && (
                        <div className="flex items-center space-x-2">
                          <SparklesIcon className="h-4 w-4 text-purple-500" />
                          <span className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            getConfidenceColor(post.aiGenerated.confidence)
                          )}>
                            {Math.round(post.aiGenerated.confidence * 100)}% AI
                          </span>
                        </div>
                      )}
                      
                      {/* Priority Badge */}
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        getPriorityColor(getPriorityLevel(post))
                      )}>
                        {getPriorityLevel(post).toUpperCase()} PRIORITY
                      </span>
                    </div>

                    {/* Post Excerpt */}
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>

                    {/* Meta Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-1" />
                        {post.author.firstName} {post.author.lastName}
                      </div>
                      
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {formatDate(post.createdAt)}
                      </div>
                      
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-4 w-4 mr-1" />
                        {post.readingTime} min read
                      </div>
                      
                      {post.cro?.relatedProducts && (
                        <div className="flex items-center">
                          <TagIcon className="h-4 w-4 mr-1" />
                          {post.cro.relatedProducts.length} products
                        </div>
                      )}
                    </div>

                    {/* Categories and Tags */}
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      {post.categories.slice(0, 2).map(category => (
                        <span
                          key={category._id}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${category.color}20`, color: category.color }}
                        >
                          {category.name}
                        </span>
                      ))}
                      
                      {post.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                        >
                          #{tag}
                        </span>
                      ))}
                      
                      {(post.categories.length > 2 || post.tags.length > 3) && (
                        <span className="text-xs text-gray-500">
                          +{(post.categories.length - 2) + (post.tags.length - 3)} more
                        </span>
                      )}
                    </div>

                    {/* AI Generation Details */}
                    {post.aiGenerated.isAIGenerated && (
                      <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-start space-x-2">
                          <SparklesIcon className="h-4 w-4 text-purple-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-purple-900">AI Generation Details</p>
                            {post.aiGenerated.generationPrompt && (
                              <p className="text-sm text-purple-700 mt-1">
                                <strong>Prompt:</strong> {post.aiGenerated.generationPrompt}
                              </p>
                            )}
                            {post.aiGenerated.researchSources && post.aiGenerated.researchSources.length > 0 && (
                              <p className="text-sm text-purple-700 mt-1">
                                <strong>Sources:</strong> {post.aiGenerated.researchSources.length} research sources
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2 ml-6">
                    <button
                      onClick={() => {
                        setSelectedPost(post);
                        setShowPreview(true);
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Preview
                    </button>

                    <button
                      onClick={() => {
                        setSelectedPost(post);
                        setAdminNotes('');
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                      Review
                    </button>

                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleApproval(post._id, 'approve')}
                        disabled={actionLoading === `approve-${post._id}`}
                        className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                      >
                        {actionLoading === `approve-${post._id}` ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                          <CheckCircleIcon className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        onClick={() => handleApproval(post._id, 'reject')}
                        disabled={actionLoading === `reject-${post._id}`}
                        className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                      >
                        {actionLoading === `reject-${post._id}` ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                          <XCircleIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedPost && !showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Review Post: {selectedPost.title}
                  </h3>
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Notes (Optional)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={4}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                      placeholder="Add any notes about this review decision..."
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleApproval(selectedPost._id, 'approve')}
                      disabled={actionLoading === `approve-${selectedPost._id}`}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {actionLoading === `approve-${selectedPost._id}` ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      ) : (
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                      )}
                      Approve & Publish
                    </button>

                    <button
                      onClick={() => handleApproval(selectedPost._id, 'reject')}
                      disabled={actionLoading === `reject-${selectedPost._id}`}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                    >
                      {actionLoading === `reject-${selectedPost._id}` ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 mr-2" />
                      )}
                      Reject & Archive
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedPost.title}
                  </h2>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="prose max-w-none">
                  <p className="text-lg text-gray-600 mb-6">
                    {selectedPost.excerpt}
                  </p>
                  
                  <div 
                    dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                  />
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      Created: {formatDate(selectedPost.createdAt)} • 
                      {selectedPost.readingTime} min read
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setShowPreview(false);
                          setSelectedPost(selectedPost);
                        }}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ApprovalWorkflow;