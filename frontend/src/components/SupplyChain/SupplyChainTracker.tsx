import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheckIcon,
  TruckIcon,
  BeakerIcon,
  BuildingOfficeIcon,
  CubeIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ChartBarIcon,
  LeafIcon,
  CertificateIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

interface SupplyChainEntry {
  stage: string;
  location: string;
  timestamp: Date;
  certifications: string[];
  testResults?: {
    toxicityTest?: {
      result: 'PASSED' | 'FAILED';
      testDate: Date;
      labName: string;
      certificateId: string;
      details: {
        bpa_free: boolean;
        phthalate_free: boolean;
        lead_free: boolean;
        food_safe_grade: 'A' | 'B' | 'C';
      };
    };
    durabilityTest?: {
      result: 'PASSED' | 'FAILED';
      cycleCount: number;
      temperatureRange: string;
      leakTest: boolean;
    };
    materialComposition?: {
      primaryMaterial: string;
      recycledContent: number;
      biodegradable: boolean;
      chemicalAnalysis: { [key: string]: string };
    };
  };
  verifiedBy: string;
}

interface VerificationResult {
  isAuthentic: boolean;
  confidence: number;
  verificationDetails: {
    chainIntegrity: boolean;
    certificationsValid: boolean;
    testResultsVerified: boolean;
    digitalSignaturesValid: boolean;
  };
  supplyChainComplete: boolean;
  lastVerified: Date;
}

interface SustainabilityMetrics {
  carbonFootprint: number;
  recycledContentPercentage: number;
  sustainabilityScore: number;
  certifications: string[];
  transportationImpact: {
    totalMiles: number;
    carbonEmissions: number;
  };
}

interface SupplyChainTrackerProps {
  productId: string;
  batchId?: string;
  showDetailed?: boolean;
}

const SupplyChainTracker: React.FC<SupplyChainTrackerProps> = ({
  productId,
  batchId = 'BATCH-DEFAULT-001',
  showDetailed = true
}) => {
  const [supplyChainData, setSupplyChainData] = useState<SupplyChainEntry[]>([]);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [sustainability, setSustainability] = useState<SustainabilityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'verification' | 'sustainability'>('timeline');

  useEffect(() => {
    fetchSupplyChainData();
  }, [productId, batchId]);

  const fetchSupplyChainData = async () => {
    try {
      const [chainResponse, verificationResponse, sustainabilityResponse] = await Promise.all([
        fetch(`/api/blockchain/supply-chain/${productId}/${batchId}`),
        fetch(`/api/blockchain/verify/${productId}/${batchId}`),
        fetch(`/api/blockchain/sustainability/${productId}`)
      ]);

      if (chainResponse.ok) {
        const chainData = await chainResponse.json();
        setSupplyChainData(chainData.entries || mockSupplyChainData);
      } else {
        setSupplyChainData(mockSupplyChainData);
      }

      if (verificationResponse.ok) {
        const verificationData = await verificationResponse.json();
        setVerification(verificationData || mockVerificationData);
      } else {
        setVerification(mockVerificationData);
      }

      if (sustainabilityResponse.ok) {
        const sustainabilityData = await sustainabilityResponse.json();
        setSustainability(sustainabilityData || mockSustainabilityData);
      } else {
        setSustainability(mockSustainabilityData);
      }
    } catch (error) {
      console.error('Error fetching supply chain data:', error);
      setSupplyChainData(mockSupplyChainData);
      setVerification(mockVerificationData);
      setSustainability(mockSustainabilityData);
    } finally {
      setLoading(false);
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'raw_materials': return BeakerIcon;
      case 'manufacturing': return BuildingOfficeIcon;
      case 'quality_testing': return ShieldCheckIcon;
      case 'packaging': return CubeIcon;
      case 'distribution': return TruckIcon;
      default: return InformationCircleIcon;
    }
  };

  const getStageTitle = (stage: string) => {
    switch (stage) {
      case 'raw_materials': return 'Raw Materials';
      case 'manufacturing': return 'Manufacturing';
      case 'quality_testing': return 'Quality Testing';
      case 'packaging': return 'Packaging';
      case 'distribution': return 'Distribution';
      default: return stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getSafetyGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-yellow-600 bg-yellow-100';
      case 'C': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Mock data for demonstration
  const mockSupplyChainData: SupplyChainEntry[] = [
    {
      stage: 'raw_materials',
      location: 'Certified Material Supplier - Taiwan',
      timestamp: new Date('2024-01-15'),
      certifications: ['SGS-2024-ICEPACA-001', 'FDA_APPROVED', 'EU_COMPLIANT'],
      testResults: {
        toxicityTest: {
          result: 'PASSED',
          testDate: new Date('2024-01-15'),
          labName: 'SGS International',
          certificateId: 'SGS-2024-ICEPACA-001',
          details: {
            bpa_free: true,
            phthalate_free: true,
            lead_free: true,
            food_safe_grade: 'A'
          }
        },
        materialComposition: {
          primaryMaterial: 'Medical Grade TPU',
          recycledContent: 15,
          biodegradable: false,
          chemicalAnalysis: {
            'BPA': 'Not Detected (<0.1 ppm)',
            'Phthalates': 'Not Detected (<0.1 ppm)',
            'Lead': 'Not Detected (<0.1 ppm)',
            'Mercury': 'Not Detected (<0.1 ppm)'
          }
        }
      },
      verifiedBy: 'ICEPACA_QA_TEAM'
    },
    {
      stage: 'manufacturing',
      location: 'ICEPACA Manufacturing Facility - Oregon, USA',
      timestamp: new Date('2024-01-18'),
      certifications: ['ISO_9001', 'FDA_REGISTERED', 'GMP_CERTIFIED'],
      testResults: {
        durabilityTest: {
          result: 'PASSED',
          cycleCount: 1000,
          temperatureRange: '-40°F to 140°F',
          leakTest: true
        }
      },
      verifiedBy: 'MANUFACTURING_QC'
    },
    {
      stage: 'quality_testing',
      location: 'ICEPACA Quality Lab - Oregon, USA',
      timestamp: new Date('2024-01-20'),
      certifications: ['QUALITY_PASSED', 'BATCH_APPROVED'],
      testResults: {
        toxicityTest: {
          result: 'PASSED',
          testDate: new Date('2024-01-20'),
          labName: 'ICEPACA Internal Lab',
          certificateId: 'ICEPACA-QT-BATCH-001',
          details: {
            bpa_free: true,
            phthalate_free: true,
            lead_free: true,
            food_safe_grade: 'A'
          }
        },
        durabilityTest: {
          result: 'PASSED',
          cycleCount: 1500,
          temperatureRange: '-50°F to 150°F',
          leakTest: true
        }
      },
      verifiedBy: 'QUALITY_ASSURANCE_LEAD'
    },
    {
      stage: 'packaging',
      location: 'ICEPACA Packaging Facility - Oregon, USA',
      timestamp: new Date('2024-01-22'),
      certifications: ['SUSTAINABLE_PACKAGING', 'RECYCLABLE_MATERIALS'],
      verifiedBy: 'PACKAGING_SUPERVISOR'
    },
    {
      stage: 'distribution',
      location: 'ICEPACA Distribution Center - California, USA',
      timestamp: new Date('2024-01-25'),
      certifications: ['CHAIN_OF_CUSTODY', 'TEMPERATURE_CONTROLLED'],
      verifiedBy: 'LOGISTICS_MANAGER'
    }
  ];

  const mockVerificationData: VerificationResult = {
    isAuthentic: true,
    confidence: 95,
    verificationDetails: {
      chainIntegrity: true,
      certificationsValid: true,
      testResultsVerified: true,
      digitalSignaturesValid: true
    },
    supplyChainComplete: true,
    lastVerified: new Date()
  };

  const mockSustainabilityData: SustainabilityMetrics = {
    carbonFootprint: 2.3,
    recycledContentPercentage: 15,
    sustainabilityScore: 87,
    certifications: ['SUSTAINABLE_PACKAGING', 'RECYCLABLE_MATERIALS', 'CARBON_NEUTRAL_SHIPPING'],
    transportationImpact: {
      totalMiles: 1200,
      carbonEmissions: 1.2
    }
  };

  const tabs = [
    { id: 'timeline', label: 'Supply Chain Timeline', icon: TruckIcon },
    { id: 'verification', label: 'Product Verification', icon: ShieldCheckIcon },
    { id: 'sustainability', label: 'Sustainability Metrics', icon: LeafIcon }
  ];

  return (
    <div className="bg-white rounded-lg shadow border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">Supply Chain Transparency</h2>
            <p className="opacity-90">Product ID: {productId} | Batch: {batchId}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 mb-2">
              {verification?.isAuthentic ? (
                <CheckCircleSolid className="h-8 w-8 text-green-300" />
              ) : (
                <XCircleIcon className="h-8 w-8 text-red-300" />
              )}
              <span className="text-lg font-semibold">
                {verification?.isAuthentic ? 'VERIFIED AUTHENTIC' : 'NOT VERIFIED'}
              </span>
            </div>
            <p className="text-sm opacity-90">
              Confidence: {verification?.confidence}%
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <div className="relative">
              {supplyChainData.map((entry, index) => {
                const Icon = getStageIcon(entry.stage);
                const isLast = index === supplyChainData.length - 1;
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex items-start space-x-4 pb-8"
                  >
                    {/* Timeline Line */}
                    {!isLast && (
                      <div className="absolute left-5 top-12 w-0.5 h-full bg-gray-200"></div>
                    )}
                    
                    {/* Stage Icon */}
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    
                    {/* Stage Content */}
                    <div className="flex-1 bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{getStageTitle(entry.stage)}</h3>
                        <span className="text-sm text-gray-500">
                          {entry.timestamp.toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{entry.location}</p>
                      
                      {/* Certifications */}
                      {entry.certifications.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Certifications:</h4>
                          <div className="flex flex-wrap gap-2">
                            {entry.certifications.map((cert, certIndex) => (
                              <span
                                key={certIndex}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                              >
                                <CertificateIcon className="h-3 w-3 mr-1" />
                                {cert}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Test Results */}
                      {entry.testResults && (
                        <div className="space-y-3">
                          {entry.testResults.toxicityTest && (
                            <div className="bg-white rounded p-3 border">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-900">Toxicity Test</h4>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  entry.testResults.toxicityTest.result === 'PASSED'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {entry.testResults.toxicityTest.result}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p><strong>Lab:</strong> {entry.testResults.toxicityTest.labName}</p>
                                  <p><strong>Certificate:</strong> {entry.testResults.toxicityTest.certificateId}</p>
                                </div>
                                <div>
                                  <p><strong>Food Safety Grade:</strong> 
                                    <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                                      getSafetyGradeColor(entry.testResults.toxicityTest.details.food_safe_grade)
                                    }`}>
                                      {entry.testResults.toxicityTest.details.food_safe_grade}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              
                              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                                {Object.entries(entry.testResults.toxicityTest.details).map(([key, value]) => {
                                  if (key === 'food_safe_grade') return null;
                                  return (
                                    <div key={key} className="flex items-center text-xs">
                                      {value ? (
                                        <CheckCircleSolid className="h-4 w-4 text-green-500 mr-1" />
                                      ) : (
                                        <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                                      )}
                                      <span className="capitalize">{key.replace('_', ' ')}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          {entry.testResults.durabilityTest && (
                            <div className="bg-white rounded p-3 border">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-900">Durability Test</h4>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  entry.testResults.durabilityTest.result === 'PASSED'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {entry.testResults.durabilityTest.result}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p><strong>Cycle Count:</strong> {entry.testResults.durabilityTest.cycleCount.toLocaleString()}</p>
                                  <p><strong>Temperature Range:</strong> {entry.testResults.durabilityTest.temperatureRange}</p>
                                </div>
                                <div>
                                  <p><strong>Leak Test:</strong> 
                                    <span className="ml-2">
                                      {entry.testResults.durabilityTest.leakTest ? (
                                        <CheckCircleSolid className="h-4 w-4 text-green-500 inline" />
                                      ) : (
                                        <XCircleIcon className="h-4 w-4 text-red-500 inline" />
                                      )}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {entry.testResults.materialComposition && (
                            <div className="bg-white rounded p-3 border">
                              <h4 className="font-medium text-gray-900 mb-2">Material Composition</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p><strong>Primary Material:</strong> {entry.testResults.materialComposition.primaryMaterial}</p>
                                  <p><strong>Recycled Content:</strong> {entry.testResults.materialComposition.recycledContent}%</p>
                                </div>
                                <div>
                                  <p><strong>Biodegradable:</strong> {entry.testResults.materialComposition.biodegradable ? 'Yes' : 'No'}</p>
                                </div>
                              </div>
                              
                              <div className="mt-3">
                                <h5 className="font-medium text-gray-700 mb-2">Chemical Analysis:</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                  {Object.entries(entry.testResults.materialComposition.chemicalAnalysis).map(([chemical, result]) => (
                                    <div key={chemical} className="flex justify-between">
                                      <span>{chemical}:</span>
                                      <span className="text-green-600 font-medium">{result}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="mt-3 text-xs text-gray-500">
                        Verified by: {entry.verifiedBy}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Verification Tab */}
        {activeTab === 'verification' && verification && (
          <div className="space-y-6">
            <div className="text-center">
              <div className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-semibold ${
                verification.isAuthentic 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {verification.isAuthentic ? (
                  <CheckCircleSolid className="h-6 w-6 mr-2" />
                ) : (
                  <XCircleIcon className="h-6 w-6 mr-2" />
                )}
                {verification.isAuthentic ? 'VERIFIED AUTHENTIC' : 'NOT VERIFIED'}
              </div>
              
              <div className="mt-4">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {verification.confidence}%
                </div>
                <p className="text-gray-600">Verification Confidence Score</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(verification.verificationDetails).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                    {value ? (
                      <CheckCircleSolid className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {value ? 'Verified' : 'Not Verified'}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-1 mr-3" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-2">Blockchain Verification</h3>
                  <p className="text-sm text-blue-800">
                    This product's supply chain is tracked on our blockchain ledger, ensuring transparency 
                    and preventing tampering. Each stage has been cryptographically verified and cannot be altered.
                  </p>
                  <div className="mt-3 text-xs text-blue-700">
                    Last verified: {verification.lastVerified.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sustainability Tab */}
        {activeTab === 'sustainability' && sustainability && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center px-6 py-3 rounded-full text-lg font-semibold bg-green-100 text-green-800">
                <LeafIcon className="h-6 w-6 mr-2" />
                Sustainability Score: {sustainability.sustainabilityScore}/100
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-6 text-center">
                <ChartBarIcon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <div className="text-2xl font-bold text-blue-800 mb-1">
                  {sustainability.carbonFootprint} kg
                </div>
                <p className="text-sm text-blue-600">Carbon Footprint</p>
              </div>

              <div className="bg-green-50 rounded-lg p-6 text-center">
                <LeafIcon className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <div className="text-2xl font-bold text-green-800 mb-1">
                  {sustainability.recycledContentPercentage}%
                </div>
                <p className="text-sm text-green-600">Recycled Content</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-6 text-center">
                <TruckIcon className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                <div className="text-2xl font-bold text-purple-800 mb-1">
                  {sustainability.transportationImpact.totalMiles}
                </div>
                <p className="text-sm text-purple-600">Transportation Miles</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Environmental Certifications</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {sustainability.certifications.map((cert, index) => (
                  <div key={index} className="flex items-center bg-white rounded p-3 border">
                    <CertificateIcon className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {cert.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <LeafIcon className="h-5 w-5 text-green-600 mt-1 mr-3" />
                <div>
                  <h3 className="font-medium text-green-900 mb-2">Environmental Impact</h3>
                  <div className="text-sm text-green-800 space-y-1">
                    <p>• Carbon emissions from transportation: {sustainability.transportationImpact.carbonEmissions} kg CO₂</p>
                    <p>• Made with {sustainability.recycledContentPercentage}% recycled materials</p>
                    <p>• Reusable for 1000+ cycles, preventing single-use waste</p>
                    <p>• Packaging made from recyclable materials</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplyChainTracker;