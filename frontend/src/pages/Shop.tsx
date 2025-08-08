import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import ProductCard from '../components/ProductCard';
import LazyImage from '../components/LazyImage';
import SEOHead from '../components/SEOHead';

const shimmerLoad = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const ShopContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #E0F6FF 0%, #F8FCFF 50%, #FFFFFF 100%);
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const ShopHeader = styled.section`
  text-align: center;
  margin-bottom: 3rem;
  animation: ${fadeInUp} 0.8s ease-out;
`;

const ShopTitle = styled.h1`
  font-size: 3rem;
  font-weight: 800;
  color: var(--primary-dark-blue);
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.3);
  position: relative;

  &::after {
    content: '🛒';
    position: absolute;
    top: -10px;
    right: -40px;
    font-size: 2rem;
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  @media (max-width: 768px) {
    font-size: 2.2rem;
    
    &::after {
      right: -30px;
      font-size: 1.5rem;
    }
  }
`;

const ShopSubtitle = styled.p`
  font-size: 1.2rem;
  color: var(--text-medium);
  margin-bottom: 2rem;
  font-family: 'Poppins', sans-serif;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const FilterSection = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
  animation: ${fadeInUp} 0.8s ease-out 0.2s both;

  @media (max-width: 768px) {
    gap: 0.5rem;
  }
`;

const FilterButton = styled.button<{ $active: boolean }>`
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  border: 2px solid ${props => props.$active ? 'var(--primary-dark-blue)' : 'var(--primary-light-blue)'};
  background: ${props => props.$active 
    ? 'linear-gradient(135deg, var(--primary-dark-blue) 0%, var(--accent-blue) 100%)'
    : 'rgba(255, 255, 255, 0.8)'
  };
  color: ${props => props.$active ? 'white' : 'var(--primary-dark-blue)'};
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 139, 0.2);
  }

  @media (max-width: 768px) {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
  }
`;

const ProductsGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(3, minmax(400px, auto));
  gap: 2rem;
  grid-template-areas:
    "small medium"
    "large bundle"
    "recommendations recommendations";

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(5, minmax(350px, auto));
    grid-template-areas:
      "small"
      "medium" 
      "large"
      "bundle"
      "recommendations";
  }

  @media (max-width: 768px) {
    gap: 1.5rem;
    grid-template-rows: repeat(5, minmax(320px, auto));
  }
`;

const LoadingCard = styled.div`
  background: linear-gradient(135deg, #FFFFFF 0%, #F8FCFF 100%);
  border-radius: 20px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(173, 216, 230, 0.2),
      transparent
    );
    animation: ${shimmerLoad} 1.5s infinite;
  }
`;

const LoadingSkeleton = styled.div<{ $height: string; $width?: string }>`
  height: ${props => props.$height};
  width: ${props => props.$width || '100%'};
  background: linear-gradient(135deg, #E0F6FF 0%, #F0F8FF 100%);
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const ErrorMessage = styled.div`
  background: linear-gradient(135deg, #FFE5E5 0%, #FFF0F0 100%);
  border: 2px solid #FFB3B3;
  border-radius: 15px;
  padding: 2rem;
  text-align: center;
  color: #D32F2F;
  font-family: 'Poppins', sans-serif;
  margin: 2rem auto;
  max-width: 500px;
`;

const RecommendationsSection = styled.section`
  grid-area: recommendations;
  background: linear-gradient(135deg, #F0F8FF 0%, #E0F6FF 100%);
  border-radius: 20px;
  padding: 2rem;
  border: 2px solid rgba(173, 216, 230, 0.3);
  animation: ${fadeInUp} 0.8s ease-out 0.4s both;

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const RecommendationsTitle = styled.h2`
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--primary-dark-blue);
  margin-bottom: 1rem;
  text-align: center;
`;

const RecommendationsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
`;

const RecommendationItem = styled.div`
  background: white;
  border-radius: 15px;
  padding: 1rem;
  text-align: center;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
  }
`;

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: Array<{
    url: string;
    altText: string;
    isPrimary: boolean;
  }>;
  dimensions: {
    width: number;
    height: number;
    unit: string;
  };
  stock: {
    quantity: number;
    lowStockThreshold: number;
    inStock: boolean;
  };
  features: string[];
  sustainability: {
    carbonSavedPerUse: number;
    reusabilityCount: number;
  };
  specifications: {
    coolingDuration: string;
  };
  category: string;
  tags: string[];
}

const Shop: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchProducts();
    fetchRecommendations();
  }, [filter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('category', filter);
      }

      const response = await fetch(`${API_BASE}/products?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const sessionId = localStorage.getItem('cart-session-id');
      if (!sessionId) return;

      const response = await fetch(`${API_BASE}/cart/${sessionId}/recommendations`);
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.products || []);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    }
  };

  const handleQuickView = (product: Product) => {
    // TODO: Implement quick view modal
    console.log('Quick view for product:', product);
  };

  const getGridArea = (index: number, product: Product) => {
    // Map products to specific grid areas for Bento layout
    if (product.name.includes('Small')) return 'small';
    if (product.name.includes('Medium')) return 'medium';
    if (product.name.includes('Large') && !product.name.includes('Bundle')) return 'large';
    if (product.name.includes('Bundle') || product.name.includes('Adventure')) return 'bundle';
    return undefined;
  };

  if (error) {
    return (
      <ShopContainer>
        <ErrorMessage>
          <h3>Oops! Something went wrong</h3>
          <p>{error}</p>
          <button onClick={fetchProducts} style={{ marginTop: '1rem' }}>
            Try Again
          </button>
        </ErrorMessage>
      </ShopContainer>
    );
  }

  return (
    <>
      <SEOHead
        title="Shop ICEPACA - Premium Reusable Ice Packs | Eco-Friendly Cooling"
        description="Shop our complete range of ICEPACA reusable ice packs. Small, Medium, Large, and Adventure Bundles. Perfect for lunch boxes, coolers, and marine use. Free shipping on orders over $35."
        keywords={['buy ice packs', 'reusable cooling', 'ICEPACA shop', 'eco-friendly ice packs', 'cooling products online']}
      />
      
      <ShopContainer>
        <ShopHeader>
          <ShopTitle>Shop ICEPACA</ShopTitle>
          <ShopSubtitle>
            Premium reusable ice packs for every cooling need. 
            From lunch boxes to marine adventures, we've got you covered.
          </ShopSubtitle>
        </ShopHeader>

        <FilterSection>
          <FilterButton 
            $active={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            All Products
          </FilterButton>
          <FilterButton 
            $active={filter === 'Ice Packs'}
            onClick={() => setFilter('Ice Packs')}
          >
            Ice Packs
          </FilterButton>
          <FilterButton 
            $active={filter === 'Bundles'}
            onClick={() => setFilter('Bundles')}
          >
            Bundles
          </FilterButton>
        </FilterSection>

        <ProductsGrid>
          {loading ? (
            // Loading skeletons
            Array.from({ length: 4 }).map((_, index) => (
              <LoadingCard key={index}>
                <LoadingSkeleton $height="200px" />
                <LoadingSkeleton $height="24px" $width="60%" />
                <LoadingSkeleton $height="16px" />
                <LoadingSkeleton $height="16px" $width="80%" />
                <LoadingSkeleton $height="40px" $width="120px" />
              </LoadingCard>
            ))
          ) : (
            products.map((product, index) => (
              <ProductCard
                key={product._id}
                product={product}
                gridArea={getGridArea(index, product)}
                onQuickView={handleQuickView}
              />
            ))
          )}

          {!loading && products.length > 0 && recommendations.length > 0 && (
            <RecommendationsSection>
              <RecommendationsTitle>
                🎯 Recommended for You
              </RecommendationsTitle>
              <RecommendationsList>
                {recommendations.slice(0, 3).map((item, index) => (
                  <RecommendationItem key={index}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                      {item.name.includes('Small') ? '🍱' : 
                       item.name.includes('Large') ? '⛵' : '🏕️'}
                    </div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      {item.name}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-medium)' }}>
                      ${item.price}
                    </p>
                  </RecommendationItem>
                ))}
              </RecommendationsList>
            </RecommendationsSection>
          )}
        </ProductsGrid>
      </ShopContainer>
    </>
  );
};

export default Shop;