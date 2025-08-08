import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface FilterPanelProps {
  filters: {
    search: string;
    category: string;
    size: string;
    useCase: string;
    priceRange: [number, number];
    inStock: boolean;
    sortBy: string;
  };
  onFiltersChange: (filters: any) => void;
  useCases: Array<{ id: string; label: string; icon: string }>;
  onClose: () => void;
}

const sizes = [
  { id: 'Small', label: 'Small Pack', description: 'Perfect for lunch boxes' },
  { id: 'Medium', label: 'Medium Pack', description: 'Great for coolers & picnics' },
  { id: 'Large', label: 'Large Pack', description: 'Marine & extended adventures' },
  { id: 'Bundle', label: 'Bundle Pack', description: 'Complete cooling solution' }
];

const categories = [
  { id: 'Ice Packs', label: 'Ice Packs' },
  { id: 'Bundles', label: 'Bundle Sets' },
  { id: 'Accessories', label: 'Accessories' }
];

const sortOptions = [
  { id: 'popularity', label: 'Most Popular' },
  { id: 'name', label: 'Name A-Z' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'rating', label: 'Highest Rated' }
];

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  useCases,
  onClose
}) => {
  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      category: '',
      size: '',
      useCase: '',
      priceRange: [0, 100],
      inStock: false,
      sortBy: 'popularity'
    });
  };

  const hasActiveFilters = filters.category || filters.size || filters.useCase || 
                          filters.inStock || filters.priceRange[0] > 0 || filters.priceRange[1] < 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        initial={{ x: -400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -400, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AdjustmentsHorizontalIcon className="h-6 w-6 text-primary-600" />
              <h2 className="text-lg font-display font-semibold text-gray-900 dark:text-white">
                Filters
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearAllFilters}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-200"
                >
                  Clear All
                </motion.button>
              )}
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Filter Content */}
        <div className="p-6 space-y-8">
          {/* Sort By */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Sort By
            </h3>
            <div className="space-y-2">
              {sortOptions.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateFilter('sortBy', option.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200",
                    filters.sortBy === option.id
                      ? "bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-300"
                      : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                  )}
                >
                  <span className="font-medium">{option.label}</span>
                  {filters.sortBy === option.id && (
                    <CheckIcon className="h-4 w-4 text-primary-600" />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Category
            </h3>
            <div className="space-y-2">
              {categories.map((category) => (
                <motion.button
                  key={category.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateFilter('category', 
                    filters.category === category.id ? '' : category.id
                  )}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200",
                    filters.category === category.id
                      ? "bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-300"
                      : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                  )}
                >
                  <span className="font-medium">{category.label}</span>
                  {filters.category === category.id && (
                    <CheckIcon className="h-4 w-4 text-primary-600" />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Size
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {sizes.map((size) => (
                <motion.button
                  key={size.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateFilter('size', 
                    filters.size === size.id ? '' : size.id
                  )}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all duration-200 text-left",
                    filters.size === size.id
                      ? "bg-primary-50 border-primary-300 shadow-lg shadow-primary-500/10"
                      : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600"
                  )}
                >
                  <div className={cn(
                    "font-semibold mb-1 transition-colors duration-200",
                    filters.size === size.id 
                      ? "text-primary-700 dark:text-primary-300" 
                      : "text-gray-900 dark:text-white"
                  )}>
                    {size.label}
                  </div>
                  <div className={cn(
                    "text-xs transition-colors duration-200",
                    filters.size === size.id 
                      ? "text-primary-600 dark:text-primary-400" 
                      : "text-gray-500 dark:text-gray-400"
                  )}>
                    {size.description}
                  </div>
                  
                  {filters.size === size.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center"
                    >
                      <CheckIcon className="h-3 w-3 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Use Case */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Use Case
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {useCases.map((useCase) => (
                <motion.button
                  key={useCase.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateFilter('useCase', 
                    filters.useCase === useCase.id ? '' : useCase.id
                  )}
                  className={cn(
                    "relative p-3 rounded-lg border transition-all duration-200",
                    filters.useCase === useCase.id
                      ? "bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-800"
                      : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{useCase.icon}</span>
                    <span className="text-sm font-medium truncate">{useCase.label}</span>
                  </div>
                  
                  {filters.useCase === useCase.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center"
                    >
                      <CheckIcon className="h-3 w-3 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Price Range
            </h3>
            <div className="px-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  ${filters.priceRange[0]}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  ${filters.priceRange[1]}
                </span>
              </div>
              
              {/* Dual Range Slider */}
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.priceRange[0]}
                  onChange={(e) => updateFilter('priceRange', [
                    parseInt(e.target.value), 
                    filters.priceRange[1]
                  ])}
                  className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.priceRange[1]}
                  onChange={(e) => updateFilter('priceRange', [
                    filters.priceRange[0], 
                    parseInt(e.target.value)
                  ])}
                  className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                />
              </div>
            </div>
          </div>

          {/* In Stock Only */}
          <div className="space-y-3">
            <motion.label
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
            >
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(e) => updateFilter('inStock', e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  In Stock Only
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Show only available products
                </div>
              </div>
            </motion.label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 p-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors duration-200"
          >
            Apply Filters
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export { FilterPanel };