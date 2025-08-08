import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBagIcon, ExternalLinkIcon } from '@heroicons/react/24/outline';
import { useAnalytics } from '../../hooks/useAnalytics';

interface InstagramShopButtonProps {
  productId: string;
  productName: string;
  className?: string;
  variant?: 'button' | 'badge' | 'inline';
  size?: 'sm' | 'md' | 'lg';
}

const InstagramShopButton: React.FC<InstagramShopButtonProps> = ({
  productId,
  productName,
  className = '',
  variant = 'button',
  size = 'md'
}) => {
  const [shopData, setShopData] = useState<{
    buttonHtml: string;
    deepLink: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    const fetchShopButton = async () => {
      try {
        const response = await fetch(`/api/social-commerce/shop-button/${productId}/instagram`);
        if (response.ok) {
          const data = await response.json();
          setShopData(data);
        }
      } catch (error) {
        console.error('Error fetching Instagram shop button:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShopButton();
  }, [productId]);

  const handleClick = async () => {
    // Track click event
    await trackEvent('social_commerce_click', {
      platform: 'instagram',
      product_id: productId,
      product_name: productName,
      button_variant: variant,
      click_source: 'shop_button'
    });

    // Try deep link first, then fallback to web URL
    if (shopData?.deepLink) {
      try {
        window.location.href = shopData.deepLink;
      } catch (error) {
        // Fallback to web URL if deep link fails
        const webUrl = shopData.buttonHtml.match(/href="([^"]*)"/) ?.[1];
        if (webUrl) {
          window.open(webUrl, '_blank', 'noopener,noreferrer');
        }
      }
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 rounded-lg h-10 w-32"></div>
      </div>
    );
  }

  if (!shopData) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const variantStyles = {
    button: 'bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200',
    badge: 'bg-white text-gray-900 border-2 border-purple-600 font-medium rounded-full hover:bg-purple-50 transition-colors duration-200',
    inline: 'text-purple-600 underline underline-offset-2 hover:text-purple-800 font-medium'
  };

  if (variant === 'inline') {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        className={`${variantStyles.inline} ${className}`}
      >
        Shop on Instagram
        <ExternalLinkIcon className="h-4 w-4 inline ml-1" />
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`
        ${variantStyles[variant]} 
        ${sizeClasses[size]} 
        ${className}
        flex items-center space-x-2 relative overflow-hidden
      `}
    >
      {/* Instagram gradient background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative flex items-center space-x-2">
        {variant === 'button' && (
          <div className="flex items-center space-x-1">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <span>Shop</span>
          </div>
        )}
        
        {variant === 'badge' && (
          <div className="flex items-center space-x-2">
            <ShoppingBagIcon className="h-4 w-4" />
            <span>Available on Instagram</span>
          </div>
        )}
      </div>
    </motion.button>
  );
};

export default InstagramShopButton;