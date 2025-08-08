import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import styled, { keyframes } from 'styled-components';
import { useCart } from '../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import BNPLPaymentMethods from '../components/BNPLPaymentMethods';
import ShippingCalculator from '../components/ShippingCalculator';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_example');

const slideIn = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const progress = keyframes`
  0% { width: 0%; }
  100% { width: 100%; }
`;

const frostShimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
`;

const CheckoutContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #E0F6FF 0%, #F8FCFF 100%);
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const CheckoutHeader = styled.div`
  max-width: 800px;
  margin: 0 auto 3rem;
  text-align: center;
  animation: ${slideIn} 0.8s ease-out;
`;

const CheckoutTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--primary-dark-blue);
  margin-bottom: 1rem;
  position: relative;

  &::after {
    content: '🔒';
    position: absolute;
    top: -10px;
    right: -40px;
    font-size: 2rem;
  }

  @media (max-width: 768px) {
    font-size: 2rem;
    
    &::after {
      right: -30px;
      font-size: 1.5rem;
    }
  }
`;

const ProgressIndicator = styled.div`
  max-width: 600px;
  margin: 0 auto 2rem;
  background: white;
  border-radius: 50px;
  padding: 0.5rem;
  box-shadow: 0 4px 15px rgba(0, 0, 139, 0.1);
`;

const ProgressBar = styled.div<{ $step: number }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    height: 4px;
    width: ${props => (props.$step - 1) * 50}%;
    background: linear-gradient(135deg, #00008B 0%, #4169E1 100%);
    border-radius: 2px;
    transition: width 0.5s ease;
    animation: ${progress} 0.5s ease;
  }
`;

const ProgressStep = styled.div<{ $active: boolean; $completed: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;

  .step-number {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    margin-bottom: 0.5rem;
    transition: all 0.3s ease;
    
    ${props => props.$completed
      ? `
        background: linear-gradient(135deg, #32CD32 0%, #228B22 100%);
        color: white;
      `
      : props.$active
      ? `
        background: linear-gradient(135deg, #00008B 0%, #4169E1 100%);
        color: white;
      `
      : `
        background: #E0F6FF;
        color: var(--text-medium);
      `
    }
  }

  .step-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: ${props => props.$active || props.$completed ? 'var(--primary-dark-blue)' : 'var(--text-medium)'};
    text-align: center;
  }
`;

const CheckoutContent = styled.div`
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

const CheckoutForm = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 8px 25px rgba(0, 0, 139, 0.1);
  animation: ${slideIn} 0.8s ease-out 0.2s both;
`;

const FormSection = styled.div<{ $hidden?: boolean }>`
  display: ${props => props.$hidden ? 'none' : 'block'};
  margin-bottom: 2rem;

  &:last-child {
    margin-bottom: 0;
  }

  h3 {
    font-size: 1.3rem;
    color: var(--primary-dark-blue);
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  grid-column: ${props => props.$fullWidth ? '1 / -1' : 'auto'};

  label {
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    color: var(--primary-dark-blue);
    font-size: 0.9rem;
  }

  input, select {
    padding: 0.75rem;
    border: 2px solid var(--primary-light-blue);
    border-radius: 10px;
    font-family: 'Poppins', sans-serif;
    transition: border-color 0.3s ease;
    
    &:focus {
      outline: none;
      border-color: var(--primary-dark-blue);
    }
  }
`;

const StripeElementContainer = styled.div`
  padding: 0.75rem;
  border: 2px solid var(--primary-light-blue);
  border-radius: 10px;
  background: white;
  transition: border-color 0.3s ease;

  &:focus-within {
    border-color: var(--primary-dark-blue);
  }
`;

const PaymentMethodSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const PaymentMethod = styled.button<{ $active: boolean }>`
  padding: 1rem;
  border: 2px solid ${props => props.$active ? 'var(--primary-dark-blue)' : 'var(--primary-light-blue)'};
  border-radius: 15px;
  background: ${props => props.$active ? 'rgba(0, 0, 139, 0.1)' : 'white'};
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    border-color: var(--primary-dark-blue);
    transform: translateY(-2px);
  }

  .icon {
    font-size: 1.5rem;
  }

  .label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--primary-dark-blue);
  }
`;

const OrderSummary = styled.div`
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

const SummaryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #E0F6FF;

  &:last-child {
    border-bottom: none;
  }

  .item-details {
    h5 {
      font-size: 0.9rem;
      color: var(--primary-dark-blue);
      margin-bottom: 0.25rem;
    }
    
    p {
      font-size: 0.8rem;
      color: var(--text-medium);
    }
  }
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

const TrustBadges = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin: 1.5rem 0;
  flex-wrap: wrap;
`;

const TrustBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-medium);
  
  .icon {
    color: #32CD32;
  }
`;

const CheckoutButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  width: 100%;
  padding: 1.25rem 2rem;
  border: none;
  border-radius: 25px;
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 1rem;
  cursor: pointer;
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
      
      &:hover:not(:disabled) {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(0, 0, 139, 0.3);
        animation: ${frostShimmer} 1.5s ease-in-out;
        
        &::before {
          left: 100%;
        }
      }
      
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `
  }
