import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import SEOHead from '../components/SEOHead';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

const slideIn = keyframes`
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const DashboardContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #F8FCFF 0%, #E0F6FF 100%);
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const DashboardHeader = styled.div`
  background: linear-gradient(135deg, #00008B 0%, #4169E1 100%);
  color: white;
  padding: 2rem;
  border-radius: 20px;
  margin-bottom: 2rem;
  text-align: center;
  box-shadow: 0 8px 25px rgba(0, 0, 139, 0.3);
`;

const DashboardTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
`;

const LoginSection = styled.div`
  max-width: 400px;
  margin: 0 auto;
  background: white;
  padding: 2rem;
  border-radius: 20px;
  box-shadow: 0 8px 25px rgba(0, 0, 139, 0.1);
`;

const LoginForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  color: var(--primary-dark-blue);
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid var(--primary-light-blue);
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  
  &:focus {
    outline: none;
    border-color: var(--primary-dark-blue);
  }
`;

const LoginButton = styled.button`
  background: linear-gradient(135deg, #00008B 0%, #4169E1 100%);
  color: white;
  border: none;
  padding: 1rem;
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div<{ $color: string }>`
  background: white;
  padding: 1.5rem;
  border-radius: 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 139, 0.1);
  border-left: 4px solid ${props => props.$color};
  animation: ${slideIn} 0.5s ease-out;
`;

const StatTitle = styled.h3`
  color: var(--text-medium);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-dark-blue);
`;

const AlertsSection = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 15px rgba(0, 0, 139, 0.1);
`;

const AlertsTitle = styled.h2`
  color: var(--primary-dark-blue);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AlertItem = styled.div<{ $severity: string }>`
  padding: 1rem;
  border-radius: 10px;
  margin-bottom: 0.5rem;
  border-left: 4px solid ${props => {
    switch (props.$severity) {
      case 'critical': return '#FF4757';
      case 'high': return '#FFA500';
      case 'medium': return '#3742FA';
      case 'low': return '#2ED573';
      default: return '#777';
    }
  }};
  background: ${props => {
    switch (props.$severity) {
      case 'critical': return '#FFF5F5';
      case 'high': return '#FFF8E1';
      case 'medium': return '#F3F4FF';
      case 'low': return '#F0FFF4';
      default: return '#F8F9FA';
    }
  }};
  animation: ${props => props.$severity === 'critical' ? pulse : 'none'} 2s ease-in-out infinite;
`;

const ProductsTable = styled.div`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 4px 15px rgba(0, 0, 139, 0.1);
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #E0E0E0;
  }
  
  th {
    background: var(--light-blue-bg);
    font-weight: 600;
    color: var(--primary-dark-blue);
  }
`;

const StockBadge = styled.span<{ $status: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  background: ${props => {
    switch (props.$status) {
      case 'in-stock': return '#2ED573';
      case 'low-stock': return '#FFA500';
      case 'out-of-stock': return '#FF4757';
      default: return '#777';
    }
  }};
`;

const EditButton = styled.button`
  background: var(--primary-light-blue);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Poppins', sans-serif;
  transition: all 0.3s ease;
  
  &:hover {
    background: var(--primary-dark-blue);
    color: white;
  }
`;

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalAlerts: number;
  activeCarts: number;
  totalInventoryValue: number;
}

interface Alert {
  _id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  stock: {
    quantity: number;
    lowStockThreshold: number;
  };
}

const AdminDashboard: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple login check - in production, use proper authentication
    if (loginData.username === 'admin' && loginData.password === 'admin123') {
      setIsLoggedIn(true);
      localStorage.setItem('admin-token', 'admin-token-123');
      fetchDashboardData();
    } else {
      alert('Invalid credentials. Try: admin / admin123');
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin-token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch dashboard stats
      const statsResponse = await fetch(`${API_BASE}/admin/dashboard`, { headers });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch alerts
      const alertsResponse = await fetch(`${API_BASE}/admin/alerts?limit=10`, { headers });
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.alerts || []);
      }

      // Fetch products
      const productsResponse = await fetch(`${API_BASE}/admin/products?limit=10`, { headers });
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData.products || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('admin-token');
    if (token) {
      setIsLoggedIn(true);
      fetchDashboardData();
    }
  }, []);

  const getStockStatus = (product: Product) => {
    if (product.stock.quantity === 0) return 'out-of-stock';
    if (product.stock.quantity <= product.stock.lowStockThreshold) return 'low-stock';
    return 'in-stock';
  };

  const getStockStatusText = (product: Product) => {
    const status = getStockStatus(product);
    switch (status) {
      case 'in-stock': return 'In Stock';
      case 'low-stock': return 'Low Stock';
      case 'out-of-stock': return 'Out of Stock';
    }
  };

  if (!isLoggedIn) {
    return (
      <DashboardContainer>
        <SEOHead
          title="Admin Dashboard - ICEPACA"
          description="ICEPACA Admin Dashboard for inventory management"
          noindex={true}
        />
        
        <DashboardHeader>
          <DashboardTitle>🔐 Admin Login</DashboardTitle>
          <p>Access the ICEPACA inventory management system</p>
        </DashboardHeader>

        <LoginSection>
          <LoginForm onSubmit={handleLogin}>
            <FormGroup>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                placeholder="Enter username"
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                placeholder="Enter password"
                required
              />
            </FormGroup>
            
            <LoginButton type="submit">
              Login to Dashboard
            </LoginButton>
            
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
              Demo credentials: admin / admin123
            </div>
          </LoginForm>
        </LoginSection>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <SEOHead
        title="Admin Dashboard - ICEPACA Inventory Management"
        description="ICEPACA Admin Dashboard for inventory management and analytics"
        noindex={true}
      />
      
      <DashboardHeader>
        <DashboardTitle>📊 Admin Dashboard</DashboardTitle>
        <p>ICEPACA Inventory Management System</p>
        <button
          onClick={() => {
            localStorage.removeItem('admin-token');
            setIsLoggedIn(false);
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Logout
        </button>
      </DashboardHeader>

      {stats && (
        <StatsGrid>
          <StatCard $color="#2ED573">
            <StatTitle>Total Products</StatTitle>
            <StatValue>{stats.totalProducts}</StatValue>
          </StatCard>
          
          <StatCard $color="#FFA500">
            <StatTitle>Low Stock Items</StatTitle>
            <StatValue>{stats.lowStockProducts}</StatValue>
          </StatCard>
          
          <StatCard $color="#FF4757">
            <StatTitle>Out of Stock</StatTitle>
            <StatValue>{stats.outOfStockProducts}</StatValue>
          </StatCard>
          
          <StatCard $color="#3742FA">
            <StatTitle>Active Carts</StatTitle>
            <StatValue>{stats.activeCarts}</StatValue>
          </StatCard>
          
          <StatCard $color="#2ED573">
            <StatTitle>Inventory Value</StatTitle>
            <StatValue>${stats.totalInventoryValue?.toFixed(0)}</StatValue>
          </StatCard>
          
          <StatCard $color="#FF4757">
            <StatTitle>Unread Alerts</StatTitle>
            <StatValue>{stats.totalAlerts}</StatValue>
          </StatCard>
        </StatsGrid>
      )}

      {alerts.length > 0 && (
        <AlertsSection>
          <AlertsTitle>
            🚨 Recent Alerts
          </AlertsTitle>
          {alerts.map(alert => (
            <AlertItem key={alert._id} $severity={alert.severity}>
              <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                {alert.title}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                {alert.message}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.5rem' }}>
                {new Date(alert.createdAt).toLocaleString()}
              </div>
            </AlertItem>
          ))}
        </AlertsSection>
      )}

      <ProductsTable>
        <h2 style={{ color: 'var(--primary-dark-blue)', marginBottom: '1rem' }}>
          📦 Product Inventory
        </h2>
        
        <Table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product._id}>
                <td>{product.name}</td>
                <td>${product.price}</td>
                <td>{product.stock.quantity}</td>
                <td>
                  <StockBadge $status={getStockStatus(product)}>
                    {getStockStatusText(product)}
                  </StockBadge>
                </td>
                <td>
                  <EditButton onClick={() => alert('Edit functionality coming soon!')}>
                    Edit
                  </EditButton>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </ProductsTable>
    </DashboardContainer>
  );
};

export default AdminDashboard;