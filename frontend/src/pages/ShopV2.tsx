import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  Squares2X2Icon,
  ListBulletIcon,
  SparklesIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

import { BentoGrid, BentoProductCard, BentoFeatureCard } from '../components/BentoGrid/BentoGrid';
import { VoiceSearch } from '../components/VoiceSearch/VoiceSearch';
import { FilterPanel } from '../components/Filters/FilterPanel';
import { UrgencyTimer } from '../components/UrgencyTimer/UrgencyTimer';
import { cn } from '../utils/cn';

interface Product {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  images: { url: string; altText: string }[];
  rating: number;
  reviewCount: number;
  category: string;
  tags: string[];
  useCase?: string[];
  size: 'Small' | 'Medium' | 'Large' | 'Bundle';
  inStock: boolean;
  lowStock?: boolean;
  badge?: string;
  socialProof?: {
    rating: { average: number; count: number };
    testimonials: Array<{ text: string; author: string; useCase: string }>;
  };
}

interface ShopFilters {
  search: string;
  category: string;
  size: string;
  useCase: string;
  priceRange: [number, number];
  inStock: boolean;
  sortBy: 'name' | 'price-asc' | 'price-desc' | 'rating' | 'popularity';
}

const useCases = [
  { id: 'camping', label: 'Camping & Hiking', icon: '🏕️' },
  { id: 'marine', label: 'Marine & Boating', icon: '⛵' },
  { id: 'fishing', label: 'Fishing', icon: '🎣' },
  { id: 'picnic', label: 'Picnics & BBQ', icon: '🧺' },
  { id: 'lunch', label: 'Lunch Boxes', icon: '🥪' },
  { id: 'sports', label: 'Sports & Events', icon: '⚽' },
  { id: 'medical', label: 'Medical & Recovery', icon: '🏥' },
];

const Shop: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [abTestVariant, setABTestVariant] = useState<'A' | 'B'>('A');
  
  const [filters, setFilters] = useState<ShopFilters>({
    search: '',
    category: '',
    size: '',
    useCase: '',
    priceRange: [0, 100],
    inStock: false,
    sortBy: 'popularity'
  });

  const { ref: heroRef, inView: heroInView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  // A/B Test for CTA buttons
  useEffect(() => {
    setABTestVariant(Math.random() > 0.5 ? 'A' : 'B');
  }, []);

  // Mock data - replace with API call
  useEffect(() => {
    setTimeout(() => {
      setProducts([
        {
          id: '1',
          name: 'ICEPACA Small Pack',
          price: 10,
          compareAtPrice: 15,
          images: [{ url: '/images/icepaca-small.jpg', altText: 'Small ICEPACA pack' }],
          rating: 4.8,
          reviewCount: 124,
          category: 'Ice Packs',
          tags: ['small', 'lunch', 'compact'],
          useCase: ['lunch', 'picnic'],
          size: 'Small',
          inStock: true,
          badge: 'Best Seller',
          socialProof: {
            rating: { average: 4.8, count: 124 },
            testimonials: [
              { text: 'Perfect for my lunch box!', author: 'Sarah M.', useCase: 'lunch' }
            ]
          }
        },
        {
          id: '2',
          name: 'ICEPACA Medium Pack',
          price: 15,
          compareAtPrice: 22,
          images: [{ url: '/images/icepaca-medium.jpg', altText: 'Medium ICEPACA pack' }],
          rating: 4.7,
          reviewCount: 89,
          category: 'Ice Packs',
          tags: ['medium', 'cooler', 'picnic'],
          useCase: ['camping', 'picnic', 'marine'],
          size: 'Medium',
          inStock: true
        },
        {
          id: '3',
          name: 'ICEPACA Large Pack',
          price: 20,
          compareAtPrice: 30,
          images: [{ url: '/images/icepaca-large.jpg', altText: 'Large ICEPACA pack' }],
          rating: 4.9,
          reviewCount: 156,
          category: 'Ice Packs',
          tags: ['large', 'marine', 'camping'],
          useCase: ['marine', 'camping', 'sports'],
          size: 'Large',
          inStock: true,
          lowStock: true,
          badge: 'Limited Stock'
        },
        {
          id: '4',
          name: 'ICEPACA Adventure Bundle',
          price: 45,
          compareAtPrice: 65,
          images: [{ url: '/images/icepaca-bundle.jpg', altText: 'ICEPACA bundle pack' }],
          rating: 4.9,
          reviewCount: 203,
          category: 'Bundles',
          tags: ['bundle', 'complete-set', 'value'],
          useCase: ['camping', 'marine', 'sports', 'picnic'],
          size: 'Bundle',
          inStock: true,
          badge: 'Best Value'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                           product.tags.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()));
      
      const matchesCategory = !filters.category || product.category === filters.category;
      const matchesSize = !filters.size || product.size === filters.size;
      const matchesUseCase = !filters.useCase || product.useCase?.includes(filters.useCase);
      const matchesPrice = product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1];
      const matchesStock = !filters.inStock || product.inStock;

      return matchesSearch && matchesCategory && matchesSize && 
             matchesUseCase && matchesPrice && matchesStock;
    });

    // Sort products
    switch (filters.sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'popularity':
        filtered.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
    }

    return filtered;
  }, [products, filters]);

  const handleAddToCart = (product: Product) => {
    // Trigger alpaca wink animation and add to cart
    console.log('Adding to cart:', product);
    // Analytics tracking for A/B test
    if (abTestVariant === 'B') {
      console.log('A/B Test: Variant B - "Freeze It In!" clicked');
    }
  };

  const handleVoiceSearch = (transcript: string) => {
    setFilters(prev => ({ ...prev, search: transcript }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ice-50 via-white to-primary-50">
        <div className="container mx-auto px-4 py-8">
          <BentoGrid variant="spacious">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="col-span-2 row-span-1 bg-gray-200 animate-pulse rounded-2xl"
              />
            ))}
          </BentoGrid>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ice-50 via-white to-primary-50">
      {/* Hero Section with Ice-Melting Animation */}
      <motion.section
        ref={heroRef}
        initial={{ opacity: 0, y: 50 }}
        animate={heroInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative py-16 lg:py-24 overflow-hidden"
      >
        {/* Background Animation */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-primary-200 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 100 + 20}px`,
                height: `${Math.random() * 100 + 20}px`,
              }}
              animate={{
                scale: [1, 1.2, 0],
                opacity: [0.3, 0.6, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.h1
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="text-5xl lg:text-7xl font-display font-bold text-gradient mb-6"
          >
            Cool Your Adventure
          </motion.h1>
          
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto"
          >
            Discover ICEPACA's revolutionary ice packs, inspired by alpaca resilience. 
            Perfect for every adventure, from lunch boxes to marine expeditions.
          </motion.p>

          {/* Voice Search */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex justify-center mb-8"
          >
            <VoiceSearch onTranscript={handleVoiceSearch} />
          </motion.div>
        </div>
      </motion.section>

      {/* Search and Filter Controls */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search ice packs..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus-ring"
              />
            </div>

            {/* Filter and View Controls */}
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
                  showFilters 
                    ? "bg-primary-500 text-white" 
                    : "bg-white/50 text-gray-700 hover:bg-white/80"
                )}
              >
                <FunnelIcon className="h-5 w-5" />
                Filters
              </motion.button>

              <div className="flex bg-white/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-md transition-all duration-200",
                    viewMode === 'grid' ? "bg-white shadow-sm text-primary-600" : "text-gray-500"
                  )}
                >
                  <Squares2X2Icon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-md transition-all duration-200",
                    viewMode === 'list' ? "bg-white shadow-sm text-primary-600" : "text-gray-500"
                  )}
                >
                  <ListBulletIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <FilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            useCases={useCases}
            onClose={() => setShowFilters(false)}
          />
        )}
      </AnimatePresence>

      {/* Products Section */}
      <div className="container mx-auto px-4 py-8">
        {/* Use Case Quick Filters */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex flex-wrap gap-3 justify-center">
            {useCases.map((useCase, index) => (
              <motion.button
                key={useCase.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  useCase: prev.useCase === useCase.id ? '' : useCase.id 
                }))}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border",
                  filters.useCase === useCase.id
                    ? "bg-primary-500 text-white border-primary-500 shadow-lg"
                    : "bg-white/60 text-gray-700 border-gray-200 hover:bg-white/80 hover:shadow-md"
                )}
              >
                <span className="mr-2">{useCase.icon}</span>
                {useCase.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Urgency Timer */}
        <div className="mb-8 flex justify-center">
          <UrgencyTimer 
            message="Summer Sale Ends Soon!" 
            endTime={new Date(Date.now() + 24 * 60 * 60 * 1000)} // 24 hours from now
          />
        </div>

        {/* Products Grid */}
        {viewMode === 'grid' ? (
          <BentoGrid variant="default" className="mb-12">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    duration: 0.4,
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 200
                  }}
                >
                  <BentoProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </BentoGrid>
        ) : (
          // List View
          <div className="space-y-4 mb-12">
            <AnimatePresence>
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-depth-2 hover:shadow-depth-3 transition-all duration-300"
                >
                  {/* List view content here */}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Feature Cards */}
        <BentoGrid variant="spacious">
          <BentoFeatureCard
            title="Advanced Cooling Technology"
            description="Our proprietary gel formula inspired by alpaca resilience keeps things cold 3x longer than traditional ice packs."
            icon={<SparklesIcon className="h-6 w-6" />}
            size="lg"
          />
          
          <BentoFeatureCard
            title="Eco-Friendly & Reusable"
            description="Each ICEPACA pack is reusable up to 1,500+ times, saving the environment and your wallet."
            icon={<ClockIcon className="h-6 w-6" />}
            size="md"
          />
        </BentoGrid>
      </div>
    </div>
  );
};

export default Shop;