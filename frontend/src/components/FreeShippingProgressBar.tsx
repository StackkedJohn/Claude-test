import React from 'react';
import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';

const shimmerAnimation = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const celebrateAnimation = keyframes`
  0%, 100% { transform: scale(1); }
  25% { transform: scale(1.05); }
  50% { transform: scale(1); }
  75% { transform: scale(1.05); }
`;

const ProgressContainer = styled(motion.div)<{ $qualified: boolean }>`
  background: ${props => props.$qualified 
    ? 'linear-gradient(135deg, rgba(50, 205, 50, 0.1) 0%, rgba(34, 139, 34, 0.1) 100%)'
    : 'linear-gradient(135deg, rgba(173, 216, 230, 0.1) 0%, rgba(0, 0, 139, 0.05) 100%)'
  };
  border: 2px solid ${props => props.$qualified ? '#32CD32' : 'var(--primary-light-blue)'};
  border-radius: 20px;
  padding: 1.5rem;
  margin: 1rem 0;
  position: relative;
  overflow: hidden;
  transition: all 0.5s ease;

  ${props => props.$qualified && `
    animation: ${celebrateAnimation} 2s ease-in-out;
  `}
`;

const ProgressHeader = styled.div<{ $qualified: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  color: ${props => props.$qualified ? '#228B22' : 'var(--primary-dark-blue)'};
  font-weight: 600;

  .icon {
    font-size: 1.5rem;
    margin-right: 0.5rem;
  }

  .amount {
    font-size: 1.1rem;
    font-weight: 700;
  }
`;

const ProgressBarTrack = styled.div`
  background: rgba(255, 255, 255, 0.5);
  border-radius: 25px;
  height: 16px;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const ProgressBarFill = styled(motion.div)<{ $qualified: boolean }>`
  height: 100%;
  background: ${props => props.$qualified 
    ? 'linear-gradient(90deg, #32CD32 0%, #228B22 100%)'
    : 'linear-gradient(90deg, #00008B 0%, #4169E1 100%)'
  };
  border-radius: 25px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
  min-width: 20px;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    animation: ${shimmerAnimation} 2s infinite;
  }

  .progress-emoji {
    font-size: 0.8rem;
    animation: ${props => props.$qualified ? celebrateAnimation : 'none'} 1s ease-in-out infinite;
  }
`;

const ProgressText = styled.div<{ $qualified: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: ${props => props.$qualified ? '#228B22' : 'var(--text-medium)'};

  .remaining {
    font-weight: 700;
    color: ${props => props.$qualified ? '#32CD32' : 'var(--primary-dark-blue)'};
  }

  .threshold {
    font-size: 0.8rem;
    opacity: 0.8;
  }
`;

const CelebrationMessage = styled(motion.div)`
  text-align: center;
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(50, 205, 50, 0.1);
  border-radius: 15px;
  border: 1px solid #32CD32;
  font-weight: 600;
  color: #228B22;

  .celebration-icon {
    font-size: 1.5rem;
    margin-right: 0.5rem;
    animation: ${celebrateAnimation} 1s ease-in-out infinite;
  }
`;

const UpsellMessage = styled(motion.div)`
  text-align: center;
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 139, 0.05);
  border-radius: 15px;
  border: 1px solid var(--primary-light-blue);
  color: var(--primary-dark-blue);

  .upsell-icon {
    font-size: 1.2rem;
    margin-right: 0.5rem;
  }

  .add-more {
    font-weight: 700;
    color: #4169E1;
  }
`;

const ParticleEffect = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  background: #32CD32;
  border-radius: 50%;
  pointer-events: none;
`;

interface FreeShippingProgressBarProps {
  currentAmount: number;
  threshold: number;
  qualified: boolean;
  className?: string;
}

const FreeShippingProgressBar: React.FC<FreeShippingProgressBarProps> = ({
  currentAmount,
  threshold,
  qualified,
  className
}) => {
  const progress = Math.min(100, (currentAmount / threshold) * 100);
  const remaining = Math.max(0, threshold - currentAmount);

  const containerVariants = {
    qualified: {
      scale: [1, 1.02, 1],
      transition: { duration: 0.6, ease: "easeOut" }
    },
    notQualified: {
      scale: 1,
      transition: { duration: 0.3 }
    }
  };

  const particleVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: [0, 1.5, 0],
      opacity: [0, 1, 0],
      x: [0, Math.random() * 100 - 50],
      y: [0, Math.random() * 100 - 50],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatDelay: Math.random() * 2
      }
    }
  };

  return (
    <ProgressContainer
      className={className}
      $qualified={qualified}
      variants={containerVariants}
      animate={qualified ? "qualified" : "notQualified"}
      initial="notQualified"
    >
      <ProgressHeader $qualified={qualified}>
        <div>
          <span className="icon">{qualified ? '🎉' : '🚚'}</span>
          {qualified ? 'FREE Shipping Unlocked!' : 'Free Shipping Progress'}
        </div>
        <div>
          <span className="amount">${currentAmount.toFixed(2)}</span>
          <span className="threshold"> / ${threshold.toFixed(2)}</span>
        </div>
      </ProgressHeader>

      <ProgressBarTrack>
        <ProgressBarFill
          $qualified={qualified}
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ 
            duration: 1,
            ease: "easeOut",
            type: "spring",
            stiffness: 100
          }}
        >
          <span className="progress-emoji">
            {qualified ? '🎯' : progress > 75 ? '🔥' : progress > 50 ? '⚡' : '❄️'}
          </span>
        </ProgressBarFill>
      </ProgressBarTrack>

      <ProgressText $qualified={qualified}>
        <span>
          {qualified ? (
            <>
              <span className="remaining">Congratulations!</span> You've earned free shipping
            </>
          ) : (
            <>
              Add <span className="remaining">${remaining.toFixed(2)}</span> more to qualify
            </>
          )}
        </span>
        <span>{Math.round(progress)}% complete</span>
      </ProgressText>

      {qualified && (
        <>
          <CelebrationMessage
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <span className="celebration-icon">🎊</span>
            Your order ships FREE! We've saved you $8.99 on shipping costs.
          </CelebrationMessage>

          {/* Particle effects for celebration */}
          {[...Array(6)].map((_, index) => (
            <ParticleEffect
              key={index}
              variants={particleVariants}
              initial="hidden"
              animate="visible"
              style={{
                left: `${20 + index * 12}%`,
                animationDelay: `${index * 0.3}s`
              }}
            />
          ))}
        </>
      )}

      {!qualified && progress > 25 && (
        <UpsellMessage
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <span className="upsell-icon">💡</span>
          Almost there! <span className="add-more">Add ${remaining.toFixed(2)} more</span> and we'll ship your ice packs for free!
        </UpsellMessage>
      )}
    </ProgressContainer>
  );
};

export default FreeShippingProgressBar;