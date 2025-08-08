import React from 'react';
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const FeaturesSection = styled.section`
  padding: 4rem 2rem;
  background: linear-gradient(180deg, #E0F6FF 0%, #F8FCFF 100%);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 10% 20%, rgba(173, 216, 230, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 90% 80%, rgba(173, 216, 230, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
`;

const SectionTitle = styled.h2`
  font-family: 'Poppins', sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  text-align: center;
  color: #00008B;
  margin-bottom: 3rem;
  text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.3);
  position: relative;

  &::after {
    content: '❄️';
    position: absolute;
    top: -5px;
    right: -30px;
    font-size: 1.5rem;
    animation: ${pulse} 2s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const BentoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 200px);
  gap: 1.5rem;
  grid-template-areas:
    "reusable reusable non-toxic"
    "reusable reusable puncture"
    "eco-friendly cooling cooling";

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(4, 180px);
    grid-template-areas:
      "reusable non-toxic"
      "reusable puncture"
      "eco-friendly cooling"
      "eco-friendly cooling";
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(5, 160px);
    grid-template-areas:
      "reusable"
      "non-toxic"
      "puncture"
      "eco-friendly"
      "cooling";
  }
`;

const FeatureCard = styled.div<{ $area: string; $bgColor: string }>`
  grid-area: ${props => props.$area};
  background: ${props => props.$bgColor};
  border-radius: 20px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 139, 0.1);

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    animation: ${shimmer} 3s ease-in-out infinite;
    animation-delay: ${props => Math.random() * 2}s;
  }

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0, 0, 139, 0.2);
  }

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const FeatureIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  animation: ${pulse} 3s ease-in-out infinite;
  animation-delay: 0.5s;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const FeatureTitle = styled.h3`
  font-family: 'Poppins', sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #00008B;
  margin-bottom: 0.5rem;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.5);

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const FeatureDescription = styled.p`
  font-family: 'Poppins', sans-serif;
  font-size: 0.95rem;
  color: #000080;
  line-height: 1.5;
  font-weight: 400;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const FeatureGrid: React.FC = () => {
  const features = [
    {
      area: 'reusable',
      icon: '♻️',
      title: 'Reusable',
      description: 'Use thousands of times without wear. Sustainable cooling that saves money and reduces waste.',
      bgColor: 'linear-gradient(135deg, #B8E6B8 0%, #90EE90 100%)'
    },
    {
      area: 'non-toxic',
      icon: '✅',
      title: 'Non-Toxic',
      description: 'Food-safe materials that are completely safe for your family and the environment.',
      bgColor: 'linear-gradient(135deg, #FFE4B5 0%, #FFEAA7 100%)'
    },
    {
      area: 'puncture',
      icon: '🛡️',
      title: 'Puncture-Resistant',
      description: 'Durable construction that withstands daily use without leaking or breaking.',
      bgColor: 'linear-gradient(135deg, #DDA0DD 0%, #E6E6FA 100%)'
    },
    {
      area: 'eco-friendly',
      icon: '🌱',
      title: 'Eco-Friendly',
      description: 'Made from sustainable materials with minimal environmental impact.',
      bgColor: 'linear-gradient(135deg, #98FB98 0%, #90EE90 100%)'
    },
    {
      area: 'cooling',
      icon: '❄️',
      title: 'Superior Cooling',
      description: 'Advanced gel formula provides long-lasting cooling performance that outperforms traditional ice.',
      bgColor: 'linear-gradient(135deg, #87CEEB 0%, #ADD8E6 100%)'
    }
  ];

  return (
    <FeaturesSection>
      <Container>
        <SectionTitle>Why Choose ICEPACA?</SectionTitle>
        <BentoGrid>
          {features.map((feature, index) => (
            <FeatureCard 
              key={index} 
              $area={feature.area}
              $bgColor={feature.bgColor}
              role="article"
              tabIndex={0}
              aria-label={`Feature: ${feature.title}`}
            >
              <FeatureIcon role="img" aria-label={feature.title}>
                {feature.icon}
              </FeatureIcon>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
            </FeatureCard>
          ))}
        </BentoGrid>
      </Container>
    </FeaturesSection>
  );
};

export default FeatureGrid;