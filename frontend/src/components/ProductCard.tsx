import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useCart } from '../contexts/CartContext';
import LazyImage from './LazyImage';

const frostAnimation = keyframes`
  0% { 
    background-position: -200px 0;
    transform: scale(1);
  }
  50% {
    background-position: 200px 0;
    transform: scale(1.02);
  }
  100% { 
    background-position: 400px 0;
    transform: scale(1);
  }
`;

const sparkleFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
  25% { transform: translateY(-5px) rotate(90deg); opacity: 1; }
  50% { transform: translateY(-2px) rotate(180deg); opacity: 0.7; }
  75% { transform: translateY(-7px) rotate(270deg); opacity: 1; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(173, 216, 230, 0.3); }
  50% { box-shadow: 0 0 25px rgba(173, 216, 230, 0.6); }
`;

const CardContainer = styled.div<{ $gridArea?: string }>`
  position: relative;
  background: linear-gradient(135deg, #FFFFFF 0%, #F8FCFF 100%);
  border-radius: 20px;
  padding: 1.5rem;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 139, 0.1);
  border: 2px solid transparent;
  grid-area: ${props => props.$gridArea || 'auto'};

  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(
      45deg,
      transparent,
      rgba(173, 216, 230, 0.1),
      transparent,
      rgba(173, 216, 230, 0.1),
      transparent
    );
    border-radius: 22px;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 40px rgba(0, 0, 139, 0.2);
    border-color: rgba(173, 216, 230, 0.3);
    
    &::before {
      opacity: 1;
      animation: ${frostAnimation} 2s ease-in-out;
    }
  }

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const ImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 200px;
  margin-bottom: 1rem;
  border-radius: 15px;
  overflow: hidden;
  background: linear-gradient(135deg, #E0F6FF 0%, #F0F8FF 100%);

  @media (max-width: 768px) {
    height: 160px;
  }
`;

const StockBadge = styled.div<{ $status: 'in-stock' | 'low-stock' | 'out-of-stock' }>`
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'Poppins', sans-serif;
  z-index: 2;
  
  ${props => {
    switch (props.$status) {
      case 'in-stock':
        return css`
          background: linear-gradient(135deg, #32CD32 0%, #228B22 100%);
          color: white;
        `;
      case 'low-stock':
        return css`
          background: linear-gradient(135deg, #FFA500 0%, #FF8C00 100%);
          color: white;
          animation: ${pulseGlow} 2s ease-in-out infinite;
        `;
      case 'out-of-stock':
        return css`
          background: linear-gradient(135deg, #FF6B6B 0%, #E74C3C 100%);
          color: white;
        `;
    }
  }}
`;

const PriceContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const CurrentPrice = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-dark-blue);
  font-family: 'Poppins', sans-serif;
`;

const ComparePrice = styled.span`
  font-size: 1rem;
  color: #999;
  text-decoration: line-through;
  font-family: 'Poppins', sans-serif;
`;

const SaveBadge = styled.span`
  background: linear-gradient(135deg, #FF6B6B 0%, #E74C3C 100%);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
`;

const ProductTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--primary-dark-blue);
  line-height: 1.3;
`;

const ProductDescription = styled.p`
  font-size: 0.9rem;
  color: var(--text-medium);
  line-height: 1.4;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const FeaturesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0.75rem 0;
`;

const FeatureItem = styled.li`
  font-size: 0.8rem;
  color: var(--text-medium);
  margin-bottom: 0.25rem;
  padding-left: 1rem;
  position: relative;
  
  &::before {
    content: '❄️';
    position: absolute;
    left: 0;
    font-size: 0.7rem;
  }
`;

const SustainabilityInfo = styled.div`
  background: linear-gradient(135deg, #E8F5E8 0%, #F0FFF0 100%);
  padding: 0.75rem;
  border-radius: 12px;
  margin: 1rem 0;
  border: 1px solid rgba(50, 205, 50, 0.2);
`;

const CarbonSaved = styled.div`
  font-size: 0.8rem;
  color: #228B22;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ActionContainer = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const AddToCartButton = styled.button<{ $disabled?: boolean }>`
  flex: 1;
  background: ${props => props.$disabled 
    ? 'linear-gradient(135deg, #CCC 0%, #AAA 100%)'
    : 'linear-gradient(135deg, #00008B 0%, #4169E1 100%)'
  };
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 25px;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;
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
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: left 0.5s ease;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 139, 0.3);
    animation: ${frostAnimation} 1.5s ease-in-out;
    
    &::before {
      left: 100%;
    }
  }

  &:disabled {
    opacity: 0.6;
  }
