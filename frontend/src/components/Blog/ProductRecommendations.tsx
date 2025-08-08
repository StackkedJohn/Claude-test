import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCartIcon,
  StarIcon,
  ArrowRightIcon,
  SparklesIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';

interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  images: Array<{
    url: string;
    alt: string;
  }>;
  description: string;
  rating?: number;
  reviewCount?: number;
}

interface ProductRecommendation {
  product: Product;
  relevanceScore: number;
  matchReason: string;
  suggestedPosition: 'inline' | 'sidebar' | 'footer';
  clicks?: number;
  conversions?: number;
}

interface ProductRecommendationsProps {
  blogPostSlug: string;
  blogPostId: string;
  position: 'inline' | 'sidebar' | 'footer';
  maxRecommendations?: number;
  showReasons?: boolean;
  className?: string;
}

const ProductRecommendations: React.FC<ProductRecommendationsProps> = ({
  blogPostSlug,
  blogPostId,
  position,
  maxRecommendations = 3,
  showReasons = true,
  className = ''
}) => {
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Fetch product recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/blog/posts/${blogPostSlug}/recommendations`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }

        const data = await response.json();
        
        // Filter recommendations by position and limit
        const filteredRecommendations = data.recommendations
          .filter((rec: ProductRecommendation) => 
            position === 'footer' || rec.suggestedPosition === position
          )
          .slice(0, maxRecommendations);

        setRecommendations(filteredRecommendations);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    if (blogPostSlug) {
      fetchRecommendations();
    }
  }, [blogPostSlug, position, maxRecommendations]);

  // Track product click
  const trackProductClick = async (productId: string) => {
    try {
      await fetch(`/api/blog/posts/${blogPostId}/product-click/${productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ position })
      });
    } catch (err) {
      console.error('Error tracking product click:', err);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const renderStars = (rating: number = 0) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          star <= rating ? (
            <StarSolidIcon key={star} className="h-4 w-4 text-yellow-400" />
          ) : (
            <StarIcon key={star} className="h-4 w-4 text-gray-300" />
          )
        ))}
      </div>
    );
  };

  // Don't render if no recommendations, dismissed, or error
  if (dismissed || error || (!loading && recommendations.length === 0)) {
    return null;
  }

  if (loading) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="bg-gray-100 rounded-lg p-6">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: maxRecommendations }).map((_, index) => (
              <div key={index} className="space-y-3">
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Different layouts based on position
  const getLayoutClasses = () => {
    switch (position) {
      case 'inline':
        return 'bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-400';
      case 'sidebar':
        return 'bg-white border border-gray-200 shadow-sm';
      case 'footer':
        return 'bg-gray-50 border-t border-gray-200';
      default:
        return 'bg-white border border-gray-200';
    }
  };

  const getGridClasses = () => {
    switch (position) {
      case 'sidebar':
        return 'grid-cols-1 gap-3';
      case 'inline':
      case 'footer':
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
      default:
        return 'grid-cols-1 gap-4';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'rounded-lg p-6 mb-8',
          getLayoutClasses(),
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <SparklesIcon className="h-5 w-5 text-purple-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              {position === 'footer' ? 'Complete Your Setup' : 'Recommended for You'}
            </h3>
          </div>
          
          {position === 'sidebar' && (
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {position === 'inline' && (
          <p className="text-sm text-gray-600 mb-4 flex items-start">
            <InformationCircleIcon className="h-4 w-4 text-blue-500 mr-1 mt-0.5 flex-shrink-0" />
            These products are perfectly matched to the content above and can enhance your experience.
          </p>
        )}

        {/* Products Grid */}
        <div className={cn('grid', getGridClasses())}>
          {recommendations.map((recommendation, index) => (
            <motion.div
              key={recommendation.product._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'group relative rounded-lg overflow-hidden transition-all duration-200',
                position === 'sidebar' 
                  ? 'border border-gray-200 hover:border-purple-300 hover:shadow-sm'
                  : 'bg-white border border-gray-200 hover:shadow-md hover:border-purple-300'
              )}
            >
              <Link
                to={`/products/${recommendation.product.slug}`}
                onClick={() => trackProductClick(recommendation.product._id)}
                className="block"
              >
                {/* Product Image */}
                <div className={cn(
                  'relative overflow-hidden',
                  position === 'sidebar' ? 'aspect-square' : 'aspect-video md:aspect-square'
                )}>
                  <img
                    src={recommendation.product.images[0]?.url || '/images/placeholder.jpg'}
                    alt={recommendation.product.images[0]?.alt || recommendation.product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  
                  {/* Relevance Badge */}
                  {recommendation.relevanceScore > 0.8 && (
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Perfect Match
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="p-4">
                  <h4 className={cn(
                    'font-medium text-gray-900 mb-2 group-hover:text-purple-600 transition-colors',
                    position === 'sidebar' ? 'text-sm' : 'text-base'
                  )}>
                    {recommendation.product.name}
                  </h4>

                  {/* Rating */}
                  {recommendation.product.rating && (
                    <div className="flex items-center space-x-2 mb-2">
                      {renderStars(recommendation.product.rating)}
                      {recommendation.product.reviewCount && (
                        <span className="text-xs text-gray-500">
                          ({recommendation.product.reviewCount})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {position !== 'sidebar' && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {recommendation.product.description}
                    </p>
                  )}

                  {/* Match Reason */}
                  {showReasons && (
                    <p className={cn(
                      'text-purple-600 font-medium mb-3',
                      position === 'sidebar' ? 'text-xs' : 'text-sm'
                    )}>
                      ✨ {recommendation.matchReason}
                    </p>
                  )}

                  {/* Price and CTA */}
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'font-bold text-purple-600',
                      position === 'sidebar' ? 'text-lg' : 'text-xl'
                    )}>
                      {formatPrice(recommendation.product.price)}
                    </span>
                    
                    <div className={cn(
                      'inline-flex items-center font-medium text-purple-600 group-hover:text-purple-700',
                      position === 'sidebar' ? 'text-xs' : 'text-sm'
                    )}>
                      {position === 'sidebar' ? 'View' : 'Shop Now'}
                      <ArrowRightIcon className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Footer CTA */}
        {position === 'footer' && recommendations.length > 0 && (
          <div className="text-center mt-8">
            <Link
              to="/products"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <ShoppingCartIcon className="mr-2 h-5 w-5" />
              Explore All Products
            </Link>
          </div>
        )}

        {/* Performance Badge (for admins/testing) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Showing {recommendations.length} recommendations for {position} position
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductRecommendations;