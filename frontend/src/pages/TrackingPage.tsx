import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import SEOHead from '../components/SEOHead';

const trackingPulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
`;

const deliveryTruck = keyframes`
  0% { transform: translateX(-20px); }
  50% { transform: translateX(10px); }
  100% { transform: translateX(-20px); }
`;

const packageFloat = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const TrackingContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #E0F6FF 0%, #F8FCFF 100%);
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const TrackingHeader = styled.div`
  max-width: 800px;
  margin: 0 auto 3rem;
  text-align: center;
`;

const TrackingTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--primary-dark-blue);
  margin-bottom: 1rem;
  position: relative;

  &::after {
    content: '📦';
    position: absolute;
    top: -10px;
    right: -50px;
    font-size: 2rem;
    animation: ${packageFloat} 3s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    font-size: 2rem;
    
    &::after {
      right: -35px;
      font-size: 1.5rem;
    }
  }
`;

const TrackingInputSection = styled(motion.div)`
  max-width: 600px;
  margin: 0 auto 3rem;
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 8px 25px rgba(0, 0, 139, 0.1);
`;

const InputGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const TrackingInput = styled.input`
  flex: 1;
  padding: 1rem;
  border: 2px solid var(--primary-light-blue);
  border-radius: 15px;
  font-family: 'Poppins', sans-serif;
  font-size: 1rem;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--primary-dark-blue);
  }

  &::placeholder {
    color: #87CEEB;
  }
`;

const TrackButton = styled.button`
  background: linear-gradient(135deg, #00008B 0%, #4169E1 100%);
  color: white;
  border: none;
  border-radius: 15px;
  padding: 1rem 2rem;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 139, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const TrackingResults = styled(motion.div)`
  max-width: 800px;
  margin: 0 auto;
`;

const TrackingCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 8px 25px rgba(0, 0, 139, 0.1);
  margin-bottom: 2rem;
`;

const TrackingOverview = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatusCard = styled.div<{ $status: string }>`
  background: ${props => {
    switch (props.$status.toLowerCase()) {
      case 'delivered': return 'linear-gradient(135deg, #32CD32 0%, #228B22 100%)';
      case 'out_for_delivery': return 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)';
      case 'in_transit': return 'linear-gradient(135deg, #4169E1 0%, #00008B 100%)';
      default: return 'linear-gradient(135deg, #87CEEB 0%, #4682B4 100%)';
    }
  }};
  color: white;
  padding: 1.5rem;
  border-radius: 15px;
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
    animation: ${trackingPulse} 3s ease-in-out infinite;
  }

  .status-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    display: block;
    animation: ${props => props.$status.toLowerCase() === 'out_for_delivery' ? deliveryTruck : packageFloat} 2s ease-in-out infinite;
  }

  .status-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .status-subtitle {
    font-size: 0.9rem;
    opacity: 0.9;
  }
`;

const TrackingTimeline = styled.div`
  position: relative;
  margin: 2rem 0;
`;

const TimelineItem = styled(motion.div)<{ $completed: boolean; $current: boolean }>`
  display: flex;
  align-items: flex-start;
  margin-bottom: 2rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 20px;
    top: 50px;
    width: 2px;
    height: calc(100% + 1rem);
    background: ${props => props.$completed || props.$current ? '#32CD32' : '#E0F6FF'};
    z-index: 1;
  }

  &:last-child::before {
    display: none;
  }
`;

const TimelineIcon = styled.div<{ $completed: boolean; $current: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  z-index: 2;
  position: relative;
  font-size: 1.2rem;
  background: ${props => {
    if (props.$current) return 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)';
    if (props.$completed) return 'linear-gradient(135deg, #32CD32 0%, #228B22 100%)';
    return '#E0F6FF';
  }};
  color: ${props => props.$completed || props.$current ? 'white' : 'var(--text-medium)'};
  border: 3px solid ${props => {
    if (props.$current) return '#FFD700';
    if (props.$completed) return '#32CD32';
    return 'var(--primary-light-blue)';
  }};
  
  ${props => props.$current && `
    animation: ${trackingPulse} 2s ease-in-out infinite;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  `}
