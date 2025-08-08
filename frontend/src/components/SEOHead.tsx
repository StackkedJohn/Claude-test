import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'ICEPACA - Revolutionary Reusable Ice Packs | Eco-Friendly Cooling Solutions',
  description = 'Discover ICEPACA\'s revolutionary reusable ice packs. Non-toxic, puncture-resistant, and eco-friendly cooling solutions that keep your food fresh and drinks cold. Perfect for lunch boxes, coolers, and outdoor activities.',
  keywords = 'reusable ice packs, ice packs, cooling solution, eco-friendly, non-toxic, puncture-resistant, lunch box, cooler, sustainable cooling, ICEPACA, alpaca ice packs',
  image = '/logo512.png',
  url = typeof window !== 'undefined' ? window.location.href : '',
  type = 'website',
  noindex = false
}) => {
  const siteUrl = process.env.REACT_APP_SITE_URL || 'https://icepaca.com';
  const fullImageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`;
  const canonicalUrl = url || siteUrl;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ICEPACA',
    description: 'Revolutionary reusable ice packs for eco-friendly cooling solutions',
    url: siteUrl,
    logo: fullImageUrl,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '1-800-ICE-PACA',
      contactType: 'customer service',
      email: 'hello@icepaca.com'
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Cool Valley',
      addressRegion: 'CA',
      postalCode: '90210',
      addressCountry: 'US'
    },
    sameAs: [
      'https://facebook.com/icepaca',
      'https://instagram.com/icepaca',
      'https://twitter.com/icepaca',
      'https://youtube.com/icepaca'
    ],
    founder: {
      '@type': 'Person',
      name: 'ICEPACA Team'
    },
    foundingDate: '2024',
    numberOfEmployees: {
      '@type': 'QuantitativeValue',
      minValue: 10,
      maxValue: 50
    }
  };

  const productStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'ICEPACA Reusable Ice Packs',
    description: 'Eco-friendly reusable ice packs that are non-toxic and puncture-resistant',
    brand: {
      '@type': 'Brand',
      name: 'ICEPACA'
    },
    manufacturer: {
      '@type': 'Organization',
      name: 'ICEPACA'
    },
    category: 'Cooling Solutions',
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceCurrency: 'USD'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '1250'
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Material',
        value: 'Non-toxic gel'
      },
      {
        '@type': 'PropertyValue',
        name: 'Durability',
        value: 'Puncture-resistant'
      },
      {
        '@type': 'PropertyValue',
        name: 'Environmental Impact',
        value: 'Eco-friendly and reusable'
      }
    ]
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="ICEPACA" />
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="ICEPACA" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonicalUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={fullImageUrl} />
      <meta name="twitter:creator" content="@icepaca" />
      <meta name="twitter:site" content="@icepaca" />

      {/* Viewport and Mobile */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      <meta name="format-detection" content="telephone=yes" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="ICEPACA" />

      {/* Theme Colors */}
      <meta name="theme-color" content="#00008B" />
      <meta name="msapplication-navbutton-color" content="#00008B" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

      {/* Additional SEO */}
      <meta name="google-site-verification" content="your-google-site-verification-code" />
      <meta name="msvalidate.01" content="your-bing-verification-code" />
      
      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* DNS Prefetch */}
      <link rel="dns-prefetch" href="https://www.google-analytics.com" />

      {/* Language and Geography */}
      <meta name="language" content="English" />
      <meta name="geo.region" content="US" />
      <meta name="geo.placename" content="United States" />
      <meta name="geo.position" content="40.7589;-73.9851" />
      <meta name="ICBM" content="40.7589, -73.9851" />

      {/* Business Information */}
      <meta name="contact" content="hello@icepaca.com" />
      <meta name="copyright" content="ICEPACA 2024" />
      <meta name="rating" content="general" />
      <meta name="distribution" content="global" />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(productStructuredData)}
      </script>
    </Helmet>
  );
};

export default SEOHead;