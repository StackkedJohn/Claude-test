import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useCart } from '../contexts/CartContext';
import SEOHead from '../components/SEOHead';

const slideInUp = keyframes`
  from { transform: translateY(50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const celebrate = keyframes`
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(5deg) scale(1.1); }
  50% { transform: rotate(-5deg) scale(1.1); }
  75% { transform: rotate(5deg) scale(1.1); }
  100% { transform: rotate(0deg) scale(1); }
`;

const SuccessContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #E0F6FF 0%, #F8FCFF 100%);
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const SuccessCard = styled.div`
  background: white;
  border-radius: 25px;
  padding: 3rem;
  max-width: 600px;
  width: 100%;
  text-align: center;
  box-shadow: 0 15px 35px rgba(0, 0, 139, 0.15);
  animation: ${slideInUp} 0.8s ease-out;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(173, 216, 230, 0.1) 0%, transparent 70%);
    animation: ${pulse} 4s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
  }
`;

const SuccessIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1.5rem;
  animation: ${celebrate} 2s ease-in-out;
  z-index: 2;
  position: relative;
`;

const SuccessTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--primary-dark-blue);
  margin-bottom: 1rem;
  z-index: 2;
  position: relative;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const SuccessMessage = styled.p`
  font-size: 1.2rem;
  color: var(--text-medium);
  margin-bottom: 2rem;
  line-height: 1.6;
  z-index: 2;
  position: relative;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const OrderDetails = styled.div`
  background: linear-gradient(135deg, #F0F8FF 0%, #E0F6FF 100%);
  border-radius: 15px;
  padding: 1.5rem;
  margin: 2rem 0;
  text-align: left;
  z-index: 2;
  position: relative;
`;

const OrderDetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(173, 216, 230, 0.3);

  &:last-child {
    border-bottom: none;
    font-weight: 700;
    color: var(--primary-dark-blue);
    font-size: 1.1rem;
  }

  .label {
    color: var(--text-medium);
  }

  .value {
    color: var(--primary-dark-blue);
    font-weight: 600;
  }
`;

const NextSteps = styled.div`
  background: rgba(50, 205, 50, 0.1);
  border: 2px solid rgba(50, 205, 50, 0.2);
  border-radius: 15px;
  padding: 1.5rem;
  margin: 2rem 0;
  z-index: 2;
  position: relative;

  h3 {
    color: #228B22;
    font-size: 1.2rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      padding: 0.5rem 0;
      color: #2E7D32;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      &::before {
        content: '✅';
        font-size: 1rem;
      }
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2rem;
  z-index: 2;
  position: relative;
`;

const ActionButton = styled(Link)<{ $variant?: 'primary' | 'secondary' }>`
  display: inline-block;
  padding: 1rem 2rem;
  border-radius: 25px;
  text-decoration: none;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
  
  ${props => props.$variant === 'secondary' 
    ? `
      background: rgba(173, 216, 230, 0.2);
      color: var(--primary-dark-blue);
      border: 2px solid var(--primary-light-blue);
      
      &:hover {
        background: var(--primary-light-blue);
        transform: translateY(-2px);
      }
    `
    : `
      background: linear-gradient(135deg, #00008B 0%, #4169E1 100%);
      color: white;
      
      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(0, 0, 139, 0.3);
      }
    `
  }

  @media (max-width: 768px) {
    padding: 0.875rem 1.5rem;
    font-size: 0.9rem;
  }
`;

const SocialShare = styled.div`
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(173, 216, 230, 0.3);
  z-index: 2;
  position: relative;

  h4 {
    color: var(--primary-dark-blue);
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  .share-text {
    font-size: 0.9rem;
    color: var(--text-medium);
    margin-bottom: 1rem;
  }
`;

interface OrderInfo {
  orderNumber: string;
  total: number;
  email: string;
  estimatedDelivery?: string;
}

const CheckoutSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Get payment intent ID from URL params
  const paymentIntentId = searchParams.get('payment_intent');
  const clientSecret = searchParams.get('payment_intent_client_secret');

  useEffect(() => {
    // Clear the cart after successful payment
    clearCart();

    // Simulate fetching order details (in real app, fetch from API)
    const fetchOrderDetails = async () => {
      try {
        if (paymentIntentId) {
          // In a real app, you would fetch order details from your API
          // For now, we'll use mock data
          const mockOrderInfo: OrderInfo = {
            orderNumber: `ICEPACA-${Date.now().toString().slice(-8)}`,
            total: parseFloat(searchParams.get('amount') || '0') / 100, // Convert from cents
            email: searchParams.get('email') || 'customer@example.com',
            estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
          };
          setOrderInfo(mockOrderInfo);
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [paymentIntentId, searchParams, clearCart]);

  if (loading) {
    return (
      <SuccessContainer>
        <SuccessCard>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❄️</div>
          <p>Processing your order...</p>
        </SuccessCard>
      </SuccessContainer>
    );
  }

  return (
    <SuccessContainer>
      <SEOHead
        title="Order Confirmed - ICEPACA"
        description="Your ICEPACA order has been confirmed and is being processed"
        noindex={true}
      />
      
      <SuccessCard>
        <SuccessIcon>🎉🧊</SuccessIcon>
        
        <SuccessTitle>Order Confirmed!</SuccessTitle>
        
        <SuccessMessage>
          Thank you for choosing ICEPACA! Your order has been successfully placed and 
          you'll receive a confirmation email shortly with your order details and tracking information.
        </SuccessMessage>

        {orderInfo && (
          <OrderDetails>
            <OrderDetailRow>
              <span className="label">Order Number:</span>
              <span className="value">{orderInfo.orderNumber}</span>
            </OrderDetailRow>
            <OrderDetailRow>
              <span className="label">Email:</span>
              <span className="value">{orderInfo.email}</span>
            </OrderDetailRow>
            <OrderDetailRow>
              <span className="label">Estimated Delivery:</span>
              <span className="value">{orderInfo.estimatedDelivery || 'Within 5-7 business days'}</span>
            </OrderDetailRow>
            <OrderDetailRow>
              <span className="label">Total Paid:</span>
              <span className="value">${orderInfo.total.toFixed(2)}</span>
            </OrderDetailRow>
          </OrderDetails>
        )}

        <NextSteps>
          <h3>
            <span>📋</span>
            What happens next?
          </h3>
          <ul>
            <li>You'll receive an email confirmation within 15 minutes</li>
            <li>Your order will be processed and packed within 1-2 business days</li>
            <li>You'll get a shipping notification with tracking details</li>
            <li>Your ICEPACA products will arrive in 5-7 business days</li>
          </ul>
        </NextSteps>

        <ActionButtons>
          <ActionButton to="/shop">
            🛒 Continue Shopping
          </ActionButton>
          <ActionButton to="/" $variant="secondary">
            🏠 Back to Home
          </ActionButton>
        </ActionButtons>

        <SocialShare>
          <h4>Love ICEPACA? Share the cool!</h4>
          <div className="share-text">
            Help your friends discover the best reusable ice packs on the market! 
            Share your ICEPACA experience on social media.
          </div>
          <div style={{ fontSize: '0.9rem', color: '#32CD32' }}>
            🌱 Thank you for choosing a sustainable cooling solution!
          </div>
        </SocialShare>
      </SuccessCard>
    </SuccessContainer>
  );
};

export default CheckoutSuccess;