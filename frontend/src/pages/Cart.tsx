import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useCart } from '../contexts/CartContext';
import SEOHead from '../components/SEOHead';
import LazyImage from '../components/LazyImage';
import FreeShippingProgressBar from '../components/FreeShippingProgressBar';

const slideIn = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const frostShimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
`;

const CartContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #E0F6FF 0%, #F8FCFF 100%);
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const CartHeader = styled.div`
  text-align: center;
  margin-bottom: 3rem;
  animation: ${slideIn} 0.8s ease-out;
`;

const CartTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--primary-dark-blue);
  margin-bottom: 1rem;
  position: relative;

  &::after {
    content: '🛒';
    position: absolute;
    top: -10px;
    right: -40px;
    font-size: 2rem;
    animation: ${pulse} 3s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    font-size: 2rem;
    
    &::after {
      right: -30px;
      font-size: 1.5rem;
    }
  }
`;

const CartContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 3rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const CartItems = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 8px 25px rgba(0, 0, 139, 0.1);
  animation: ${slideIn} 0.8s ease-out 0.2s both;
`;

const EmptyCart = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-medium);
  
  h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: var(--primary-dark-blue);
  }
  
  p {
    margin-bottom: 2rem;
  }
`;

const ShopButton = styled(Link)`
  display: inline-block;
  background: linear-gradient(135deg, #00008B 0%, #4169E1 100%);
  color: white;
  padding: 1rem 2rem;
  border-radius: 25px;
  text-decoration: none;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 139, 0.3);
  }
`;

const CartItem = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr auto auto auto;
  gap: 1.5rem;
  align-items: center;
  padding: 1.5rem 0;
  border-bottom: 1px solid #E0F6FF;

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 768px) {
    grid-template-columns: 80px 1fr;
    grid-template-rows: auto auto auto;
    gap: 1rem;
    
    > *:nth-child(3),
    > *:nth-child(4),
    > *:nth-child(5) {
      grid-column: 1 / -1;
    }
  }
`;

const ItemImage = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 15px;
  overflow: hidden;
  background: var(--light-blue-bg);

  @media (max-width: 768px) {
    width: 80px;
    height: 80px;
  }
`;

const ItemDetails = styled.div`
  h4 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--primary-dark-blue);
    margin-bottom: 0.5rem;
  }
  
  p {
    color: var(--text-medium);
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
  }
`;

const ItemPrice = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--primary-dark-blue);
  text-align: right;

  @media (max-width: 768px) {
    text-align: left;
  }
`;

const QuantityControl = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--light-blue-bg);
  border-radius: 25px;
  padding: 0.5rem;

  button {
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 50%;
    background: var(--primary-dark-blue);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: scale(1.1);
    }

    &:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  }

  span {
    min-width: 40px;
    text-align: center;
    font-weight: 600;
    color: var(--primary-dark-blue);
  }
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: #FF4757;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 71, 87, 0.1);
    transform: scale(1.1);
  }
`;

const CartSummary = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  height: fit-content;
  box-shadow: 0 8px 25px rgba(0, 0, 139, 0.1);
  position: sticky;
  top: 2rem;
  animation: ${slideIn} 0.8s ease-out 0.4s both;
`;

const SummaryTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-dark-blue);
  margin-bottom: 1.5rem;
  text-align: center;
`;

const SummaryRow = styled.div<{ $isTotal?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  font-family: 'Poppins', sans-serif;
  
  ${props => props.$isTotal && `
    border-top: 2px solid var(--primary-light-blue);
    margin-top: 1rem;
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--primary-dark-blue);
  `}
`;

const PromoSection = styled.div`
  margin: 1.5rem 0;
  padding: 1rem 0;
  border-top: 1px solid #E0F6FF;
  border-bottom: 1px solid #E0F6FF;
`;

const PromoInput = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;

  input {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid var(--primary-light-blue);
    border-radius: 10px;
    font-family: 'Poppins', sans-serif;
    
    &:focus {
      outline: none;
      border-color: var(--primary-dark-blue);
    }
  }

  button {
    background: var(--primary-dark-blue);
    color: white;
    border: none;
    padding: 0.75rem 1rem;
    border-radius: 10px;
    cursor: pointer;
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
    }

    &:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  }
`;

const CheckoutButton = styled(Link)<{ $variant?: 'primary' | 'secondary' }>`
  display: block;
  text-align: center;
  padding: 1.25rem 2rem;
  border-radius: 25px;
  text-decoration: none;
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 1rem;
  position: relative;
  overflow: hidden;
  transition: all 0.4s ease;
  
  ${props => props.$variant === 'secondary' 
    ? `
      background: rgba(173, 216, 230, 0.2);
      color: var(--primary-dark-blue);
      border: 2px solid var(--primary-light-blue);
      
      &:hover {
        background: var(--primary-light-blue);
        transform: translateY(-3px);
      }
    `
    : `
      background: linear-gradient(135deg, #00008B 0%, #4169E1 100%);
      color: white;
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s ease;
      }
      
      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(0, 0, 139, 0.3);
        animation: ${frostShimmer} 1.5s ease-in-out;
        
        &::before {
          left: 100%;
        }
      }
    `
  }
`;

const UpsellSection = styled.div`
  background: linear-gradient(135deg, #F0F8FF 0%, #E0F6FF 100%);
  border-radius: 15px;
  padding: 1.5rem;
  margin-top: 1.5rem;
  border: 2px solid rgba(173, 216, 230, 0.3);
`;

