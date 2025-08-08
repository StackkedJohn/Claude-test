import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  SparklesIcon,
  FireIcon,
  ClockIcon,
  UserGroupIcon,
  RssIcon
} from '@heroicons/react/24/outline';
import BlogSearch from '../components/Blog/BlogSearch';
import { cn } from '../utils/cn';

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
  icon: string;
  postCount: number;
}

interface BlogStats {
  totalPosts: number;
  totalCategories: number;
  totalViews: number;
  averageViewsPerPost: number;
}

const Blog: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([]);
  const [blogStats, setBlogStats] = useState<BlogStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [categoriesRes, postsRes, statsRes] = await Promise.all([
          fetch('/api/blog/categories'),
          fetch('/api/blog/posts?limit=3&sort=trending'),
          fetch('/api/blog/stats')
        ]);

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData);
        }

        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setFeaturedPosts(postsData.posts);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setBlogStats(statsData);
        }
      } catch (error) {
        console.error('Failed to fetch blog data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handlePostClick = (post: BlogPost) => {
    navigate(`/blog/${post.slug}`);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Loading blog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                ICEPACA Blog
              </h1>
              <p className="text-xl md:text-2xl text-purple-100 mb-8 max-w-3xl mx-auto">
                Discover expert tips on eco-friendly cooling, outdoor adventures, and sustainable living
              </p>
              
              {/* Blog Stats */}
              {blogStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">{formatNumber(blogStats.totalPosts)}</div>
                    <div className="text-purple-200">Articles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">{blogStats.totalCategories}</div>
                    <div className="text-purple-200">Categories</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">{formatNumber(blogStats.totalViews)}</div>
                    <div className="text-purple-200">Total Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">{formatNumber(blogStats.averageViewsPerPost)}</div>
                    <div className="text-purple-200">Avg Views</div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Explore Our Categories
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                From cooling tips to adventure stories, find content that matches your interests
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {categories.map((category, index) => (
                <motion.div
                  key={category._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * (index + 3) }}
                  className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-8 text-center shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                  onClick={() => navigate(`/blog/category/${category.slug}`)}
                >
                  <div 
                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${category.color}20`, color: category.color }}
                  >
                    {category.icon || '📝'}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {category.name}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {category.postCount} {category.postCount === 1 ? 'article' : 'articles'}
                  </p>
                  <button 
                    className="text-sm font-medium text-purple-600 hover:text-purple-700"
                    style={{ color: category.color }}
                  >
                    Explore Category →
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Posts Section */}
      {featuredPosts.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center mb-12"
            >
              <div className="flex items-center justify-center mb-4">
                <FireIcon className="h-8 w-8 text-orange-500 mr-2" />
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                  Trending Articles
                </h2>
              </div>
              <p className="text-xl text-gray-600">
                Don't miss our most popular and engaging content
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredPosts.map((post, index) => (
                <motion.article
                  key={post._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * (index + 5) }}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
                  onClick={() => handlePostClick(post)}
                >
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
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex space-x-2">
                        {post.categories.slice(0, 1).map(category => (
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

                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {post.title}
                    </h3>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-3">
                        <span>{formatDate(post.publishedAt)}</span>
                        <span>{post.readingTime} min read</span>
                      </div>
                      <span>{formatNumber(post.views)} views</span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>

            <div className="text-center mt-12">
              <button
                onClick={() => {
                  const searchSection = document.getElementById('blog-search');
                  searchSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                View All Articles
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Newsletter & RSS Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Stay Updated
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Never miss our latest articles and expert tips
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <a
                href="/api/blog/rss"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <RssIcon className="mr-2 h-5 w-5" />
                RSS Feed
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Blog Search Section */}
      <section id="blog-search" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mb-8"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Explore All Articles
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Search through our comprehensive library of cooling tips, adventure stories, and eco-living guides
              </p>
            </div>

            <BlogSearch
              onPostClick={handlePostClick}
              categories={categories}
              className="mt-8"
            />
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Blog;