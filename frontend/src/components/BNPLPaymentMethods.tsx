import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const BNPLContainer = styled.div`
  margin-top: 1rem;
  animation: ${fadeIn} 0.5s ease-out;
`;

const BNPLOption = styled.div<{ $selected: boolean }>`
  border: 2px solid ${props => props.$selected ? 'var(--primary-dark-blue)' : 'var(--primary-light-blue)'};
  border-radius: 15px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  background: ${props => props.$selected ? 'rgba(0, 0, 139, 0.05)' : 'white'};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--primary-dark-blue);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 139, 0.1);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const BNPLHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const BNPLProvider = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;

  .logo {
    width: 60px;
    height: 30px;
    background: var(--primary-light-blue);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.8rem;
    color: var(--primary-dark-blue);
  }

  .name {
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--primary-dark-blue);
  }
`;

const BNPLBadge = styled.span`
  background: linear-gradient(135deg, #32CD32 0%, #228B22 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const BNPLDescription = styled.p`
  color: var(--text-medium);
  font-size: 0.9rem;
  margin: 0.75rem 0;
  line-height: 1.4;
`;

const InstallmentPreview = styled.div`
  background: rgba(173, 216, 230, 0.1);
  border-radius: 10px;
  padding: 1rem;
  margin-top: 1rem;
`;

const InstallmentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
`;

const InstallmentItem = styled.div`
  text-align: center;
  padding: 0.5rem;
  background: white;
  border-radius: 8px;
  border: 1px solid var(--primary-light-blue);

  .number {
    font-size: 0.8rem;
    color: var(--text-medium);
    margin-bottom: 0.25rem;
  }

  .amount {
    font-weight: 700;
    color: var(--primary-dark-blue);
    font-size: 1rem;
  }

  .date {
    font-size: 0.7rem;
    color: var(--text-medium);
    margin-top: 0.25rem;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--primary-light-blue);
  border-radius: 50%;
  border-top-color: var(--primary-dark-blue);
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

interface BNPLOption {
  provider: 'klarna' | 'affirm';
  name: string;
  description: string;
  available: boolean;
  estimatedMonthlyPayment?: number;
}

interface Installment {
  installmentNumber: number;
  amount: number;
  dueDate: string;
  description: string;
}

interface BNPLPaymentMethodsProps {
  amount: number;
  selectedProvider: string | null;
  onProviderSelect: (provider: string) => void;
  onInstallmentsLoad?: (installments: Installment[]) => void;
}

const BNPLPaymentMethods: React.FC<BNPLPaymentMethodsProps> = ({
  amount,
  selectedProvider,
  onProviderSelect,
  onInstallmentsLoad
}) => {
  const [bnplOptions, setBnplOptions] = useState<BNPLOption[]>([]);
  const [installmentPreviews, setInstallmentPreviews] = useState<{ [key: string]: Installment[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBNPLOptions();
  }, [amount]);

  const fetchBNPLOptions = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/payments/bnpl/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'usd',
          country: 'US'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setBnplOptions(data.options.filter((option: BNPLOption) => option.available));
        
        // Load installment previews for each option
        for (const option of data.options) {
          if (option.available) {
            await loadInstallmentPreview(option.provider);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching BNPL options:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInstallmentPreview = async (provider: 'klarna' | 'affirm') => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/payments/bnpl/installments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          provider
        })
      });

      if (response.ok) {
        const data = await response.json();
        setInstallmentPreviews(prev => ({
          ...prev,
          [provider]: data.installments
        }));

        // If this provider is selected, notify parent
        if (selectedProvider === provider && onInstallmentsLoad) {
          onInstallmentsLoad(data.installments);
        }
      }
    } catch (error) {
      console.error(`Error loading ${provider} installments:`, error);
    }
  };

  const handleProviderSelect = (provider: string) => {
    onProviderSelect(provider);
    
    // Load installments for parent component
    if (onInstallmentsLoad && installmentPreviews[provider]) {
      onInstallmentsLoad(installmentPreviews[provider]);
    }
  };

  if (loading) {
    return (
      <BNPLContainer>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem' }}>
          <LoadingSpinner />
          <span>Loading payment options...</span>
        </div>
      </BNPLContainer>
    );
  }

  if (bnplOptions.length === 0) {
    return (
      <BNPLContainer>
        <div style={{ 
          padding: '1rem', 
          textAlign: 'center', 
          color: 'var(--text-medium)',
          fontStyle: 'italic'
        }}>
          No Buy Now Pay Later options available for this order amount.
        </div>
      </BNPLContainer>
    );
  }

  return (
    <BNPLContainer>
      {bnplOptions.map((option) => (
        <BNPLOption
          key={option.provider}
          $selected={selectedProvider === option.provider}
          onClick={() => handleProviderSelect(option.provider)}
        >
          <BNPLHeader>
            <BNPLProvider>
              <div className="logo">
                {option.provider === 'klarna' ? 'K' : 'A'}
              </div>
              <div>
                <div className="name">{option.name}</div>
              </div>
            </BNPLProvider>
            <BNPLBadge>
              {option.provider === 'klarna' ? '0% APR' : 'As low as 0% APR'}
            </BNPLBadge>
          </BNPLHeader>

          <BNPLDescription>
            {option.description}
            {option.estimatedMonthlyPayment && (
              <span style={{ fontWeight: 600, color: 'var(--primary-dark-blue)' }}>
                {option.provider === 'klarna' 
                  ? ` • $${option.estimatedMonthlyPayment.toFixed(2)} every 2 weeks`
                  : ` • Starting at $${option.estimatedMonthlyPayment.toFixed(2)}/month`
                }
              </span>
            )}
          </BNPLDescription>

          {installmentPreviews[option.provider] && (
            <InstallmentPreview>
              <div style={{ 
                fontSize: '0.9rem', 
                fontWeight: 600, 
                color: 'var(--primary-dark-blue)', 
                marginBottom: '0.5rem' 
              }}>
                Payment Schedule:
              </div>
              <InstallmentGrid>
                {installmentPreviews[option.provider].slice(0, 4).map((installment) => (
                  <InstallmentItem key={installment.installmentNumber}>
                    <div className="number">#{installment.installmentNumber}</div>
                    <div className="amount">${installment.amount.toFixed(2)}</div>
                    <div className="date">{installment.description}</div>
                  </InstallmentItem>
                ))}
              </InstallmentGrid>
              {installmentPreviews[option.provider].length > 4 && (
                <div style={{ 
                  textAlign: 'center', 
                  marginTop: '0.5rem', 
                  fontSize: '0.8rem', 
                  color: 'var(--text-medium)' 
                }}>
                  +{installmentPreviews[option.provider].length - 4} more payments
                </div>
              )}
            </InstallmentPreview>
          )}
        </BNPLOption>
      ))}
    </BNPLContainer>
  );
};

export default BNPLPaymentMethods;