const UpsellTitle = styled.h4`
  color: var(--primary-dark-blue);
  margin-bottom: 1rem;
  font-size: 1.1rem;
`;

const Cart: React.FC = () => {
  const { state, updateQuantity, removeFromCart, applyDiscount } = useCart();
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeFromCart(productId);
    } else {
      await updateQuantity(productId, newQuantity);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    
    setPromoLoading(true);
    try {
      await applyDiscount(promoCode);
    } catch (error) {
      console.error('Error applying promo code:', error);
    } finally {
      setPromoLoading(false);
    }
  };

  const freeShippingThreshold = 50;
  const needsForFreeShipping = Math.max(0, freeShippingThreshold - state.subtotal);

  if (state.items.length === 0) {
    return (
      <CartContainer>
        <SEOHead
          title="Your Cart - ICEPACA"
          description="Review your ICEPACA reusable ice pack selections and proceed to checkout"
        />
        
        <CartHeader>
          <CartTitle>Your Cart is Empty</CartTitle>
        </CartHeader>

        <CartContent>
          <EmptyCart>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛒❄️</div>
            <h3>No items in your cart yet</h3>
            <p>Discover our amazing reusable ice packs and start your cooling adventure!</p>
            <ShopButton to="/shop">Start Shopping</ShopButton>
          </EmptyCart>
        </CartContent>
      </CartContainer>
    );
  }

  return (
    <CartContainer>
      <SEOHead
        title={`Your Cart (${state.totalItems}) - ICEPACA`}
        description="Review your ICEPACA reusable ice pack selections and proceed to checkout"
      />
      
      <CartHeader>
        <CartTitle>Your Cart ({state.totalItems} items)</CartTitle>
      </CartHeader>

      <CartContent>
        <CartItems>
          {state.items.map((item) => (
            <CartItem key={item.productId}>
              <ItemImage>
                <LazyImage
                  src={item.image}
                  alt={item.altText}
                  aspectRatio="1/1"
                />
              </ItemImage>
              
              <ItemDetails>
                <h4>{item.name}</h4>
                <p>Added {new Date(item.addedAt).toLocaleDateString()}</p>
                <p>Individual price: ${item.price}</p>
              </ItemDetails>
              
              <ItemPrice>
                ${(item.price * item.quantity).toFixed(2)}
              </ItemPrice>
              
              <QuantityControl>
                <button 
                  onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                  disabled={state.loading}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span>{item.quantity}</span>
                <button 
                  onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                  disabled={state.loading}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </QuantityControl>
              
              <RemoveButton 
                onClick={() => removeFromCart(item.productId)}
                disabled={state.loading}
                aria-label={`Remove ${item.name} from cart`}
                title="Remove item"
              >
                🗑️
              </RemoveButton>
            </CartItem>
          ))}
        </CartItems>

        <CartSummary>
          <SummaryTitle>💰 Order Summary</SummaryTitle>

          <FreeShippingProgressBar
            currentAmount={state.subtotal}
            threshold={50}
            qualified={state.subtotal >= 50}
          />
          
          <SummaryRow>
            <span>Subtotal ({state.totalItems} items):</span>
            <span>${state.subtotal.toFixed(2)}</span>
          </SummaryRow>
          
          {state.discountAmount > 0 && (
            <SummaryRow>
              <span>Discount ({state.discountCode}):</span>
              <span style={{ color: '#32CD32' }}>-${state.discountAmount.toFixed(2)}</span>
            </SummaryRow>
          )}
          
          <SummaryRow>
            <span>Shipping:</span>
            <span>{state.shippingAmount > 0 ? `$${state.shippingAmount.toFixed(2)}` : 'FREE'}</span>
          </SummaryRow>
          
          {state.taxAmount > 0 && (
            <SummaryRow>
              <span>Tax:</span>
              <span>${state.taxAmount.toFixed(2)}</span>
            </SummaryRow>
          )}
          
          <SummaryRow $isTotal>
            <span>Total:</span>
            <span>${state.totalPrice.toFixed(2)}</span>
          </SummaryRow>

          <PromoSection>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-medium)', marginBottom: '0.5rem' }}>
              Have a promo code?
            </div>
            <PromoInput>
              <input
                type="text"
                placeholder="Enter code (e.g., SUMMERCOOL10)"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                disabled={promoLoading}
              />
              <button
                onClick={handleApplyPromo}
                disabled={promoLoading || !promoCode.trim()}
              >
                {promoLoading ? '...' : 'Apply'}
              </button>
            </PromoInput>
          </PromoSection>

          <CheckoutButton to="/checkout">
            🧊 Chill Out & Purchase
          </CheckoutButton>
          
          <CheckoutButton to="/checkout" $variant="secondary">
            Buy Now
          </CheckoutButton>

          {needsForFreeShipping > 0 && (
            <UpsellSection>
              <UpsellTitle>🚚 Almost there!</UpsellTitle>
              <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                Add ${needsForFreeShipping.toFixed(2)} more for <strong>free shipping</strong>
              </p>
              <ShopButton to="/shop" style={{ fontSize: '0.9rem', padding: '0.75rem 1.5rem' }}>
                Add More Items
              </ShopButton>
            </UpsellSection>
          )}

          <div style={{ 
            textAlign: 'center', 
            marginTop: '1.5rem', 
            fontSize: '0.9rem', 
            color: 'var(--text-medium)' 
          }}>
            🔒 Secure checkout powered by Stripe
          </div>
        </CartSummary>
      </CartContent>
    </CartContainer>
  );
};

export default Cart;