`;

const QuickViewButton = styled.button`
  background: rgba(173, 216, 230, 0.2);
  border: 2px solid var(--primary-light-blue);
  color: var(--primary-dark-blue);
  padding: 0.75rem;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;

  &:hover {
    background: var(--primary-light-blue);
    transform: scale(1.1);
    color: var(--primary-dark-blue);
  }
`;

const SparkleEffect = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 1rem;
  animation: ${sparkleFloat} 3s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
`;

const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

interface ProductCardProps {
  product: {
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
  };
  gridArea?: string;
  onQuickView?: (product: any) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  gridArea,
  onQuickView 
}) => {
  const { addToCart, state: cartState } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const getStockStatus = (): 'in-stock' | 'low-stock' | 'out-of-stock' => {
    if (product.stock.quantity === 0) return 'out-of-stock';
    if (product.stock.quantity <= product.stock.lowStockThreshold) return 'low-stock';
    return 'in-stock';
  };

  const getStockText = () => {
    const status = getStockStatus();
    switch (status) {
      case 'in-stock':
        return 'In Stock';
      case 'low-stock':
        return `Only ${product.stock.quantity} left!`;
      case 'out-of-stock':
        return 'Out of Stock';
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (product.stock.quantity === 0) return;
    
    setIsAdding(true);
    try {
      await addToCart(product, 1);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView?.(product);
  };

  const savings = product.compareAtPrice ? product.compareAtPrice - product.price : 0;
  const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0];

  return (
    <CardContainer $gridArea={gridArea}>
      <SparkleEffect>❄️</SparkleEffect>
      
      <ImageContainer>
        <StockBadge $status={getStockStatus()}>
          {getStockText()}
        </StockBadge>
        
        <LazyImage
          src={primaryImage?.url || '/images/placeholder.jpg'}
          alt={primaryImage?.altText || product.name}
          aspectRatio="16/9"
        />
      </ImageContainer>

      <ProductTitle>{product.name}</ProductTitle>
      
      <PriceContainer>
        <CurrentPrice>${product.price}</CurrentPrice>
        {product.compareAtPrice && (
          <>
            <ComparePrice>${product.compareAtPrice}</ComparePrice>
            <SaveBadge>Save ${savings}</SaveBadge>
          </>
        )}
      </PriceContainer>

      <ProductDescription>{product.description}</ProductDescription>

      <FeaturesList>
        {product.features?.slice(0, 3).map((feature, index) => (
          <FeatureItem key={index}>{feature}</FeatureItem>
        ))}
      </FeaturesList>

      <SustainabilityInfo>
        <CarbonSaved>
          🌱 Saves {product.sustainability.carbonSavedPerUse} kg CO₂ per use
        </CarbonSaved>
        <div style={{ fontSize: '0.75rem', color: '#228B22', marginTop: '0.25rem' }}>
          Reusable {product.sustainability.reusabilityCount}+ times
        </div>
      </SustainabilityInfo>

      <div style={{ fontSize: '0.8rem', color: 'var(--text-medium)', marginBottom: '1rem' }}>
        📏 {product.dimensions.width}" × {product.dimensions.height}" • 
        ❄️ Cools for {product.specifications.coolingDuration}
      </div>

      <ActionContainer>
        <AddToCartButton
          onClick={handleAddToCart}
          $disabled={product.stock.quantity === 0 || isAdding}
          disabled={product.stock.quantity === 0 || isAdding}
          aria-label={`Add ${product.name} to cart`}
        >
          {isAdding ? (
            <LoadingSpinner />
          ) : product.stock.quantity === 0 ? (
            'Out of Stock'
          ) : (
            'Add to Cart'
          )}
        </AddToCartButton>
        
        <QuickViewButton
          onClick={handleQuickView}
          aria-label={`Quick view ${product.name}`}
          title="Quick View"
        >
          👁️
        </QuickViewButton>
      </ActionContainer>
    </CardContainer>
  );
};

export default ProductCard;