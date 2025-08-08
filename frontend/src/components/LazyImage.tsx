import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

const shimmerAnimation = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const ImageContainer = styled.div<{ $aspectRatio?: string }>`
  position: relative;
  width: 100%;
  aspect-ratio: ${props => props.$aspectRatio || '16/9'};
  overflow: hidden;
  background: var(--light-blue-bg);
`;

const PlaceholderDiv = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(173, 216, 230, 0.1) 25%,
    rgba(173, 216, 230, 0.2) 50%,
    rgba(173, 216, 230, 0.1) 75%
  );
  background-size: 200px 100%;
  animation: ${shimmerAnimation} 1.5s infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-medium);
  font-family: 'Poppins', sans-serif;
`;

const StyledImage = styled.img<{ $loaded: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s ease;
  opacity: ${props => props.$loaded ? 1 : 0};
  position: absolute;
  top: 0;
  left: 0;
`;

const ErrorDiv = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 0, 0, 0.1);
  color: #d32f2f;
  font-family: 'Poppins', sans-serif;
  text-align: center;
  padding: 1rem;
`;

interface LazyImageProps {
  src: string;
  alt: string;
  aspectRatio?: string;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  aspectRatio,
  placeholder = 'Loading...',
  className,
  onLoad,
  onError
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    onError?.();
  };

  // Preload image when in view
  useEffect(() => {
    if (inView && !loaded && !error) {
      const img = new Image();
      img.src = src;
      img.onload = handleLoad;
      img.onerror = handleError;
    }
  }, [inView, src, loaded, error]);

  return (
    <ImageContainer 
      ref={containerRef}
      $aspectRatio={aspectRatio}
      className={className}
    >
      {error ? (
        <ErrorDiv>
          <div>
            <div>⚠️</div>
            <div>Failed to load image</div>
          </div>
        </ErrorDiv>
      ) : (
        <>
          {!loaded && <PlaceholderDiv>{placeholder}</PlaceholderDiv>}
          {inView && (
            <StyledImage
              ref={imgRef}
              src={src}
              alt={alt}
              $loaded={loaded}
              onLoad={handleLoad}
              onError={handleError}
              loading="lazy"
            />
          )}
        </>
      )}
    </ImageContainer>
  );
};

export default LazyImage;