import React from 'react';
import SEOHead from '../components/SEOHead';
import HeroBanner from '../components/HeroBanner';
import SearchBar from '../components/SearchBar';
import FeatureGrid from '../components/FeatureGrid';

const Home: React.FC = () => {
  return (
    <>
      <SEOHead />
      <HeroBanner />
      <SearchBar />
      <FeatureGrid />
    </>
  );
};

export default Home;