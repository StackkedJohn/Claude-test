import React from 'react';
import { Helmet } from 'react-helmet-async';

interface MetaData {
  title: string;
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterCard: 'summary' | 'summary_large_image';
  canonicalUrl?: string;
}

interface MetaTagsProps {
  meta: MetaData;
  schemaMarkup?: any[];
}

const MetaTags: React.FC<MetaTagsProps> = ({ meta, schemaMarkup = [] }) => {
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta name="keywords" content={meta.keywords.join(', ')} />
      
      {/* Canonical URL */}
      {meta.canonicalUrl && <link rel="canonical" href={meta.canonicalUrl} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={meta.ogUrl} />
      <meta property="og:title" content={meta.ogTitle} />
      <meta property="og:description" content={meta.ogDescription} />
      <meta property="og:image" content={meta.ogImage} />
      <meta property="og:site_name" content="ICEPACA" />
      
      {/* Twitter */}
      <meta property="twitter:card" content={meta.twitterCard} />
      <meta property="twitter:url" content={meta.ogUrl} />
      <meta property="twitter:title" content={meta.twitterTitle} />
      <meta property="twitter:description" content={meta.twitterDescription} />
      <meta property="twitter:image" content={meta.ogImage} />
      <meta property="twitter:site" content="@icepaca" />
      
      {/* Additional SEO Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="author" content="ICEPACA LLC" />
      
      {/* Schema Markup */}
      {schemaMarkup.map((schema, index) => (
        <script
          key={`schema-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema.data)
          }}
        />
      ))}
    </Helmet>
  );
};

export default MetaTags;