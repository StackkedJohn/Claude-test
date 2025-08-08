import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarIcon,
  ClockIcon,
  EyeIcon,
  HeartIcon,
  ShareIcon,
  SparklesIcon,
  ArrowLeftIcon,
  TagIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { cn } from '../utils/cn';
import ProductRecommendations from '../components/Blog/ProductRecommendations';

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
    bio?: string;
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
  relatedProducts: Array<{
    _id: string;
    name: string;
    slug: string;
    price: number;
    images: Array<{
      url: string;
      alt: string;
    }>;
    description: string;
  }>;
  aiGenerated: {
    isAIGenerated: boolean;
    confidence?: number;
  };
  seoData?: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
}

interface RelatedPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage?: {
    url: string;
    alt: string;
  };
  author: {
    firstName: string;
    lastName: string;
  };
  categories: Array<{
    name: string;
    color: string;
  }>;
  publishedAt: string;
  readingTime: number;
}

const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Fetch blog post
  useEffect(() => {
    if (!slug) return;

    const fetchPost = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/blog/posts/${slug}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Blog post not found');
          } else {
            throw new Error('Failed to fetch blog post');
          }
          return;
        }

        const data = await response.json();
        setPost(data.post);
        setRelatedPosts(data.relatedPosts || []);
        setLikeCount(data.post.likes);

        // Update document title
        if (data.post.seoData?.metaTitle) {
          document.title = `${data.post.seoData.metaTitle} | ICEPACA Blog`;
        } else {
          document.title = `${data.post.title} | ICEPACA Blog`;
        }

        // Update meta description
        if (data.post.seoData?.metaDescription) {
          const metaDescription = document.querySelector('meta[name="description"]');
          if (metaDescription) {
            metaDescription.setAttribute('content', data.post.seoData.metaDescription);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  // Handle like button
  const handleLike = async () => {
    if (!post || liked) return;

    try {
      const response = await fetch(`/api/blog/posts/${post._id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  // Handle share
  const handleShare = async () => {
    if (!post) return;

    const shareData = {
      title: post.title,
      text: post.excerpt,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Loading article...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {error === 'Blog post not found' ? 'Article Not Found' : 'Error'}
          </h1>
          <p className="text-gray-600 mb-8">
            {error === 'Blog post not found' 
              ? "The article you're looking for doesn't exist or has been moved."
              : 'Something went wrong while loading the article.'
            }
          </p>
          <div className="space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Go Back
            </button>
            <Link
              to="/blog"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
            >
              View All Articles
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <nav className="mb-8">
          <button
            onClick={() => navigate('/blog')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Blog
          </button>
        </nav>

        {/* Article Header */}
        <header className="mb-8">
          <div className="mb-6">
            {/* Categories and AI Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-wrap gap-2">
                {post.categories.map(category => (
                  <Link
                    key={category._id}
                    to={`/blog/category/${category.slug}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: `${category.color}20`, color: category.color }}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
              
              {post.aiGenerated.isAIGenerated && (
                <div className="flex items-center text-sm text-purple-600">
                  <SparklesIcon className="mr-1 h-4 w-4" />
                  AI Generated
                  {post.aiGenerated.confidence && (
                    <span className="ml-1 text-xs text-gray-500">
                      ({Math.round(post.aiGenerated.confidence * 100)}% confidence)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight"
            >
              {post.title}
            </motion.h1>

            {/* Excerpt */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600 mb-8 leading-relaxed"
            >
              {post.excerpt}
            </motion.p>

            {/* Meta Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-6 text-sm text-gray-500 mb-8"
            >
              {/* Author */}
              <div className="flex items-center">
                {post.author.avatar ? (
                  <img
                    src={post.author.avatar}
                    alt={`${post.author.firstName} ${post.author.lastName}`}
                    className="w-8 h-8 rounded-full mr-2"
                  />
                ) : (
                  <UserIcon className="w-8 h-8 p-1 rounded-full bg-gray-100 text-gray-600 mr-2" />
                )}
                <span className="font-medium text-gray-900">
                  {post.author.firstName} {post.author.lastName}
                </span>
              </div>

              {/* Date */}
              <div className="flex items-center">
                <CalendarIcon className="mr-1 h-4 w-4" />
                {formatDate(post.publishedAt)}
              </div>

              {/* Reading Time */}
              <div className="flex items-center">
                <ClockIcon className="mr-1 h-4 w-4" />
                {post.readingTime} min read
              </div>

              {/* Views */}
              <div className="flex items-center">
                <EyeIcon className="mr-1 h-4 w-4" />
                {post.views.toLocaleString()} views
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-4 pb-8 border-b border-gray-200"
            >
              <button
                onClick={handleLike}
                disabled={liked}
                className={cn(
                  'inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  liked
                    ? 'bg-red-100 text-red-700 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {liked ? (
                  <HeartSolidIcon className="mr-2 h-4 w-4" />
                ) : (
                  <HeartIcon className="mr-2 h-4 w-4" />
                )}
                {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
              </button>

              <button
                onClick={handleShare}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <ShareIcon className="mr-2 h-4 w-4" />
                Share
              </button>
            </motion.div>
          </div>

          {/* Featured Image */}
          {post.featuredImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-8"
            >
              <img
                src={post.featuredImage.url}
                alt={post.featuredImage.alt}
                className="w-full h-64 md:h-96 object-cover rounded-lg shadow-lg"
              />
            </motion.div>
          )}
        </header>

        {/* Article Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="prose prose-lg max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Inline Product Recommendations */}
        <ProductRecommendations
          blogPostSlug={post.slug}
          blogPostId={post._id}
          position="inline"
          maxRecommendations={3}
          showReasons={true}
        />

        {/* Tags */}
        {post.tags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-12 pb-8 border-b border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <Link
                  key={tag}
                  to={`/blog?tag=${encodeURIComponent(tag)}`}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <TagIcon className="mr-1 h-3 w-3" />
                  {tag}
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer Product Recommendations */}
        <ProductRecommendations
          blogPostSlug={post.slug}
          blogPostId={post._id}
          position="footer"
          maxRecommendations={6}
          showReasons={false}
        />

        {/* Author Bio */}
        {post.author.bio && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-12 pb-8 border-b border-gray-200"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              About the Author
            </h3>
            <div className="flex items-start space-x-4">
              {post.author.avatar ? (
                <img
                  src={post.author.avatar}
                  alt={`${post.author.firstName} ${post.author.lastName}`}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-gray-500" />
                </div>
              )}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {post.author.firstName} {post.author.lastName}
                </h4>
                <p className="text-gray-600">
                  {post.author.bio}
                </p>
              </div>
            </div>
          </motion.section>
        )}
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
                You Might Also Like
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {relatedPosts.map((relatedPost, index) => (
                  <motion.article
                    key={relatedPost._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 + index * 0.1 }}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    onClick={() => navigate(`/blog/${relatedPost.slug}`)}
                  >
                    {relatedPost.featuredImage && (
                      <div className="aspect-video bg-gray-200">
                        <img
                          src={relatedPost.featuredImage.url}
                          alt={relatedPost.featuredImage.alt}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="p-6">
                      <div className="flex space-x-2 mb-3">
                        {relatedPost.categories.slice(0, 1).map((category, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${category.color}20`, color: category.color }}
                          >
                            {category.name}
                          </span>
                        ))}
                      </div>

                      <h4 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {relatedPost.title}
                      </h4>

                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {relatedPost.excerpt}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatDate(relatedPost.publishedAt)}</span>
                        <span>{relatedPost.readingTime} min read</span>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>

              <div className="text-center mt-12">
                <Link
                  to="/blog"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
                >
                  View All Articles
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
};

export default BlogPost;