import React, { ReactNode } from 'react';
import { useSEO, useBreadcrumbs } from '../../hooks/useSEO';
import MetaTags from './MetaTags';
import Breadcrumbs from './Breadcrumbs';

interface SEOEnhancedPageProps {
  type: 'product' | 'blog' | 'page';
  id?: string;
  includeFAQ?: boolean;
  fallbackMeta?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  breadcrumbs?: Array<{ name: string; url: string }>;
  children: ReactNode;
  className?: string;
}

const SEOEnhancedPage: React.FC<SEOEnhancedPageProps> = ({
  type,
  id,
  includeFAQ = false,
  fallbackMeta = {},
  breadcrumbs = [],
  children,
  className = ''
}) => {
  const { seoData, loading, error } = useSEO({
    type,
    id,
    includeFAQ,
    fallbackMeta
  });

  const { breadcrumbSchema } = useBreadcrumbs(breadcrumbs);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !seoData) {
    console.warn('SEO data failed to load:', error);
  }

  // Prepare schema markup array
  const schemaMarkup = [];
  if (seoData?.schema.main) schemaMarkup.push(seoData.schema.main);
  if (seoData?.schema.organization) schemaMarkup.push(seoData.schema.organization);
  if (seoData?.schema.website) schemaMarkup.push(seoData.schema.website);
  if (seoData?.schema.faq) schemaMarkup.push(seoData.schema.faq);
  if (breadcrumbSchema) schemaMarkup.push(breadcrumbSchema);

  return (
    <>
      {/* SEO Meta Tags and Schema */}
      {seoData?.meta && (
        <MetaTags
          meta={seoData.meta}
          schemaMarkup={schemaMarkup}
        />
      )}

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <Breadcrumbs breadcrumbs={breadcrumbs} />
      )}

      {/* Page Content */}
      <div className={className}>
        {children}
      </div>
    </>
  );
};

export default SEOEnhancedPage;