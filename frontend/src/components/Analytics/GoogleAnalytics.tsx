import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';

interface GoogleAnalyticsProps {
  measurementId?: string;
  gtmId?: string;
  debug?: boolean;
  userId?: string;
  customDimensions?: { [key: string]: string };
}

// Global gtag function declaration
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
    GoogleAnalyticsObject: string;
  }
}

const GoogleAnalytics: React.FC<GoogleAnalyticsProps> = ({
  measurementId,
  gtmId,
  debug = false,
  userId,
  customDimensions = {}
}) => {
  const [gaConfig, setGaConfig] = useState<{ measurementId: string } | null>(null);
  const [gtmConfig, setGtmConfig] = useState<{ gtmId: string; containerId: string } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch configuration from backend
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const [gaResponse, gtmResponse] = await Promise.all([
          fetch('/api/analytics/config/ga4'),
          fetch('/api/analytics/config/gtm')
        ]);

        if (gaResponse.ok) {
          const gaData = await gaResponse.json();
          setGaConfig(gaData);
        }

        if (gtmResponse.ok) {
          const gtmData = await gtmResponse.json();
          setGtmConfig(gtmData);
        }
      } catch (error) {
        console.error('Error fetching analytics configuration:', error);
      }
    };

    fetchConfigs();
  }, []);

  // Initialize Google Analytics
  useEffect(() => {
    const gaId = measurementId || gaConfig?.measurementId;
    const gtmContainerId = gtmId || gtmConfig?.gtmId;

    if (!gaId && !gtmContainerId) {
      if (debug) console.log('No analytics IDs provided');
      return;
    }

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    // Configure gtag
    window.gtag('js', new Date());

    // Initialize GA4 if available
    if (gaId) {
      window.gtag('config', gaId, {
        debug_mode: debug,
        send_page_view: true,
        user_id: userId,
        custom_map: customDimensions
      });

      if (debug) console.log('Google Analytics 4 initialized:', gaId);
    }

    // Set custom dimensions
    if (Object.keys(customDimensions).length > 0) {
      window.gtag('config', gaId, {
        custom_map: customDimensions
      });
    }

    setIsInitialized(true);
  }, [gaConfig, gtmConfig, measurementId, gtmId, debug, userId, customDimensions]);

  const gaId = measurementId || gaConfig?.measurementId;
  const gtmContainerId = gtmId || gtmConfig?.gtmId;

  return (
    <Helmet>
      {/* Google Tag Manager */}
      {gtmContainerId && (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${gtmContainerId}');
              `
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmContainerId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        </>
      )}

      {/* Google Analytics 4 (if not using GTM) */}
      {gaId && !gtmContainerId && (
        <>
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', {
                  ${debug ? 'debug_mode: true,' : ''}
                  ${userId ? `user_id: '${userId}',` : ''}
                  send_page_view: true
                });
              `
            }}
          />
        </>
      )}

      {/* Debug information */}
      {debug && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log('Analytics Configuration:', {
                ga4_id: '${gaId || 'Not set'}',
                gtm_id: '${gtmContainerId || 'Not set'}',
                user_id: '${userId || 'Not set'}',
                debug_mode: ${debug}
              });
            `
          }}
        />
      )}
    </Helmet>
  );
};

export default GoogleAnalytics;