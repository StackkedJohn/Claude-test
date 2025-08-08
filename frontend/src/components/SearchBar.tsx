import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const SearchContainer = styled.div`
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  background: white;
  border-radius: 50px;
  box-shadow: 0 4px 20px rgba(0, 0, 139, 0.15);
  transition: all 0.3s ease;
  border: 2px solid transparent;

  &:focus-within {
    border-color: #00008B;
    box-shadow: 0 6px 30px rgba(0, 0, 139, 0.25);
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 1rem 3.5rem 1rem 2rem;
  border: none;
  border-radius: 50px;
  font-family: 'Poppins', sans-serif;
  font-size: 1rem;
  background: transparent;
  color: #00008B;

  &::placeholder {
    color: #87CEEB;
    font-weight: 400;
  }

  &:focus {
    outline: none;
  }
`;

const SearchIcon = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: linear-gradient(135deg, #00008B 0%, #4169E1 100%);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 4px 15px rgba(0, 0, 139, 0.3);
  }

  &:focus {
    outline: 2px solid #ADD8E6;
    outline-offset: 2px;
  }
`;

const SuggestionsContainer = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border-radius: 15px;
  box-shadow: 0 8px 30px rgba(0, 0, 139, 0.2);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 0.5rem;
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.$isOpen ? 'translateY(0)' : 'translateY(-10px)'};
  transition: all 0.3s ease;
  animation: ${props => props.$isOpen ? fadeIn : 'none'} 0.3s ease;
`;

const SuggestionItem = styled.div<{ $isHighlighted: boolean }>`
  padding: 1rem 1.5rem;
  cursor: pointer;
  font-family: 'Poppins', sans-serif;
  color: #00008B;
  background: ${props => props.$isHighlighted ? '#F0F8FF' : 'transparent'};
  transition: all 0.2s ease;
  border-bottom: 1px solid #E6F3FF;

  &:last-child {
    border-bottom: none;
    border-radius: 0 0 15px 15px;
  }

  &:first-child {
    border-radius: 15px 15px 0 0;
  }

  &:hover {
    background: #F0F8FF;
  }

  &:focus {
    background: #F0F8FF;
    outline: 2px solid #00008B;
    outline-offset: -2px;
  }
`;

const ProductName = styled.div`
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const ProductDescription = styled.div`
  font-size: 0.85rem;
  color: #4682B4;
`;

const NoResults = styled.div`
  padding: 1.5rem;
  text-align: center;
  color: #87CEEB;
  font-family: 'Poppins', sans-serif;
  font-style: italic;
`;

const VoiceButton = styled.button`
  position: absolute;
  right: 55px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #00008B;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(173, 216, 230, 0.2);
    transform: translateY(-50%) scale(1.1);
  }

  &:focus {
    outline: 2px solid #00008B;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface Product {
  id: number;
  name: string;
  description: string;
}

const SearchBar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isListening, setIsListening] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const mockProducts: Product[] = [
    { id: 1, name: 'ICEPACA Small Pack', description: 'Compact reusable ice pack for lunch boxes' },
    { id: 2, name: 'ICEPACA Medium Pack', description: 'Medium-sized ice pack for coolers' },
    { id: 3, name: 'ICEPACA Large Pack', description: 'Large ice pack for extended cooling' },
    { id: 4, name: 'ICEPACA Mini Set', description: 'Set of 4 mini ice packs' },
    { id: 5, name: 'ICEPACA Pro Bundle', description: 'Complete cooling solution bundle' }
  ];

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = mockProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSuggestions(filtered);
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
    setHighlightedIndex(-1);
  }, [searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSuggestionClick(suggestions[highlightedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        searchInputRef.current?.blur();
        break;
    }
  };

  const handleSuggestionClick = (product: Product) => {
    setSearchTerm(product.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
    window.location.href = `/product/${product.id}`;
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`;
    }
  };

  const startVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchTerm(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <SearchContainer role="search">
      <SearchWrapper>
        <SearchInput
          ref={searchInputRef}
          type="text"
          placeholder="Search for products like 'icepaca small pack'..."
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          aria-label="Search products"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="search-suggestions"
        />
        
        <VoiceButton
          onClick={startVoiceSearch}
          disabled={isListening}
          aria-label={isListening ? 'Listening for voice input' : 'Start voice search'}
          title="Voice search"
        >
          {isListening ? '🎤' : '🎤'}
        </VoiceButton>
        
        <SearchIcon
          onClick={handleSearch}
          aria-label="Search"
          title="Search"
        >
          🔍
        </SearchIcon>
      </SearchWrapper>

      <SuggestionsContainer 
        ref={suggestionsRef}
        $isOpen={isOpen}
        id="search-suggestions"
        role="listbox"
      >
        {suggestions.length > 0 ? (
          suggestions.map((product, index) => (
            <SuggestionItem
              key={product.id}
              $isHighlighted={index === highlightedIndex}
              onClick={() => handleSuggestionClick(product)}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={index === highlightedIndex}
              tabIndex={-1}
            >
              <ProductName>{product.name}</ProductName>
              <ProductDescription>{product.description}</ProductDescription>
            </SuggestionItem>
          ))
        ) : searchTerm.trim() && (
          <NoResults>
            No products found for "{searchTerm}"
          </NoResults>
        )}
      </SuggestionsContainer>
    </SearchContainer>
  );
};

export default SearchBar;