`;

const TimelineContent = styled.div`
  flex: 1;
  padding-top: 0.5rem;
`;

const TimelineDate = styled.div`
  font-size: 0.9rem;
  color: var(--text-medium);
  margin-bottom: 0.5rem;
`;

const TimelineTitle = styled.h4`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--primary-dark-blue);
  margin: 0 0 0.5rem 0;
`;

const TimelineDescription = styled.p`
  color: var(--text-medium);
  margin: 0;
  line-height: 1.5;
`;

const TimelineLocation = styled.div`
  font-size: 0.85rem;
  color: #4169E1;
  margin-top: 0.25rem;
  font-weight: 500;
`;

const DeliveryEstimate = styled.div`
  background: rgba(50, 205, 50, 0.1);
  border: 2px solid #32CD32;
  border-radius: 15px;
  padding: 1.5rem;
  text-align: center;
  margin-top: 2rem;

  .estimate-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .estimate-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: #228B22;
    margin-bottom: 0.5rem;
  }

  .estimate-date {
    font-size: 1.1rem;
    color: var(--primary-dark-blue);
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: var(--text-medium);

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid var(--primary-light-blue);
    border-top: 4px solid var(--primary-dark-blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorState = styled.div`
  background: rgba(255, 71, 87, 0.1);
  border: 2px solid #FF4757;
  border-radius: 15px;
  padding: 2rem;
  text-align: center;
  color: #FF4757;

  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .error-title {
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }
`;

interface TrackingEvent {
  date: string;
  status: string;
  location?: string;
  description: string;
}

interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery?: string;
  lastUpdate: string;
  events: TrackingEvent[];
}

const TrackingPage: React.FC = () => {
  const { trackingNumber: urlTrackingNumber } = useParams();
  const [searchParams] = useSearchParams();
  const [trackingNumber, setTrackingNumber] = useState(urlTrackingNumber || '');
  const [carrier, setCarrier] = useState(searchParams.get('carrier') || 'USPS');
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urlTrackingNumber) {
      handleTrackPackage();
    }
  }, [urlTrackingNumber]);

  const handleTrackPackage = async () => {
    if (!trackingNumber.trim()) {
      setError('Please enter a tracking number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/shipping/track/${trackingNumber}?carrier=${carrier}`
      );

      if (response.ok) {
        const data = await response.json();
        setTrackingInfo(data.tracking);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Tracking information not found');
      }
    } catch (error) {
      console.error('Tracking error:', error);
      setError('Unable to retrieve tracking information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('delivered')) return '✅';
    if (statusLower.includes('out') && statusLower.includes('delivery')) return '🚛';
    if (statusLower.includes('transit')) return '🚚';
    if (statusLower.includes('shipped') || statusLower.includes('pickup')) return '📦';
    return '📋';
  };

  const getStatusTitle = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('delivered')) return 'Delivered';
    if (statusLower.includes('out') && statusLower.includes('delivery')) return 'Out for Delivery';
    if (statusLower.includes('transit')) return 'In Transit';
    if (statusLower.includes('shipped')) return 'Shipped';
    return 'Processing';
  };

  const isEventCompleted = (eventStatus: string, currentStatus: string): boolean => {
    const statusOrder = ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const eventIndex = statusOrder.findIndex(s => eventStatus.toUpperCase().includes(s));
    const currentIndex = statusOrder.findIndex(s => currentStatus.toUpperCase().includes(s));
    return eventIndex <= currentIndex;
  };

  const isEventCurrent = (eventStatus: string, currentStatus: string): boolean => {
    return eventStatus.toUpperCase().includes(currentStatus.toUpperCase()) ||
           currentStatus.toUpperCase().includes(eventStatus.toUpperCase());
  };

  return (
    <TrackingContainer>
      <SEOHead
        title="Track Your ICEPACA Order"
        description="Track your ICEPACA reusable ice pack delivery with real-time updates"
      />
      
      <TrackingHeader>
        <TrackingTitle>Track Your Order</TrackingTitle>
        <p style={{ color: 'var(--text-medium)', fontSize: '1.1rem' }}>
          Enter your tracking number to see real-time delivery updates
        </p>
      </TrackingHeader>

      <TrackingInputSection
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <InputGroup>
          <TrackingInput
            type="text"
            placeholder="Enter tracking number (e.g., 1Z999AA1234567890)"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleTrackPackage()}
          />
          <TrackButton
            onClick={handleTrackPackage}
            disabled={loading}
          >
            {loading ? '🔍 Tracking...' : '📦 Track Package'}
          </TrackButton>
        </InputGroup>

        <div style={{ fontSize: '0.9rem', color: 'var(--text-medium)', textAlign: 'center' }}>
          Supported carriers: USPS, FedEx, UPS, DHL
        </div>
      </TrackingInputSection>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoadingState>
              <div className="spinner"></div>
              <div>Fetching tracking information...</div>
            </LoadingState>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <TrackingResults>
              <TrackingCard>
                <ErrorState>
                  <div className="error-icon">📦❌</div>
                  <div className="error-title">Tracking Not Found</div>
                  <p>{error}</p>
                  <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
                    Please check your tracking number and try again, or contact our support team.
                  </p>
                </ErrorState>
              </TrackingCard>
            </TrackingResults>
          </motion.div>
        )}

        {trackingInfo && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <TrackingResults>
              <TrackingCard>
                <TrackingOverview>
                  <StatusCard $status={trackingInfo.status}>
                    <span className="status-icon">{getStatusIcon(trackingInfo.status)}</span>
                    <div className="status-title">{getStatusTitle(trackingInfo.status)}</div>
                    <div className="status-subtitle">via {trackingInfo.carrier}</div>
                  </StatusCard>

                  <div style={{ 
                    background: 'rgba(0, 0, 139, 0.05)', 
                    padding: '1.5rem', 
                    borderRadius: '15px',
                    border: '2px solid var(--primary-light-blue)'
                  }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-medium)', marginBottom: '0.5rem' }}>
                      Tracking Number
                    </div>
                    <div style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: '700', 
                      color: 'var(--primary-dark-blue)',
                      fontFamily: 'monospace',
                      letterSpacing: '1px'
                    }}>
                      {trackingInfo.trackingNumber}
                    </div>
                  </div>
                </TrackingOverview>

                {trackingInfo.estimatedDelivery && (
                  <DeliveryEstimate>
                    <div className="estimate-icon">🎯</div>
                    <div className="estimate-title">Estimated Delivery</div>
                    <div className="estimate-date">
                      {new Date(trackingInfo.estimatedDelivery).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </DeliveryEstimate>
                )}

                <TrackingTimeline>
                  <h3 style={{ color: 'var(--primary-dark-blue)', marginBottom: '2rem' }}>
                    📍 Tracking History
                  </h3>
                  
                  {trackingInfo.events.map((event, index) => (
                    <TimelineItem
                      key={index}
                      $completed={isEventCompleted(event.status, trackingInfo.status)}
                      $current={isEventCurrent(event.status, trackingInfo.status)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <TimelineIcon
                        $completed={isEventCompleted(event.status, trackingInfo.status)}
                        $current={isEventCurrent(event.status, trackingInfo.status)}
                      >
                        {getStatusIcon(event.status)}
                      </TimelineIcon>
                      <TimelineContent>
                        <TimelineDate>
                          {new Date(event.date).toLocaleString()}
                        </TimelineDate>
                        <TimelineTitle>{event.status.replace(/_/g, ' ')}</TimelineTitle>
                        <TimelineDescription>{event.description}</TimelineDescription>
                        {event.location && (
                          <TimelineLocation>📍 {event.location}</TimelineLocation>
                        )}
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </TrackingTimeline>
              </TrackingCard>
            </TrackingResults>
          </motion.div>
        )}
      </AnimatePresence>
    </TrackingContainer>
  );
};

export default TrackingPage;