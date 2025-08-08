import React, { useState, useEffect } from 'react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
}

const SimpleHome: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      } else {
        setError('Failed to load products');
      }
    } catch (err) {
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        🔄 Loading ICEPACA...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        <p>❌ {error}</p>
        <p style={{ fontSize: '14px', marginTop: '10px' }}>
          Make sure the backend server is running on port 5000
        </p>
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            marginTop: '20px', 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer' 
          }}
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '1rem',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>🧊 ICEPACA</h1>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.1rem' }}>
          Premium Eco-Friendly Ice Packs
        </p>
      </header>

      {/* Hero Section */}
      <section style={{
        backgroundColor: '#ecf0f1',
        padding: '3rem 1rem',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '2rem', margin: '0 0 1rem 0', color: '#2c3e50' }}>
          Keep It Cool, Keep It Clean
        </h2>
        <p style={{ fontSize: '1.2rem', color: '#7f8c8d', maxWidth: '600px', margin: '0 auto' }}>
          Our non-toxic, eco-friendly ice packs are perfect for lunch boxes, coolers, and outdoor adventures. 
          Safe for your family and the environment.
        </p>
      </section>

      {/* Products Section */}
      <section style={{ padding: '3rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '2rem', color: '#2c3e50' }}>
          Our Products
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          padding: '0 1rem'
        }}>
          {products.map((product) => (
            <div
              key={product.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '10px',
                padding: '1.5rem',
                textAlign: 'center',
                backgroundColor: 'white',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <img
                src={product.image}
                alt={product.name}
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}
              />
              <h3 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', color: '#2c3e50' }}>
                {product.name}
              </h3>
              <p style={{ color: '#7f8c8d', marginBottom: '1rem' }}>
                {product.description}
              </p>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#27ae60', marginBottom: '1rem' }}>
                ${product.price}
              </div>
              <button
                style={{
                  backgroundColor: product.inStock ? '#3498db' : '#95a5a6',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '25px',
                  cursor: product.inStock ? 'pointer' : 'not-allowed',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  transition: 'background-color 0.3s ease'
                }}
                disabled={!product.inStock}
                onMouseEnter={(e) => {
                  if (product.inStock) {
                    e.currentTarget.style.backgroundColor = '#2980b9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (product.inStock) {
                    e.currentTarget.style.backgroundColor = '#3498db';
                  }
                }}
              >
                {product.inStock ? '🛒 Add to Cart' : '❌ Out of Stock'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        backgroundColor: '#34495e',
        color: 'white',
        padding: '3rem 1rem',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Why Choose ICEPACA?</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          <div>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌱</div>
            <h3>Eco-Friendly</h3>
            <p>Made with sustainable materials and non-toxic cooling gel</p>
          </div>
          <div>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❄️</div>
            <h3>Long-Lasting</h3>
            <p>Keeps items cold for hours with superior cooling performance</p>
          </div>
          <div>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h3>Safe & Clean</h3>
            <p>BPA-free, FDA approved, and safe for direct food contact</p>
          </div>
          <div>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
            <h3>Reusable</h3>
            <p>Durable construction for thousands of freeze-thaw cycles</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '2rem 1rem',
        textAlign: 'center'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>🧊 ICEPACA</h3>
        <p style={{ margin: '0.5rem 0', color: '#bdc3c7' }}>
          Premium Eco-Friendly Ice Packs for a Sustainable Future
        </p>
        <div style={{ marginTop: '1rem' }}>
          <a href="/about" style={{ color: '#3498db', textDecoration: 'none', margin: '0 1rem' }}>About</a>
          <a href="/contact" style={{ color: '#3498db', textDecoration: 'none', margin: '0 1rem' }}>Contact</a>
          <a href="/admin" style={{ color: '#3498db', textDecoration: 'none', margin: '0 1rem' }}>Admin</a>
        </div>
        <p style={{ margin: '1rem 0 0 0', fontSize: '0.9rem', color: '#95a5a6' }}>
          🚀 Development Mode - Backend: {products.length > 0 ? '✅ Connected' : '❌ Disconnected'}
        </p>
      </footer>
    </div>
  );
};

export default SimpleHome;