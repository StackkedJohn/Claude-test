import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  QrCodeIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  MapPinIcon,
  ShoppingBagIcon,
  DevicePhoneMobileIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

interface QRCode {
  id: string;
  type: 'product' | 'store' | 'promotion' | 'subscription' | 'review';
  name: string;
  targetUrl: string;
  qrCodeUrl: string;
  qrCodeSVG: string;
  scans: number;
  conversions: number;
  createdAt: Date;
  isActive: boolean;
  location?: string;
  metadata?: any;
}

interface StoreLocation {
  storeId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  qrCodes: QRCode[];
  analytics: {
    totalScans: number;
    conversionRate: number;
    topPerformer: string;
  };
}

interface QRAnalytics {
  totalCodes: number;
  totalScans: number;
  conversionRate: number;
  topPerformers: Array<{
    type: string;
    scans: number;
    conversions: number;
  }>;
  channelPerformance: {
    retail_to_online: {
      visitors: number;
      conversions: number;
      revenue: number;
    };
  };
}

const QRCodeManager: React.FC = () => {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([]);
  const [analytics, setAnalytics] = useState<QRAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<'codes' | 'stores' | 'analytics' | 'generator'>('codes');
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState<QRCode | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);

  // QR Generator form state
  const [generatorForm, setGeneratorForm] = useState({
    type: 'product' as QRCode['type'],
    productId: '',
    storeId: '',
    campaignId: '',
    customUrl: '',
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchQRData();
  }, []);

  const fetchQRData = async () => {
    try {
      const [qrResponse, storesResponse, analyticsResponse] = await Promise.all([
        fetch('/api/omnichannel/qr-codes'),
        fetch('/api/omnichannel/stores'),
        fetch('/api/omnichannel/analytics')
      ]);

      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        setQrCodes(qrData.codes || mockQRCodes);
      } else {
        setQrCodes(mockQRCodes);
      }

      if (storesResponse.ok) {
        const storesData = await storesResponse.json();
        setStoreLocations(storesData.stores || mockStores);
      } else {
        setStoreLocations(mockStores);
      }

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData.qrCodeMetrics || mockAnalytics);
      } else {
        setAnalytics(mockAnalytics);
      }
    } catch (error) {
      console.error('Error fetching QR data:', error);
      setQrCodes(mockQRCodes);
      setStoreLocations(mockStores);
      setAnalytics(mockAnalytics);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    try {
      const response = await fetch('/api/omnichannel/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(generatorForm)
      });

      if (response.ok) {
        const { qrCode } = await response.json();
        setQrCodes(prev => [qrCode, ...prev]);
        setGeneratorForm({
          type: 'product',
          productId: '',
          storeId: '',
          campaignId: '',
          customUrl: '',
          name: '',
          description: ''
        });
        setShowGenerator(false);
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const downloadQRCode = (qrCode: QRCode, format: 'png' | 'svg' | 'pdf') => {
    const link = document.createElement('a');
    
    if (format === 'png') {
      link.href = qrCode.qrCodeUrl;
      link.download = `${qrCode.name.replace(/\s+/g, '_')}_QR.png`;
    } else if (format === 'svg') {
      const blob = new Blob([qrCode.qrCodeSVG], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `${qrCode.name.replace(/\s+/g, '_')}_QR.svg`;
    } else if (format === 'pdf') {
      // Generate PDF with QR code and description
      const pdfContent = generateQRPDF(qrCode);
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `${qrCode.name.replace(/\s+/g, '_')}_QR.pdf`;
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateQRPDF = (qrCode: QRCode): string => {
    // Mock PDF generation - in production, use a proper PDF library
    return `PDF content for QR code: ${qrCode.name}`;
  };

  const getTypeIcon = (type: QRCode['type']) => {
    switch (type) {
      case 'product': return ShoppingBagIcon;
      case 'store': return BuildingStorefrontIcon;
      case 'promotion': return ArrowTrendingUpIcon;
      case 'subscription': return DevicePhoneMobileIcon;
      default: return QrCodeIcon;
    }
  };

  const getTypeColor = (type: QRCode['type']) => {
    switch (type) {
      case 'product': return 'text-blue-600 bg-blue-100';
      case 'store': return 'text-purple-600 bg-purple-100';
      case 'promotion': return 'text-green-600 bg-green-100';
      case 'subscription': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow border h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'codes', label: 'QR Codes', count: qrCodes.length },
    { id: 'stores', label: 'Store Locations', count: storeLocations.length },
    { id: 'analytics', label: 'Analytics', count: null },
    { id: 'generator', label: 'Generate New', count: null }
  ];

  // Mock data
  const mockQRCodes: QRCode[] = [
    {
      id: 'qr_001',
      type: 'product',
      name: 'ICEPACA Medium Pack - In Store',
      targetUrl: 'https://icepaca.com/products/medium-pack?source=qr_instore',
      qrCodeUrl: '/api/placeholder/200/200',
      qrCodeSVG: '<svg>...</svg>',
      scans: 1234,
      conversions: 89,
      createdAt: new Date('2024-01-15'),
      isActive: true,
      location: 'Seattle Store',
      metadata: { productId: 'medium-pack', storeId: 'store_001' }
    },
    {
      id: 'qr_002',
      type: 'subscription',
      name: 'Adventure Kit Subscription',
      targetUrl: 'https://icepaca.com/subscription?source=qr_instore',
      qrCodeUrl: '/api/placeholder/200/200',
      qrCodeSVG: '<svg>...</svg>',
      scans: 856,
      conversions: 127,
      createdAt: new Date('2024-01-10'),
      isActive: true,
      location: 'All Stores',
      metadata: { campaignId: 'sub_winter_2024' }
    },
    {
      id: 'qr_003',
      type: 'store',
      name: 'Store Catalog Access',
      targetUrl: 'https://icepaca.com/store/catalog?source=qr_instore',
      qrCodeUrl: '/api/placeholder/200/200',
      qrCodeSVG: '<svg>...</svg>',
      scans: 2145,
      conversions: 234,
      createdAt: new Date('2024-01-05'),
      isActive: true,
      location: 'Denver Store',
      metadata: { storeId: 'store_002' }
    }
  ];

  const mockStores: StoreLocation[] = [
    {
      storeId: 'store_001',
      name: 'ICEPACA Flagship - Seattle',
      address: '123 Adventure Way',
      city: 'Seattle',
      state: 'WA',
      qrCodes: mockQRCodes.filter(qr => qr.metadata?.storeId === 'store_001'),
      analytics: {
        totalScans: 5420,
        conversionRate: 12.4,
        topPerformer: 'Product QR Codes'
      }
    },
    {
      storeId: 'store_002',
      name: 'ICEPACA Outdoor Hub - Denver',
      address: '456 Mountain View Blvd',
      city: 'Denver',
      state: 'CO',
      qrCodes: mockQRCodes.filter(qr => qr.metadata?.storeId === 'store_002'),
      analytics: {
        totalScans: 3890,
        conversionRate: 9.8,
        topPerformer: 'Store Catalog QR'
      }
    }
  ];

  const mockAnalytics: QRAnalytics = {
    totalCodes: 247,
    totalScans: 15420,
    conversionRate: 8.7,
    topPerformers: [
      { type: 'product', scans: 3450, conversions: 312 },
      { type: 'subscription', scans: 2890, conversions: 287 },
      { type: 'promotion', scans: 2234, conversions: 156 }
    ],
    channelPerformance: {
      retail_to_online: {
        visitors: 5420,
        conversions: 1234,
        revenue: 42350
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">QR Code & Omnichannel Manager</h1>
        <p className="text-gray-600">
          Manage QR codes for in-store experiences, track performance, and connect physical and digital touchpoints
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`px-2 py-1 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* QR Codes Tab */}
      {activeTab === 'codes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {qrCodes.map((qrCode) => {
              const IconComponent = getTypeIcon(qrCode.type);
              const conversionRate = qrCode.scans > 0 ? ((qrCode.conversions / qrCode.scans) * 100).toFixed(1) : '0';
              
              return (
                <motion.div
                  key={qrCode.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow border p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2 rounded-lg ${getTypeColor(qrCode.type)}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      qrCode.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {qrCode.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-2">{qrCode.name}</h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Scans:</span>
                      <span className="font-medium">{qrCode.scans.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Conversions:</span>
                      <span className="font-medium">{qrCode.conversions}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Rate:</span>
                      <span className="font-medium">{conversionRate}%</span>
                    </div>
                  </div>

                  {qrCode.location && (
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {qrCode.location}
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedCode(qrCode)}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View Details
                      </button>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => downloadQRCode(qrCode, 'png')}
                          className="text-gray-600 hover:text-gray-800"
                          title="Download PNG"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => downloadQRCode(qrCode, 'pdf')}
                          className="text-gray-600 hover:text-gray-800"
                          title="Download PDF"
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Store Locations Tab */}
      {activeTab === 'stores' && (
        <div className="space-y-6">
          {storeLocations.map((store) => (
            <div key={store.storeId} className="bg-white rounded-lg shadow border p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{store.name}</h3>
                  <p className="text-gray-600">{store.address}, {store.city}, {store.state}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Scans</p>
                  <p className="text-2xl font-bold text-blue-600">{store.analytics.totalScans.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-blue-600 mb-1">QR Codes</p>
                  <p className="text-2xl font-bold text-blue-800">{store.qrCodes.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-600 mb-1">Conversion Rate</p>
                  <p className="text-2xl font-bold text-green-800">{store.analytics.conversionRate}%</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-purple-600 mb-1">Top Performer</p>
                  <p className="text-sm font-medium text-purple-800">{store.analytics.topPerformer}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">QR Codes in this store:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {store.qrCodes.map((qr) => {
                    const IconComponent = getTypeIcon(qr.type);
                    return (
                      <div key={qr.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`p-2 rounded ${getTypeColor(qr.type)}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{qr.name}</p>
                          <p className="text-xs text-gray-500">{qr.scans} scans</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between mb-2">
                <QrCodeIcon className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold text-blue-600">{analytics.totalCodes}</span>
              </div>
              <p className="text-sm text-gray-600">Total QR Codes</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between mb-2">
                <EyeIcon className="h-8 w-8 text-purple-600" />
                <span className="text-2xl font-bold text-purple-600">{analytics.totalScans.toLocaleString()}</span>
              </div>
              <p className="text-sm text-gray-600">Total Scans</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between mb-2">
                <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
                <span className="text-2xl font-bold text-green-600">{analytics.conversionRate}%</span>
              </div>
              <p className="text-sm text-gray-600">Conversion Rate</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between mb-2">
                <ChartBarIcon className="h-8 w-8 text-orange-600" />
                <span className="text-2xl font-bold text-orange-600">
                  ${analytics.channelPerformance.retail_to_online.revenue.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-600">Revenue Attributed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing QR Types</h3>
              <div className="space-y-4">
                {analytics.topPerformers.map((performer, index) => {
                  const IconComponent = getTypeIcon(performer.type as QRCode['type']);
                  const conversionRate = (performer.conversions / performer.scans * 100).toFixed(1);
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded ${getTypeColor(performer.type as QRCode['type'])}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 capitalize">{performer.type}</p>
                          <p className="text-sm text-gray-600">{performer.scans} scans</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{performer.conversions}</p>
                        <p className="text-sm text-gray-600">{conversionRate}% rate</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Channel Performance</h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-blue-900">Store to Online</h4>
                    <BuildingStorefrontIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-800">
                        {analytics.channelPerformance.retail_to_online.visitors.toLocaleString()}
                      </p>
                      <p className="text-sm text-blue-600">Visitors</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-800">
                        {analytics.channelPerformance.retail_to_online.conversions.toLocaleString()}
                      </p>
                      <p className="text-sm text-blue-600">Conversions</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-800">
                        ${analytics.channelPerformance.retail_to_online.revenue.toLocaleString()}
                      </p>
                      <p className="text-sm text-blue-600">Revenue</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Generator Tab */}
      {activeTab === 'generator' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Generate New QR Code</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">QR Code Type</label>
                <select
                  value={generatorForm.type}
                  onChange={(e) => setGeneratorForm(prev => ({ ...prev, type: e.target.value as QRCode['type'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="product">Product Page</option>
                  <option value="store">Store Action</option>
                  <option value="promotion">Promotion</option>
                  <option value="subscription">Subscription</option>
                  <option value="review">Review Request</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={generatorForm.name}
                  onChange={(e) => setGeneratorForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Medium Pack - Denver Store"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={generatorForm.description}
                  onChange={(e) => setGeneratorForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe where and how this QR code will be used..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {generatorForm.type === 'product' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product ID</label>
                  <input
                    type="text"
                    value={generatorForm.productId}
                    onChange={(e) => setGeneratorForm(prev => ({ ...prev, productId: e.target.value }))}
                    placeholder="e.g., medium-pack"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Store ID (Optional)</label>
                <select
                  value={generatorForm.storeId}
                  onChange={(e) => setGeneratorForm(prev => ({ ...prev, storeId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Stores</option>
                  <option value="store_001">Seattle Flagship</option>
                  <option value="store_002">Denver Outdoor Hub</option>
                </select>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setGeneratorForm({
                      type: 'product',
                      productId: '',
                      storeId: '',
                      campaignId: '',
                      customUrl: '',
                      name: '',
                      description: ''
                    });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={generateQRCode}
                  disabled={!generatorForm.name}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Generate QR Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Detail Modal */}
      {selectedCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">{selectedCode.name}</h3>
                <button
                  onClick={() => setSelectedCode(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center mb-4">
                    <img
                      src={selectedCode.qrCodeUrl}
                      alt={`QR Code for ${selectedCode.name}`}
                      className="mx-auto w-48 h-48"
                    />
                  </div>
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={() => downloadQRCode(selectedCode, 'png')}
                      className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Download PNG
                    </button>
                    <button
                      onClick={() => downloadQRCode(selectedCode, 'svg')}
                      className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors"
                    >
                      Download SVG
                    </button>
                    <button
                      onClick={() => downloadQRCode(selectedCode, 'pdf')}
                      className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                    >
                      Print PDF
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Performance Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Scans:</span>
                        <span className="font-medium">{selectedCode.scans.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Conversions:</span>
                        <span className="font-medium">{selectedCode.conversions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Conversion Rate:</span>
                        <span className="font-medium">
                          {selectedCode.scans > 0 ? ((selectedCode.conversions / selectedCode.scans) * 100).toFixed(1) : '0'}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="capitalize">{selectedCode.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={selectedCode.isActive ? 'text-green-600' : 'text-red-600'}>
                          {selectedCode.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span>{selectedCode.location || 'All Locations'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span>{selectedCode.createdAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Target URL</h4>
                    <div className="bg-gray-50 p-3 rounded border text-sm break-all">
                      {selectedCode.targetUrl}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRCodeManager;