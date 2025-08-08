import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  SparklesIcon,
  TagIcon,
  CalendarIcon,
  EyeIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { debounce } from '../../utils/debounce';

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
    slug: string;
  }>;
  tags: string[];
  publishedAt: string;
  views: number;
  likes: number;
  readingTime: number;
  featuredImage?: {
    url: string;
    alt: string;
  };
  aiGenerated: {
    isAIGenerated: boolean;
  };
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  color: string;
  postCount: number;
}

interface BlogSearchProps {
  onPostClick: (post: BlogPost) => void;
  categories?: Category[];
  className?: string;
}

interface SearchFilters {
  search: string;
  category: string;
  tag: string;
  sort: 'newest' | 'oldest' | 'popular' | 'trending';
  aiFilter: 'all' | 'ai' | 'manual';
}

const BlogSearch: React.FC<BlogSearchProps> = ({
  onPostClick,
  categories = [],
  className = ''
}) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popularTags, setPopularTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    category: 'all',
    tag: '',
    sort: 'newest',
    aiFilter: 'all'
  });

  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      setFilters(prev => ({ ...prev, search: searchTerm }));
    }, 300),
    []
  );

  // Fetch posts based on current filters
  const fetchPosts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort: filters.sort
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.category !== 'all') {
        const category = categories.find(c => c._id === filters.category);
        if (category) params.append('category', category.slug);
      }
      if (filters.tag) params.append('tag', filters.tag);

      const response = await fetch(`/api/blog/posts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch posts');

      const data = await response.json();
      setPosts(data.posts);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch popular tags
  const fetchPopularTags = async () => {
    try {
      const response = await fetch('/api/blog/tags');
      if (response.ok) {
        const tags = await response.json();
        setPopularTags(tags.slice(0, 10));
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  // Apply local filtering for AI filter
  useEffect(() => {
    let filtered = [...posts];

    if (filters.aiFilter !== 'all') {
      filtered = filtered.filter(post => {
        if (filters.aiFilter === 'ai') return post.aiGenerated.isAIGenerated;
        if (filters.aiFilter === 'manual') return !post.aiGenerated.isAIGenerated;
        return true;
      });
    }

    setFilteredPosts(filtered);
  }, [posts, filters.aiFilter]);

  // Fetch posts when filters change
  useEffect(() => {
    fetchPosts();
  }, [filters.search, filters.category, filters.tag, filters.sort, pagination.page]);

  // Initial data fetch
  useEffect(() => {
    fetchPopularTags();
    fetchPosts();
  }, []);

  // Handle search input changes
  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      tag: '',
      sort: 'newest',
      aiFilter: 'all'
    });
    setSearchInput('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle tag selection
  const selectTag = (tag: string) => {
    setFilters(prev => ({ ...prev, tag: prev.tag === tag ? '' : tag }));
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={cn('max-w-7xl mx-auto', className)}>
      {/* Search Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search blog posts..."
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              {searchInput && (
                <button
                  onClick={() => handleSearchInput('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium',
                showFilters
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              <FunnelIcon className="mr-2 h-4 w-4" />
              Filters
              {(filters.category !== 'all' || filters.tag || filters.aiFilter !== 'all') && (
                <span className="ml-2 bg-purple-100 text-purple-800 text-xs rounded-full px-2 py-1">
                  {[filters.category !== 'all', filters.tag, filters.aiFilter !== 'all'].filter(Boolean).length}
                </span>
              )}
            </button>

            {(filters.search || filters.category !== 'all' || filters.tag || filters.aiFilter !== 'all') && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-gray-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category._id} value={category._id}>
                        {category.name} ({category.postCount})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select
                    value={filters.sort}
                    onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value as any }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="popular">Most Popular</option>
                    <option value="trending">Trending</option>
                  </select>
                </div>

                {/* AI Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Type
                  </label>
                  <select
                    value={filters.aiFilter}
                    onChange={(e) => setFilters(prev => ({ ...prev, aiFilter: e.target.value as any }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="all">All Posts</option>
                    <option value="ai">AI Generated</option>
                    <option value="manual">Manual Posts</option>
                  </select>
                </div>

                {/* Tag Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Tag
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={filters.tag}
                      onChange={(e) => setFilters(prev => ({ ...prev, tag: e.target.value }))}
                      placeholder="Enter tag name"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                    {filters.tag && (
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, tag: '' }))}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Popular Tags */}
              {popularTags.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Popular Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {popularTags.map(({ tag, count }) => (
                      <button
                        key={tag}
                        onClick={() => selectTag(tag)}
                        className={cn(
                          'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                          filters.tag === tag
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        )}
                      >
                        <TagIcon className="mr-1 h-3 w-3" />
                        {tag}
                        <span className="ml-1 text-xs text-gray-500">({count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search Results */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {filters.search ? `Search results for "${filters.search}"` : 'All Posts'}
            </h2>
            <p className="text-sm text-gray-500">
              {pagination.total} {pagination.total === 1 ? 'post' : 'posts'} found
            </p>
          </div>
          
          {loading && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent mr-2" />
              Searching...
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Posts Grid */}
      {!loading && filteredPosts.length === 0 && !error && (
        <div className="text-center py-12">
          <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No posts found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search criteria or clearing filters.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredPosts.map((post) => (
            <motion.article
              key={post._id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => onPostClick(post)}
            >
              {/* Featured Image */}
              {post.featuredImage && (
                <div className="aspect-video bg-gray-200">
                  <img
                    src={post.featuredImage.url}
                    alt={post.featuredImage.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6">
                {/* Categories and AI Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-wrap gap-2">
                    {post.categories.slice(0, 2).map(category => (
                      <span
                        key={category._id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${category.color}20`, color: category.color }}
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>
                  
                  {post.aiGenerated.isAIGenerated && (
                    <SparklesIcon className="h-4 w-4 text-purple-500" title="AI Generated" />
                  )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {post.title}
                </h3>

                {/* Excerpt */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {post.excerpt}
                </p>

                {/* Meta Info */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {formatDate(post.publishedAt)}
                    </div>
                    <div className="flex items-center">
                      <EyeIcon className="mr-1 h-3 w-3" />
                      {post.views.toLocaleString()}
                    </div>
                    <div className="flex items-center">
                      <HeartIcon className="mr-1 h-3 w-3" />
                      {post.likes}
                    </div>
                  </div>
                  
                  <div className="text-gray-400">
                    {post.readingTime} min read
                  </div>
                </div>

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1">
                    {post.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                    {post.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{post.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center">
          <nav className="flex items-center space-x-1">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className={cn(
                'px-3 py-2 rounded-md text-sm font-medium',
                pagination.hasPrev
                  ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  : 'text-gray-300 cursor-not-allowed'
              )}
            >
              Previous
            </button>

            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(page => {
                const current = pagination.page;
                return page === 1 || page === pagination.totalPages || 
                       (page >= current - 1 && page <= current + 1);
              })
              .map((page, index, array) => {
                const prevPage = array[index - 1];
                const showEllipsis = prevPage && page - prevPage > 1;
                
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && (
                      <span className="px-2 py-2 text-gray-500">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(page)}
                      className={cn(
                        'px-4 py-2 rounded-md text-sm font-medium',
                        page === pagination.page
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className={cn(
                'px-3 py-2 rounded-md text-sm font-medium',
                pagination.hasNext
                  ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  : 'text-gray-300 cursor-not-allowed'
              )}
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default BlogSearch;