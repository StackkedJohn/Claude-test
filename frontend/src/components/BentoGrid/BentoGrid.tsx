import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'compact' | 'spacious';
  animate?: boolean;
}

interface BentoItemProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  aspectRatio?: 'square' | 'wide' | 'tall' | 'auto';
  blur?: boolean;
  glass?: boolean;
  hover?: boolean;
  delay?: number;
}

const sizeClasses = {
  sm: 'col-span-1 row-span-1',
  md: 'col-span-2 row-span-1',
  lg: 'col-span-2 row-span-2',
  xl: 'col-span-3 row-span-2',
};

const aspectClasses = {
  square: 'aspect-bento-square',
  wide: 'aspect-bento-wide', 
  tall: 'aspect-bento-tall',
  auto: 'aspect-auto',
};

const variantClasses = {
  default: 'grid-cols-bento-md gap-4 p-4',
  compact: 'grid-cols-bento-lg gap-3 p-3',
  spacious: 'grid-cols-bento-sm gap-6 p-6',
};

export const BentoGrid: React.FC<BentoGridProps> = ({ 
  children, 
  className, 
  variant = 'default',
  animate = true 
}) => {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 20 } : {}}
      animate={animate ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        'grid auto-rows-fr',
        variantClasses[variant],
        // Responsive grid adjustments
        'grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8',
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export const BentoItem: React.FC<BentoItemProps> = ({ 
  children, 
  className, 
  size = 'md',
  aspectRatio = 'auto',
  blur = false,
  glass = false,
  hover = true,
  delay = 0
}) => {
  const itemVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      rotateX: -15,
      y: 50
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      rotateX: 0,
      y: 0,
      transition: {
        duration: 0.6,
        delay: delay * 0.1,
        ease: [0.16, 1, 0.3, 1]
      }
    },
    hover: hover ? {
      y: -8,
      rotateX: 5,
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    } : {}
  };

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className={cn(
        // Base styles
        'relative overflow-hidden rounded-2xl',
        'border border-gray-200/50 dark:border-gray-800/50',
        'transition-all duration-300 ease-out',
        
        // Size classes
        sizeClasses[size],
        
        // Aspect ratio
        aspectClasses[aspectRatio],
        
        // Glass effect
        glass && 'glass backdrop-blur-md',
        
        // Blur effect
        blur && 'backdrop-blur-sm',
        
        // Background and shadows
        'bg-white/80 dark:bg-gray-900/80',
        'shadow-depth-2 hover:shadow-depth-4',
        
        // Interactive states
        hover && 'cursor-pointer',
        'focus-within:ring-2 focus-within:ring-primary-500/50',
        
        className
      )}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/5 dark:from-white/5 dark:to-black/20" />
      
      {/* Content */}
      <div className="relative z-10 h-full p-4 md:p-6">
        {children}
      </div>
      
      {/* Decorative elements */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-conic from-primary-400/20 via-secondary-400/20 to-transparent rounded-full blur-3xl" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-gradient-radial from-ice-300/30 to-transparent rounded-full blur-2xl" />
    </motion.div>
  );
};

// Pre-built Bento components for common use cases
export const BentoProductCard: React.FC<{
  product: any;
  onAddToCart: (product: any) => void;
}> = ({ product, onAddToCart }) => {
  return (
    <BentoItem size="md" hover className="group">
      <div className="flex flex-col h-full">
        {/* Product Image */}
        <div className="relative flex-1 mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-ice-50 to-ice-100">
          <img
            src={product.images?.[0]?.url || '/placeholder-product.jpg'}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          
          {/* Alpaca Wink Animation Trigger */}
          <div className="absolute top-3 right-3 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <motion.div
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="w-full h-full bg-secondary-400 rounded-full"
            />
          </div>
          
          {/* Product Badge */}
          {product.badge && (
            <div className="absolute top-3 left-3 px-2 py-1 text-xs font-medium text-white bg-primary-500 rounded-full">
              {product.badge}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-shrink-0">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
            {product.name}
          </h3>
          
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.2, rotate: 15 }}
                  className={cn(
                    "w-3 h-3 rounded-full",
                    i < Math.floor(product.rating || 0) 
                      ? "bg-yellow-400" 
                      : "bg-gray-200 dark:bg-gray-700"
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              ({product.reviewCount || 0})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                ${product.price}
              </span>
              {product.compareAtPrice && (
                <span className="text-sm text-gray-500 line-through">
                  ${product.compareAtPrice}
                </span>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAddToCart(product)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors duration-200"
            >
              Freeze It In!
            </motion.button>
          </div>
        </div>
      </div>
    </BentoItem>
  );
};

export const BentoFeatureCard: React.FC<{
  title: string;
  description: string;
  icon: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}> = ({ title, description, icon, size = 'md' }) => {
  return (
    <BentoItem size={size} glass>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl text-white">
            {icon}
          </div>
        </div>
        
        <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-3">
          {title}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed flex-1">
          {description}
        </p>
      </div>
    </BentoItem>
  );
};

export const BentoStatsCard: React.FC<{
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}> = ({ label, value, change, positive = true }) => {
  return (
    <BentoItem size="sm" blur>
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-3xl font-display font-bold text-gradient mb-2"
        >
          {value}
        </motion.div>
        
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </div>
        
        {change && (
          <div className={cn(
            "text-xs font-medium",
            positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {positive ? "↗" : "↘"} {change}
          </div>
        )}
      </div>
    </BentoItem>
  );
};