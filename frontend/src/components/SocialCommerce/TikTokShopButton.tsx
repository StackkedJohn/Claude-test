import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlayIcon, ShoppingBagIcon, ExternalLinkIcon } from '@heroicons/react/24/outline';
import { useAnalytics } from '../../hooks/useAnalytics';

interface TikTokShopButtonProps {
  productId: string;
  productName: string;
  className?: string;
  variant?: 'button' | 'badge' | 'inline';
  size?: 'sm' | 'md' | 'lg';
}

const TikTokShopButton: React.FC<TikTokShopButtonProps> = ({
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
        const response = await fetch(`/api/social-commerce/shop-button/${productId}/tiktok`);
        if (response.ok) {
          const data = await response.json();
          setShopData(data);
        }
      } catch (error) {
        console.error('Error fetching TikTok shop button:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShopButton();
  }, [productId]);

  const handleClick = async () => {
    // Track click event
    await trackEvent('social_commerce_click', {
      platform: 'tiktok',
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
    button: 'bg-black text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 hover:bg-gray-900',
    badge: 'bg-white text-gray-900 border-2 border-black font-medium rounded-full hover:bg-gray-50 transition-colors duration-200',
    inline: 'text-black underline underline-offset-2 hover:text-gray-700 font-semibold'
  };

  if (variant === 'inline') {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        className={`${variantStyles.inline} ${className}`}
      >
        Get it on TikTok
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
      {/* TikTok pulse effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-red-500 opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
      
      <div className="relative flex items-center space-x-2">
        {variant === 'button' && (
          <div className="flex items-center space-x-2">
            {/* TikTok Logo */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.321 5.562a5.124 5.124 0 01-.443-.258 6.228 6.228 0 01-1.137-.966c-.849-1.067-1.222-2.35-1.222-3.338h-2.972v13.003c0 1.583-1.307 2.89-2.89 2.89-1.583 0-2.89-1.307-2.89-2.89 0-1.583 1.307-2.89 2.89-2.89.31 0 .608.049.89.14V8.831c-.292-.042-.59-.067-.89-.067C7.804 8.764 5 11.568 5 15.003c0 3.435 2.804 6.239 6.239 6.239s6.239-2.804 6.239-6.239V9.477c1.333.956 2.953 1.52 4.703 1.52v-2.972c-1.058 0-2.042-.35-2.834-.963-.014-.013-.013-.032-.026-.05z"/>
            </svg>
            <span>Get it now</span>
          </div>
        )}
        
        {variant === 'badge' && (
          <div className="flex items-center space-x-2">
            <div className="relative">
              <PlayIcon className="h-4 w-4" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            </div>
            <span>Shop on TikTok</span>
          </div>
        )}
      </div>

      {/* TikTok-style animation dots */}
      {variant === 'button' && (
        <div className="absolute right-2 flex flex-col space-y-1">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            className="w-1 h-1 bg-white rounded-full opacity-60"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
            className="w-1 h-1 bg-white rounded-full opacity-60"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
            className="w-1 h-1 bg-white rounded-full opacity-60"
          />
        </div>
      )}
    </motion.button>
  );
};

export default TikTokShopButton;