import { useState, useEffect } from 'react';
import axios from 'axios';

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

interface SchemaMarkup {
  type: string;
  data: any;
}

interface SEOPackage {
  meta: MetaData;
  schema: {
    main: SchemaMarkup;
    organization: SchemaMarkup;
    website: SchemaMarkup;
    faq?: SchemaMarkup;
  };
}

interface UseSEOOptions {
  type: 'product' | 'blog' | 'page';
  id?: string;
  includeFAQ?: boolean;
  fallbackMeta?: Partial<MetaData>;
}

export const useSEO = ({ type, id, includeFAQ = false, fallbackMeta = {} }: UseSEOOptions) => {
  const [seoData, setSeoData] = useState<SEOPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSEOData = async () => {
      if (!id && (type === 'product' || type === 'blog')) {
        // For products and blogs, we need an ID
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let response;

        if (type === 'product' && id) {
          response = await axios.get(
            `/api/seo/package/product/${id}${includeFAQ ? '?includeFAQ=true' : ''}`
          );
        } else if (type === 'blog' && id) {
          response = await axios.get(`/api/seo/package/blog/${id}`);
        } else {
          // For general pages, get basic schema markup
          const [orgResponse, websiteResponse] = await Promise.all([
            axios.get('/api/seo/schema/organization'),
            axios.get('/api/seo/schema/website')
          ]);

          response = {
            data: {
              meta: getDefaultMeta(),
              schema: {
                main: null,
                organization: orgResponse.data,
                website: websiteResponse.data
              }
            }
          };
        }

        setSeoData(response.data);
      } catch (err) {
        console.error('Error fetching SEO data:', err);
        setError('Failed to load SEO data');
        
        // Set fallback data
        setSeoData({
          meta: { ...getDefaultMeta(), ...fallbackMeta },
          schema: {
            main: { type: 'WebPage', data: {} },
            organization: { type: 'Organization', data: {} },
            website: { type: 'WebSite', data: {} }
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSEOData();
  }, [type, id, includeFAQ]);

  const getDefaultMeta = (): MetaData => ({
    title: 'ICEPACA - Premium Reusable Ice Packs',
    description: 'Eco-friendly reusable ice packs for coolers, lunch boxes, and outdoor adventures. Long-lasting, non-toxic, and leak-proof cooling solutions.',
    keywords: ['ICEPACA', 'ice packs', 'reusable ice packs', 'cooler ice packs', 'eco-friendly cooling'],
    ogTitle: 'ICEPACA - Premium Reusable Ice Packs',
    ogDescription: 'Eco-friendly reusable ice packs for coolers, lunch boxes, and outdoor adventures.',
    ogImage: '/images/og-default.jpg',
    ogUrl: window.location.href,
    twitterTitle: 'ICEPACA - Premium Reusable Ice Packs',
    twitterDescription: 'Eco-friendly cooling solutions for all your adventures.',
    twitterCard: 'summary_large_image',
    canonicalUrl: window.location.href
  });

  const updateMeta = (newMeta: Partial<MetaData>) => {
    if (seoData) {
      setSeoData({
        ...seoData,
        meta: { ...seoData.meta, ...newMeta }
      });
    }
  };

  const addSchema = (schema: SchemaMarkup) => {
    if (seoData) {
      setSeoData({
        ...seoData,
        schema: {
          ...seoData.schema,
          [schema.type.toLowerCase()]: schema
        }
      });
    }
  };

  return {
    seoData,
    loading,
    error,
    updateMeta,
    addSchema
  };
};

// Hook for breadcrumb generation
export const useBreadcrumbs = (breadcrumbData: Array<{ name: string; url: string }>) => {
  const [breadcrumbSchema, setBreadcrumbSchema] = useState<SchemaMarkup | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const generateBreadcrumbSchema = async () => {
      if (!breadcrumbData.length) return;

      setLoading(true);

      try {
        const response = await axios.post('/api/seo/schema/breadcrumb', {
          breadcrumbs: breadcrumbData
        });

        setBreadcrumbSchema(response.data);
      } catch (error) {
        console.error('Error generating breadcrumb schema:', error);
      } finally {
        setLoading(false);
      }
    };

    generateBreadcrumbSchema();
  }, [breadcrumbData]);

  return { breadcrumbSchema, loading };
};

// Hook for competitor SEO analysis (admin only)
export const useCompetitorAnalysis = () => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeCompetitors = async (urls: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/seo/analyze/competitors', {
        urls
      });

      setAnalysis(response.data);
    } catch (err) {
      console.error('Error analyzing competitors:', err);
      setError('Failed to analyze competitors');
    } finally {
      setLoading(false);
    }
  };

  return {
    analysis,
    loading,
    error,
    analyzeCompetitors
  };
};

// Hook for SEO recommendations
export const useSEORecommendations = (analysisData?: any) => {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const generateRecommendations = async () => {
      if (!analysisData) return;

      setLoading(true);

      try {
        const response = await axios.post('/api/seo/recommendations', {
          analysis: analysisData
        });

        setRecommendations(response.data.recommendations);
      } catch (error) {
        console.error('Error generating recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    generateRecommendations();
  }, [analysisData]);

  return { recommendations, loading };
};