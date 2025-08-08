import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useCart } from '../contexts/CartContext';

const NavContainer = styled.nav`
  background: linear-gradient(135deg, #ADD8E6 0%, #87CEEB 100%);
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0, 0, 139, 0.1);

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const NavWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled.div`
  font-family: 'Poppins', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #00008B;
  text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.3);
`;

const NavLinks = styled.ul<{ $isOpen: boolean }>`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 2rem;

  @media (max-width: 768px) {
    position: fixed;
    top: 80px;
    left: 0;
    width: 100%;
    background: linear-gradient(135deg, #ADD8E6 0%, #87CEEB 100%);
    flex-direction: column;
    padding: 2rem;
    transform: ${props => props.$isOpen ? 'translateX(0)' : 'translateX(-100%)'};
    transition: transform 0.3s ease;
    gap: 1rem;
  }
`;

const NavLink = styled.li<{ $isActive?: boolean }>`
  a {
    text-decoration: none;
    color: #00008B;
    font-family: 'Poppins', sans-serif;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 25px;
    transition: all 0.3s ease;
    background: ${props => props.$isActive ? 'rgba(255, 255, 255, 0.4)' : 'transparent'};
    font-weight: ${props => props.$isActive ? '600' : '500'};

    &:hover {
      background: rgba(255, 255, 255, 0.3);
      color: #000080;
    }

    &:focus {
      outline: 2px solid #00008B;
      outline-offset: 2px;
    }
  }
`;

const CartContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const CartIcon = styled.button`
  background: #00008B;
  border: none;
  border-radius: 50%;
  width: 45px;
  height: 45px;
  color: white;
  cursor: pointer;
  position: relative;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }

  &:focus {
    outline: 2px solid #ADD8E6;
    outline-offset: 2px;
  }
`;

const CartBadge = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  background: #FF4757;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
`;

const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #00008B;
  cursor: pointer;

  @media (max-width: 768px) {
    display: block;
  }

  &:focus {
    outline: 2px solid #00008B;
    outline-offset: 2px;
  }
`;

const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { state: cartState } = useCart();
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      toggleMenu();
    }
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <NavContainer role="navigation" aria-label="Main navigation">
      <NavWrapper>
        <Logo>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            ICEPACA
          </Link>
        </Logo>
        
        <NavLinks $isOpen={isMenuOpen}>
          <NavLink $isActive={isActivePath('/')}>
            <Link to="/" aria-label="Go to homepage">Home</Link>
          </NavLink>
          <NavLink $isActive={isActivePath('/shop')}>
            <Link to="/shop" aria-label="Browse our shop">Shop</Link>
          </NavLink>
          <NavLink $isActive={isActivePath('/blog')}>
            <Link to="/blog" aria-label="Read our blog">Blog</Link>
          </NavLink>
          <NavLink $isActive={isActivePath('/about')}>
            <Link to="/about" aria-label="Learn about us">About</Link>
          </NavLink>
          <NavLink $isActive={isActivePath('/contact')}>
            <Link to="/contact" aria-label="Contact us">Contact</Link>
          </NavLink>
          <NavLink $isActive={isActivePath('/track')}>
            <Link to="/track" aria-label="Track your order">Track</Link>
          </NavLink>
        </NavLinks>

        <CartContainer>
          <CartIcon 
            as={Link}
            to="/cart"
            aria-label={`Shopping cart with ${cartState.totalItems} items`}
          >
            🛒
            {cartState.totalItems > 0 && (
              <CartBadge aria-label={`${cartState.totalItems} items in cart`}>
                {cartState.totalItems}
              </CartBadge>
            )}
          </CartIcon>
          
          <MobileMenuButton 
            onClick={toggleMenu}
            onKeyDown={handleKeyDown}
            aria-label="Toggle mobile menu"
            aria-expanded={isMenuOpen}
          >
            ☰
          </MobileMenuButton>
        </CartContainer>
      </NavWrapper>
    </NavContainer>
  );
};

export default Navigation;