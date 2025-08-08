import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes } from 'styled-components';

// Kinetic animations for shipping methods
const lightningBolt = keyframes`
  0% { transform: translateX(-100px) rotate(-10deg); opacity: 0; }
  50% { transform: translateX(0px) rotate(0deg); opacity: 1; }
  100% { transform: translateX(100px) rotate(10deg); opacity: 0; }
`;

const truckDrive = keyframes`
  0% { transform: translateX(-50px); }
  100% { transform: translateX(50px); }
`;

const rocketLaunch = keyframes`
  0% { transform: translateY(0px) scale(1); }
  50% { transform: translateY(-20px) scale(1.1); }
  100% { transform: translateY(0px) scale(1); }
`;

const waveFlow = keyframes`
  0%, 100% { transform: translateY(0px); }
  25% { transform: translateY(-5px); }
  50% { transform: translateY(0px); }
  75% { transform: translateY(5px); }
`;

const ShippingContainer = styled(motion.div)`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  margin: 2rem 0;
  box-shadow: 0 8px 25px rgba(0, 0, 139, 0.1);
`;

const ShippingHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
  margin-bottom: 1.5rem;

  h3 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary-dark-blue);
    margin: 0;
  }
`;

const FreeShippingProgress = styled.div`
  background: rgba(173, 216, 230, 0.1);
  border-radius: 15px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 2px solid transparent;
  transition: border-color 0.3s ease;

  &.qualified {
    border-color: #32CD32;
    background: rgba(50, 205, 50, 0.1);
  }
`;

const ProgressBarContainer = styled.div`
  background: #E0F6FF;
  border-radius: 25px;
  height: 12px;
  margin: 1rem 0;
  overflow: hidden;
  position: relative;
`;

const ProgressBar = styled(motion.div)<{ $progress: number; $qualified: boolean }>`
  height: 100%;
  background: ${props => props.$qualified 
    ? 'linear-gradient(90deg, #32CD32 0%, #228B22 100%)'
    : 'linear-gradient(90deg, #00008B 0%, #4169E1 100%)'
  };
  border-radius: 25px;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    100% { left: 100%; }
  }
`;

const ProgressText = styled.div<{ $qualified: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.$qualified ? '#228B22' : 'var(--primary-dark-blue)'};

  .amount {
    font-size: 1.1rem;
  }
`;

const ShippingMethodGrid = styled.div`
  display: grid;
  gap: 1rem;
`;

const ShippingMethod = styled(motion.div)<{ $selected: boolean; $ecoFriendly?: boolean }>`
  border: 2px solid ${props => 
    props.$selected ? 'var(--primary-dark-blue)' : 
    props.$ecoFriendly ? '#32CD32' : 'var(--primary-light-blue)'
  };
  border-radius: 15px;
  padding: 1.5rem;
  background: ${props => 
    props.$selected ? 'rgba(0, 0, 139, 0.05)' : 
    props.$ecoFriendly ? 'rgba(50, 205, 50, 0.05)' : 'white'
  };
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 139, 0.15);
  }
`;

const MethodHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const MethodInfo = styled.div`
  flex: 1;
`;

const KineticAnimation = styled.div<{ $animation: string }>`
  width: 60px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  .lightning {
    font-size: 2rem;
    animation: ${lightningBolt} 2s infinite;
    color: #FFD700;
  }

  .truck {
    font-size: 2rem;
    animation: ${truckDrive} 3s ease-in-out infinite;
    color: #4169E1;
  }

  .rocket {
    font-size: 2rem;
    animation: ${rocketLaunch} 1.5s ease-in-out infinite;
    color: #FF6347;
  }

  .wave {
    font-size: 2rem;
    animation: ${waveFlow} 2s ease-in-out infinite;
    color: #87CEEB;
  }
`;

const MethodTitle = styled.h4`
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--primary-dark-blue);
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MethodSubtitle = styled.p`
  font-size: 0.9rem;
  color: var(--text-medium);
  margin: 0 0 0.75rem 0;
`;

const PriceSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
`;

const Price = styled.div<{ $free?: boolean }>`
  font-size: ${props => props.$free ? '1.3rem' : '1.5rem'};
  font-weight: 800;
  color: ${props => props.$free ? '#32CD32' : 'var(--primary-dark-blue)'};
`;

const EstimatedDays = styled.div`
  font-size: 0.8rem;
  color: var(--text-medium);
  text-align: right;
`;

const MethodFeatures = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`;

const Feature = styled.span<{ $eco?: boolean }>`
  background: ${props => props.$eco ? 'rgba(50, 205, 50, 0.1)' : 'rgba(0, 0, 139, 0.1)'};
  color: ${props => props.$eco ? '#228B22' : 'var(--primary-dark-blue)'};
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const CarbonFootprint = styled.div<{ $ecoFriendly: boolean }>`
  background: ${props => props.$ecoFriendly ? 'rgba(50, 205, 50, 0.1)' : 'rgba(255, 165, 0, 0.1)'};
  border-left: 3px solid ${props => props.$ecoFriendly ? '#32CD32' : '#FFA500'};
  padding: 0.75rem;
  border-radius: 0 10px 10px 0;
  margin-top: 1rem;
  font-size: 0.85rem;

  .co2-amount {
    font-weight: 600;
    color: ${props => props.$ecoFriendly ? '#228B22' : '#FF8C00'};
  }

  .offset-info {
    font-size: 0.75rem;
    color: var(--text-medium);
    margin-top: 0.25rem;
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--text-medium);

  .spinner {
    width: 30px;
    height: 30px;
    border: 3px solid var(--primary-light-blue);
    border-top: 3px solid var(--primary-dark-blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

interface ShippingRate {
  id: string;
  provider: string;
  serviceName: string;
  displayName: string;
  cost: number;
  estimatedDays: number;
  carbonFootprint?: {
    co2Grams: number;
    offsetCost?: number;
    ecoFriendly: boolean;
  };
  features: string[];
  kineticsAnimation?: string;
}

interface FreeShippingProgress {
  threshold: number;
  current: number;
  remaining: number;
  qualified: boolean;
  progress: number;
}

interface ShippingCalculatorProps {
  cartItems: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddress?: {
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  onShippingSelect?: (rate: ShippingRate) => void;
  selectedRateId?: string;
  orderTotal?: number;
}

const ShippingCalculator: React.FC<ShippingCalculatorProps> = ({
  cartItems,
  shippingAddress,
  onShippingSelect,
  selectedRateId,
  orderTotal = 0
}) => {
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [freeShippingProgress, setFreeShippingProgress] = useState<FreeShippingProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cartItems.length > 0 && shippingAddress?.zipCode) {
      fetchShippingRates();
    }
  }, [cartItems, shippingAddress]);

  const fetchShippingRates = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/shipping/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toAddress: {
            firstName: 'Customer',
            lastName: 'Estimate',
            address1: '123 Main St',
            city: shippingAddress?.city || 'City',
            state: shippingAddress?.state || 'CA',
            zipCode: shippingAddress?.zipCode || '94102',
            country: shippingAddress?.country || 'US'
          },
          items: cartItems
        })
      });

      if (response.ok) {
        const data = await response.json();
        setShippingRates(data.quote.rates || []);
        setFreeShippingProgress(data.freeShipping);
      } else {
        setError('Failed to calculate shipping rates');
      }
    } catch (error) {
      console.error('Shipping calculation error:', error);
      setError('Unable to calculate shipping. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMethodSelect = (rate: ShippingRate) => {
    if (onShippingSelect) {
      onShippingSelect(rate);
    }
  };

  const renderKineticAnimation = (animation: string) => {
    const animationMap: { [key: string]: string } = {
      'lightning': '⚡',
      'truck': '🚚', 
      'rocket': '🚀',
      'wave': '🌊'
    };

    return (
      <KineticAnimation $animation={animation}>
        <div className={animation}>
          {animationMap[animation] || '📦'}
        </div>
      </KineticAnimation>
    );
  };

  return (
    <ShippingContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <ShippingHeader>
        <h3>🚚 Shipping Options</h3>
      </ShippingHeader>

      {freeShippingProgress && (
        <FreeShippingProgress className={freeShippingProgress.qualified ? 'qualified' : ''}>
          <ProgressText $qualified={freeShippingProgress.qualified}>
            <span>
              {freeShippingProgress.qualified ? (
                <>🎉 You qualify for FREE shipping!</>
              ) : (
                <>Add <span className="amount">${freeShippingProgress.remaining.toFixed(2)}</span> more for FREE shipping</>
              )}
            </span>
            <span className="amount">${freeShippingProgress.current.toFixed(2)} / ${freeShippingProgress.threshold.toFixed(2)}</span>
          </ProgressText>
          
          <ProgressBarContainer>
            <ProgressBar
              $progress={freeShippingProgress.progress}
              $qualified={freeShippingProgress.qualified}
              initial={{ width: 0 }}
              animate={{ width: `${freeShippingProgress.progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </ProgressBarContainer>
          
          {!freeShippingProgress.qualified && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-medium)', textAlign: 'center', marginTop: '0.5rem' }}>
              Almost there! Add a few more items to unlock free shipping 📦
            </div>
          )}
        </FreeShippingProgress>
      )}

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoadingState>
              <div className="spinner"></div>
              Calculating shipping rates...
            </LoadingState>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              padding: '1rem', 
              background: 'rgba(255, 71, 87, 0.1)', 
              border: '2px solid #FF4757',
              borderRadius: '10px',
              color: '#FF4757',
              textAlign: 'center'
            }}
          >
            {error}
          </motion.div>
        )}

        {!loading && !error && shippingRates.length > 0 && (
          <ShippingMethodGrid>
            <AnimatePresence>
              {shippingRates.map((rate, index) => (
                <ShippingMethod
                  key={rate.id}
                  $selected={selectedRateId === rate.id}
                  $ecoFriendly={rate.carbonFootprint?.ecoFriendly}
                  onClick={() => handleMethodSelect(rate)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <MethodHeader>
                    <MethodInfo>
                      <MethodTitle>
                        {rate.displayName}
                        {rate.carbonFootprint?.ecoFriendly && <span style={{ color: '#32CD32' }}>🌱</span>}
                      </MethodTitle>
                      <MethodSubtitle>
                        via {rate.provider} • {rate.serviceName}
                      </MethodSubtitle>
                    </MethodInfo>
                    
                    <PriceSection>
                      {renderKineticAnimation(rate.kineticsAnimation || 'wave')}
                      <Price $free={rate.cost === 0}>
                        {rate.cost === 0 ? 'FREE' : `$${rate.cost.toFixed(2)}`}
                      </Price>
                      <EstimatedDays>
                        {rate.estimatedDays === 1 ? 'Next day' : `${rate.estimatedDays} days`}
                      </EstimatedDays>
                    </PriceSection>
                  </MethodHeader>

                  {rate.features && rate.features.length > 0 && (
                    <MethodFeatures>
                      {rate.features.map((feature, featureIndex) => (
                        <Feature 
                          key={featureIndex}
                          $eco={feature.toLowerCase().includes('eco') || feature.toLowerCase().includes('green')}
                        >
                          {feature}
                        </Feature>
                      ))}
                    </MethodFeatures>
                  )}

                  {rate.carbonFootprint && (
                    <CarbonFootprint $ecoFriendly={rate.carbonFootprint.ecoFriendly}>
                      <div>
                        🌍 Carbon footprint: <span className="co2-amount">{rate.carbonFootprint.co2Grams}g CO₂</span>
                        {rate.carbonFootprint.ecoFriendly && <span style={{ color: '#32CD32' }}> • Eco-friendly choice! 🌱</span>}
                      </div>
                      {rate.carbonFootprint.offsetCost && (
                        <div className="offset-info">
                          Carbon offset included: ${rate.carbonFootprint.offsetCost.toFixed(2)}
                        </div>
                      )}
                    </CarbonFootprint>
                  )}
                </ShippingMethod>
              ))}
            </AnimatePresence>
          </ShippingMethodGrid>
        )}
      </AnimatePresence>
    </ShippingContainer>
  );
};

export default ShippingCalculator;