`;

interface CheckoutFormData {
  email: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const CheckoutFormComponent: React.FC = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { state: cartState, updateShippingAddress, updateTaxAndShipping } = useCart();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [selectedBnplProvider, setSelectedBnplProvider] = useState<string | null>(null);
  const [selectedShippingRate, setSelectedShippingRate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CheckoutFormData>({
    email: '',
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  });

  // Redirect if cart is empty
  useEffect(() => {
    if (cartState.items.length === 0) {
      navigate('/cart');
    }
  }, [cartState.items.length, navigate]);

  // Calculate tax and shipping when address changes
  useEffect(() => {
    if (formData.zipCode && formData.state) {
      calculateTaxAndShipping();
    }
  }, [formData.zipCode, formData.state]);

  const calculateTaxAndShipping = async () => {
    try {
      // Simple tax calculation - in production, use a tax service
      const taxRates: { [key: string]: number } = {
        'CA': 0.08,
        'NY': 0.08,
        'TX': 0.0625,
        'FL': 0.06,
        'WA': 0.065
      };

      const taxRate = taxRates[formData.state] || 0.05;
      const shippingAmount = cartState.subtotal >= 50 ? 0 : 8.99;

      updateTaxAndShipping(taxRate, shippingAmount);
      updateShippingAddress(formData);
    } catch (error) {
      console.error('Error calculating tax and shipping:', error);
    }
  };

  const handleInputChange = (field: keyof CheckoutFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Contact info
        return !!(formData.email && formData.firstName && formData.lastName);
      case 2: // Shipping
        return !!(formData.address1 && formData.city && formData.state && formData.zipCode);
      case 3: // Payment
        if (paymentMethod === 'card') {
          return !!stripe && !!elements;
        } else if (['klarna', 'affirm'].includes(paymentMethod)) {
          return !!selectedBnplProvider;
        } else {
          return !!paymentMethod;
        }
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;

    setLoading(true);

    try {
      // Create payment intent
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/payments/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(cartState.totalPrice * 100), // Stripe uses cents
          currency: 'usd',
          payment_method_types: [paymentMethod],
          metadata: {
            cartItems: JSON.stringify(cartState.items),
            customerEmail: formData.email
          }
        })
      });

      const { client_secret } = await response.json();

      if (paymentMethod === 'card') {
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) return;

        const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: `${formData.firstName} ${formData.lastName}`,
              email: formData.email,
              address: {
                line1: formData.address1,
                line2: formData.address2,
                city: formData.city,
                state: formData.state,
                postal_code: formData.zipCode,
                country: formData.country
              }
            }
          }
        });

        if (error) {
          console.error('Payment failed:', error);
          alert(`Payment failed: ${error.message}`);
        } else if (paymentIntent?.status === 'succeeded') {
          navigate('/checkout/success');
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('An error occurred during checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, label: 'Contact' },
    { number: 2, label: 'Shipping' },
    { number: 3, label: 'Payment' }
  ];

  return (
    <>
      <CheckoutHeader>
        <CheckoutTitle>Secure Checkout</CheckoutTitle>
        <ProgressIndicator>
          <ProgressBar $step={currentStep}>
            {steps.map(step => (
              <ProgressStep 
                key={step.number}
                $active={step.number === currentStep}
                $completed={step.number < currentStep}
              >
                <div className="step-number">
                  {step.number < currentStep ? '✓' : step.number}
                </div>
                <div className="step-label">{step.label}</div>
              </ProgressStep>
            ))}
          </ProgressBar>
        </ProgressIndicator>
      </CheckoutHeader>

      <CheckoutContent>
        <CheckoutForm>
          <form onSubmit={handleSubmit}>
            {/* Step 1: Contact Information */}
            <FormSection $hidden={currentStep !== 1}>
              <h3>📧 Contact Information</h3>
              <FormGrid>
                <FormGroup $fullWidth>
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    placeholder="john@example.com"
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <label htmlFor="firstName">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange('firstName')}
                    placeholder="John"
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange('lastName')}
                    placeholder="Doe"
                    required
                  />
                </FormGroup>
              </FormGrid>
            </FormSection>

            {/* Step 2: Shipping Information */}
            <FormSection $hidden={currentStep !== 2}>
              <h3>🚚 Shipping Address</h3>
              <FormGrid>
                <FormGroup $fullWidth>
                  <label htmlFor="address1">Address Line 1</label>
                  <input
                    id="address1"
                    type="text"
                    value={formData.address1}
                    onChange={handleInputChange('address1')}
                    placeholder="123 Main Street"
                    required
                  />
                </FormGroup>
                <FormGroup $fullWidth>
                  <label htmlFor="address2">Address Line 2 (Optional)</label>
                  <input
                    id="address2"
                    type="text"
                    value={formData.address2}
                    onChange={handleInputChange('address2')}
                    placeholder="Apt, suite, etc."
                  />
                </FormGroup>
                <FormGroup>
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={handleInputChange('city')}
                    placeholder="San Francisco"
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <label htmlFor="state">State</label>
                  <select
                    id="state"
                    value={formData.state}
                    onChange={handleInputChange('state')}
                    required
                  >
                    <option value="">Select State</option>
                    <option value="CA">California</option>
                    <option value="NY">New York</option>
                    <option value="TX">Texas</option>
                    <option value="FL">Florida</option>
                    <option value="WA">Washington</option>
                  </select>
                </FormGroup>
                <FormGroup>
                  <label htmlFor="zipCode">ZIP Code</label>
                  <input
                    id="zipCode"
                    type="text"
                    value={formData.zipCode}
                    onChange={handleInputChange('zipCode')}
                    placeholder="94102"
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <label htmlFor="country">Country</label>
                  <select
                    id="country"
                    value={formData.country}
                    onChange={handleInputChange('country')}
                    required
                  >
                    <option value="US">United States</option>
                  </select>
                </FormGroup>
              </FormGrid>

              {/* Shipping Calculator */}
              {formData.zipCode && formData.state && (
                <ShippingCalculator
                  cartItems={cartState.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                  }))}
                  shippingAddress={{
                    city: formData.city,
                    state: formData.state,
                    zipCode: formData.zipCode,
                    country: formData.country
                  }}
                  onShippingSelect={(rate) => {
                    setSelectedShippingRate(rate);
                    // Update shipping amount in cart context
                    updateTaxAndShipping(cartState.taxRate, rate.cost);
                  }}
                  selectedRateId={selectedShippingRate?.id}
                  orderTotal={cartState.subtotal}
                />
              )}
            </FormSection>

            {/* Step 3: Payment Information */}
            <FormSection $hidden={currentStep !== 3}>
              <h3>💳 Payment Method</h3>
              
              <PaymentMethodSelector>
                <PaymentMethod
                  type="button"
                  $active={paymentMethod === 'card'}
                  onClick={() => setPaymentMethod('card')}
                >
                  <div className="icon">💳</div>
                  <div className="label">Credit Card</div>
                </PaymentMethod>
                <PaymentMethod
                  type="button"
                  $active={paymentMethod === 'apple_pay'}
                  onClick={() => setPaymentMethod('apple_pay')}
                >
                  <div className="icon">🍎</div>
                  <div className="label">Apple Pay</div>
                </PaymentMethod>
                <PaymentMethod
                  type="button"
                  $active={paymentMethod === 'google_pay'}
                  onClick={() => setPaymentMethod('google_pay')}
                >
                  <div className="icon">🔍</div>
                  <div className="label">Google Pay</div>
                </PaymentMethod>
                <PaymentMethod
                  type="button"
                  $active={['klarna', 'affirm'].includes(paymentMethod)}
                  onClick={() => setPaymentMethod('bnpl')}
                >
                  <div className="icon">⚡</div>
                  <div className="label">Buy Now Pay Later</div>
                </PaymentMethod>
              </PaymentMethodSelector>

              {paymentMethod === 'card' && (
                <FormGroup $fullWidth>
                  <label>Card Details</label>
                  <StripeElementContainer>
                    <CardElement
                      options={{
                        style: {
                          base: {
                            fontSize: '16px',
                            color: '#00008B',
                            fontFamily: '"Poppins", sans-serif',
                            '::placeholder': {
                              color: '#87CEEB'
                            }
                          }
                        }
                      }}
                    />
                  </StripeElementContainer>
                </FormGroup>
              )}

              {paymentMethod === 'bnpl' && (
                <div>
                  <BNPLPaymentMethods
                    amount={cartState.totalPrice}
                    selectedProvider={selectedBnplProvider}
                    onProviderSelect={(provider) => {
                      setSelectedBnplProvider(provider);
                      setPaymentMethod(provider); // Set the actual BNPL provider
                    }}
                  />
                </div>
              )}

              <TrustBadges>
                <TrustBadge>
                  <span className="icon">🔒</span>
                  <span>SSL Encrypted</span>
                </TrustBadge>
                <TrustBadge>
                  <span className="icon">✅</span>
                  <span>PCI Compliant</span>
                </TrustBadge>
                <TrustBadge>
                  <span className="icon">🛡️</span>
                  <span>Stripe Secure</span>
                </TrustBadge>
              </TrustBadges>
            </FormSection>

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              {currentStep > 1 && (
                <CheckoutButton 
                  type="button" 
                  onClick={prevStep}
                  $variant="secondary"
                  style={{ flex: 1 }}
                >
                  ← Previous
                </CheckoutButton>
              )}
              
              {currentStep < 3 ? (
                <CheckoutButton
                  type="button"
                  onClick={nextStep}
                  disabled={!validateStep(currentStep)}
                  style={{ flex: 1 }}
                >
                  Continue →
                </CheckoutButton>
              ) : (
                <CheckoutButton
                  type="submit"
                  disabled={loading || !validateStep(currentStep)}
                  style={{ flex: 1 }}
                >
                  {loading ? '❄️ Processing...' : '🧊 Complete Order'}
                </CheckoutButton>
              )}
            </div>
          </form>
        </CheckoutForm>

        <OrderSummary>
          <SummaryTitle>📋 Order Summary</SummaryTitle>
          
          {cartState.items.map((item) => (
            <SummaryItem key={item.productId}>
              <div className="item-details">
                <h5>{item.name}</h5>
                <p>Qty: {item.quantity} × ${item.price}</p>
              </div>
              <div>${(item.price * item.quantity).toFixed(2)}</div>
            </SummaryItem>
          ))}
          
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E0F6FF' }}>
            <SummaryRow>
              <span>Subtotal:</span>
              <span>${cartState.subtotal.toFixed(2)}</span>
            </SummaryRow>
            
            {cartState.discountAmount > 0 && (
              <SummaryRow>
                <span>Discount:</span>
                <span style={{ color: '#32CD32' }}>-${cartState.discountAmount.toFixed(2)}</span>
              </SummaryRow>
            )}
            
            <SummaryRow>
              <span>Shipping:</span>
              <span>{cartState.shippingAmount > 0 ? `$${cartState.shippingAmount.toFixed(2)}` : 'FREE'}</span>
            </SummaryRow>
            
            {cartState.taxAmount > 0 && (
              <SummaryRow>
                <span>Tax:</span>
                <span>${cartState.taxAmount.toFixed(2)}</span>
              </SummaryRow>
            )}
            
            <SummaryRow $isTotal>
              <span>Total:</span>
              <span>${cartState.totalPrice.toFixed(2)}</span>
            </SummaryRow>
          </div>
        </OrderSummary>
      </CheckoutContent>
    </>
  );
};

const Checkout: React.FC = () => {
  const { state: cartState } = useCart();
  const navigate = useNavigate();

  // Redirect if cart is empty
  useEffect(() => {
    if (cartState.items.length === 0) {
      navigate('/cart');
    }
  }, [cartState.items.length, navigate]);

  if (cartState.items.length === 0) {
    return null;
  }

  return (
    <CheckoutContainer>
      <SEOHead
        title="Checkout - ICEPACA"
        description="Complete your ICEPACA order with secure checkout powered by Stripe"
        noindex={true}
      />
      
      <Elements stripe={stripePromise}>
        <CheckoutFormComponent />
      </Elements>
    </CheckoutContainer>
  );
};

export default Checkout;