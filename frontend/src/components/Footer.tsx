import React from 'react';
import styled, { keyframes } from 'styled-components';

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 5px rgba(173, 216, 230, 0.3); }
  50% { box-shadow: 0 0 20px rgba(173, 216, 230, 0.6); }
`;

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
`;

const FooterContainer = styled.footer`
  background: linear-gradient(135deg, #00008B 0%, #191970 50%, #000080 100%);
  color: white;
  padding: 3rem 2rem 1rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(173, 216, 230, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(173, 216, 230, 0.05) 0%, transparent 50%);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 2rem 1rem 1rem;
  }
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
`;

const FooterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3rem;
  margin-bottom: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
    text-align: center;
  }
`;

const FooterSection = styled.div`
  h4 {
    font-family: 'Poppins', sans-serif;
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: #ADD8E6;
    text-shadow: 0 0 10px rgba(173, 216, 230, 0.3);
  }
`;

const FooterLinks = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    margin-bottom: 0.75rem;

    a {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      font-family: 'Poppins', sans-serif;
      font-weight: 400;
      transition: all 0.3s ease;
      padding: 0.25rem 0;
      display: inline-block;

      &:hover {
        color: #ADD8E6;
        transform: translateX(5px);
      }

      &:focus {
        outline: 2px solid #ADD8E6;
        outline-offset: 2px;
        border-radius: 4px;
      }
    }
  }
`;

const SocialLinks = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const SocialButton = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 45px;
  height: 45px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #ADD8E6;
  text-decoration: none;
  transition: all 0.3s ease;
  font-size: 1.25rem;
  border: 2px solid transparent;

  &:hover {
    background: rgba(173, 216, 230, 0.2);
    transform: translateY(-3px);
    animation: ${glow} 2s ease-in-out infinite;
  }

  &:focus {
    outline: 2px solid #ADD8E6;
    outline-offset: 2px;
  }
`;

const SustainabilityBadge = styled.div`
  background: linear-gradient(135deg, #32CD32 0%, #228B22 100%);
  padding: 1rem 2rem;
  border-radius: 50px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
  font-weight: 600;
  animation: ${bounce} 3s ease-in-out infinite;
  box-shadow: 0 4px 15px rgba(50, 205, 50, 0.3);

  @media (max-width: 768px) {
    justify-content: center;
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
  }
`;

const CompanyInfo = styled.div`
  p {
    font-family: 'Poppins', sans-serif;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 0.75rem;
  }
`;

const ContactInfo = styled.div`
  p {
    font-family: 'Poppins', sans-serif;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    @media (max-width: 768px) {
      justify-content: center;
    }
  }
`;

const FooterBottom = styled.div`
  border-top: 1px solid rgba(173, 216, 230, 0.2);
  padding-top: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const Copyright = styled.p`
  font-family: 'Poppins', sans-serif;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  font-size: 0.9rem;
`;

const LegalLinks = styled.div`
  display: flex;
  gap: 2rem;

  a {
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    font-family: 'Poppins', sans-serif;
    font-size: 0.9rem;
    transition: color 0.3s ease;

    &:hover {
      color: #ADD8E6;
    }

    &:focus {
      outline: 2px solid #ADD8E6;
      outline-offset: 2px;
      border-radius: 4px;
    }
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const Footer: React.FC = () => {
  return (
    <FooterContainer role="contentinfo">
      <FooterContent>
        <FooterGrid>
          <FooterSection>
            <h4>ICEPACA</h4>
            <CompanyInfo>
              <p>
                Revolutionary cooling solutions that keep your world fresh. 
                Sustainable, reliable, and designed for life.
              </p>
            </CompanyInfo>
            <SustainabilityBadge>
              <span>🌱</span>
              Eco-Friendly Cooling
            </SustainabilityBadge>
          </FooterSection>

          <FooterSection>
            <h4>Quick Links</h4>
            <FooterLinks>
              <li><a href="/shop">Shop Products</a></li>
              <li><a href="/about">About Us</a></li>
              <li><a href="/blog">Blog</a></li>
              <li><a href="/reviews">Customer Reviews</a></li>
              <li><a href="/wholesale">Wholesale</a></li>
            </FooterLinks>
          </FooterSection>

          <FooterSection>
            <h4>Support</h4>
            <FooterLinks>
              <li><a href="/contact">Contact Us</a></li>
              <li><a href="/faq">FAQ</a></li>
              <li><a href="/shipping">Shipping Info</a></li>
              <li><a href="/returns">Returns</a></li>
              <li><a href="/warranty">Warranty</a></li>
            </FooterLinks>
          </FooterSection>

          <FooterSection>
            <h4>Get In Touch</h4>
            <ContactInfo>
              <p><span>📧</span> hello@icepaca.com</p>
              <p><span>📞</span> 1-800-ICE-PACA</p>
              <p><span>📍</span> Cool Valley, CA 90210</p>
            </ContactInfo>
            
            <SocialLinks>
              <SocialButton 
                href="https://facebook.com/icepaca" 
                aria-label="Follow us on Facebook"
                target="_blank" 
                rel="noopener noreferrer"
              >
                📘
              </SocialButton>
              <SocialButton 
                href="https://instagram.com/icepaca" 
                aria-label="Follow us on Instagram"
                target="_blank" 
                rel="noopener noreferrer"
              >
                📷
              </SocialButton>
              <SocialButton 
                href="https://twitter.com/icepaca" 
                aria-label="Follow us on Twitter"
                target="_blank" 
                rel="noopener noreferrer"
              >
                🐦
              </SocialButton>
              <SocialButton 
                href="https://youtube.com/icepaca" 
                aria-label="Subscribe to our YouTube channel"
                target="_blank" 
                rel="noopener noreferrer"
              >
                📺
              </SocialButton>
            </SocialLinks>
          </FooterSection>
        </FooterGrid>

        <FooterBottom>
          <Copyright>
            © 2024 ICEPACA. All rights reserved. Keep it cool, keep it sustainable.
          </Copyright>
          <LegalLinks>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/cookies">Cookie Policy</a>
          </LegalLinks>
        </FooterBottom>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer;