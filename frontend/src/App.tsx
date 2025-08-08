import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from 'react-query';
import { CartProvider } from './contexts/CartContext';
import GlobalStyles from './styles/GlobalStyles';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import CookieConsent from './components/Privacy/CookieConsent';
import FloatingAIAssistant from './components/FloatingAIAssistant';
import GoogleAnalytics from './components/Analytics/GoogleAnalytics';
import Home from './pages/Home';
import SimpleHome from './pages/SimpleHome';
import Shop from './pages/Shop';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import CheckoutSuccess from './pages/CheckoutSuccess';
import TrackingPage from './pages/TrackingPage';
import AdminDashboard from './pages/AdminDashboard';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <CartProvider>
          <Router>
            <GlobalStyles />
            <div className="App">
              <GoogleAnalytics />
              <Navigation />
              <main>
                <Routes>
                  <Route path="/" element={<SimpleHome />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/products" element={<Shop />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/checkout/success" element={<CheckoutSuccess />} />
                  <Route path="/track" element={<TrackingPage />} />
                  <Route path="/track/:trackingNumber" element={<TrackingPage />} />
                  <Route path="/admin/*" element={<AdminDashboard />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/about" element={<div style={{ padding: '2rem', textAlign: 'center' }}>About ICEPACA - Eco-Friendly Ice Packs</div>} />
                  <Route path="/contact" element={<div style={{ padding: '2rem', textAlign: 'center' }}>Contact Us</div>} />
                  <Route path="*" element={<div style={{ padding: '2rem', textAlign: 'center' }}>404 - Page Not Found</div>} />
                </Routes>
              </main>
              <Footer />
              <CookieConsent />
              <FloatingAIAssistant />
            </div>
          </Router>
        </CartProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
