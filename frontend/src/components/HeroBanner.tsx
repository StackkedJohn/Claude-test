import React from 'react';
import { Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const sparkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
`;

const iceDrip = keyframes`
  0% { transform: translateY(-5px) scaleY(0.8); }
  50% { transform: translateY(0px) scaleY(1.2); }
  100% { transform: translateY(-5px) scaleY(0.8); }
`;

const HeroContainer = styled.section`
  background: linear-gradient(135deg, #87CEEB 0%, #ADD8E6 50%, #E0F6FF 100%);
  min-height: 80vh;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  padding: 2rem;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.2) 0%, transparent 50%),
      radial-gradient(circle at 60% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  }

  @media (max-width: 768px) {
    min-height: 60vh;
    padding: 1rem;
  }
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  position: relative;
  z-index: 2;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
    text-align: center;
  }
`;

const TextContent = styled.div`
  color: #00008B;

  @media (max-width: 768px) {
    order: 2;
  }
`;

const MainTitle = styled.h1`
  font-family: 'Poppins', sans-serif;
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.3);
  position: relative;
  animation: ${iceDrip} 3s ease-in-out infinite;

  &::after {
    content: '❄️';
    position: absolute;
    top: -10px;
    right: -20px;
    font-size: 2rem;
    animation: ${sparkle} 2s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }

  @media (max-width: 480px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-family: 'Poppins', sans-serif;
  font-size: 1.25rem;
  margin-bottom: 2rem;
  font-weight: 400;
  line-height: 1.6;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.5);

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const CTAButton = styled.button`
  background: linear-gradient(135deg, #00008B 0%, #4169E1 100%);
  color: white;
  border: none;
  padding: 1rem 2.5rem;
  font-family: 'Poppins', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 139, 0.3);

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 139, 0.4);
    background: linear-gradient(135deg, #000080 0%, #4169E1 100%);
  }

  &:focus {
    outline: 2px solid #ADD8E6;
    outline-offset: 2px;
  }

  &:active {
    transform: translateY(-1px);
  }
`;

const MascotContainer = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: ${float} 4s ease-in-out infinite;

  @media (max-width: 768px) {
    order: 1;
  }
`;

const AlpacaIcon = styled.div`
  font-size: 8rem;
  position: relative;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 139, 0.2));

  &::before {
    content: '🧊';
    position: absolute;
    top: 20%;
    right: -10%;
    font-size: 3rem;
    animation: ${sparkle} 3s ease-in-out infinite;
  }

  &::after {
    content: '❄️';
    position: absolute;
    bottom: -10%;
    left: -20%;
    font-size: 2rem;
    animation: ${sparkle} 2.5s ease-in-out infinite;
    animation-delay: 1s;
  }

  @media (max-width: 768px) {
    font-size: 6rem;
  }
`;

const IcyBackground = styled.div`
  position: absolute;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  z-index: -1;

  @media (max-width: 768px) {
    width: 200px;
    height: 200px;
  }
`;

const HeroBanner: React.FC = () => {
  return (
    <HeroContainer role="banner">
      <ContentWrapper>
        <TextContent>
          <MainTitle>
            Keep It Cool with ICEPACA
          </MainTitle>
          <Subtitle>
            Revolutionary reusable ice packs that keep your food fresh and drinks cold. 
            Non-toxic, puncture-resistant, and environmentally friendly cooling solutions.
          </Subtitle>
          <CTAButton 
            as={Link}
            to="/shop"
            aria-label="Start shopping for ICEPACA products"
          >
            Shop Now
          </CTAButton>
        </TextContent>
        
        <MascotContainer>
          <IcyBackground />
          <AlpacaIcon role="img" aria-label="ICEPACA mascot - a cartoon alpaca holding an ice cube">
            🦙
          </AlpacaIcon>
        </MascotContainer>
      </ContentWrapper>
    </HeroContainer>
  );
};

export default HeroBanner;