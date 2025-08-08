import crypto from 'crypto';
import { Product } from '../models/Product';

// Simple blockchain structure for supply chain transparency
interface Block {
  index: number;
  timestamp: Date;
  data: SupplyChainEntry;
  previousHash: string;
  hash: string;
  nonce: number;
}

interface SupplyChainEntry {
  productId: string;
  batchId: string;
  stage: 'raw_materials' | 'manufacturing' | 'quality_testing' | 'packaging' | 'distribution' | 'retail';
  location: string;
  timestamp: Date;
  certifications: string[];
  testResults?: {
    toxicityTest: {
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
  digitalSignature: string;
}

interface MaterialCertificate {
  certificateId: string;
  issuedBy: string;
  issuedDate: Date;
  expiryDate: Date;
  materialType: string;
  certifications: {
    fda_approved: boolean;
    eu_compliant: boolean;
    rohs_compliant: boolean;
    reach_compliant: boolean;
    recycled_content_verified: boolean;
  };
  testLab: string;
  qrCode: string;
}

class BlockchainService {
  private chain: Block[] = [];
  private difficulty: number = 4; // Mining difficulty

  constructor() {
    this.createGenesisBlock();
  }

  // Create the first block in the chain
  private createGenesisBlock(): void {
    const genesisBlock: Block = {
      index: 0,
      timestamp: new Date('2024-01-01'),
      data: {
        productId: 'genesis',
        batchId: 'genesis',
        stage: 'raw_materials',
        location: 'ICEPACA Supply Chain Genesis',
        timestamp: new Date('2024-01-01'),
        certifications: ['GENESIS_BLOCK'],
        verifiedBy: 'ICEPACA_SYSTEM',
        digitalSignature: 'genesis_signature'
      },
      previousHash: '0',
      hash: '',
      nonce: 0
    };

    genesisBlock.hash = this.calculateHash(genesisBlock);
    this.chain.push(genesisBlock);
  }

  // Calculate hash for a block
  private calculateHash(block: Block): string {
    const data = block.index + 
                 block.timestamp.toISOString() + 
                 JSON.stringify(block.data) + 
                 block.previousHash + 
                 block.nonce;
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Mine a block (proof of work)
  private mineBlock(block: Block): void {
    const target = '0'.repeat(this.difficulty);
    
    while (block.hash.substring(0, this.difficulty) !== target) {
      block.nonce++;
      block.hash = this.calculateHash(block);
    }

    console.log(`Block mined: ${block.hash}`);
  }

  // Add a new block to the chain
  async addBlock(data: SupplyChainEntry): Promise<string> {
    try {
      const previousBlock = this.getLatestBlock();
      const newBlock: Block = {
        index: previousBlock.index + 1,
        timestamp: new Date(),
        data,
        previousHash: previousBlock.hash,
        hash: '',
        nonce: 0
      };

      this.mineBlock(newBlock);
      this.chain.push(newBlock);

      // In production, would save to distributed ledger
      console.log('Block added to supply chain:', newBlock.hash);
      
      return newBlock.hash;
    } catch (error) {
      console.error('Error adding block to chain:', error);
      throw error;
    }
  }

  // Get the latest block
  private getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  // Validate the entire chain
  validateChain(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Check if current block hash is valid
      if (currentBlock.hash !== this.calculateHash(currentBlock)) {
        console.error('Invalid hash at block', i);
        return false;
      }

      // Check if current block points to previous block
      if (currentBlock.previousHash !== previousBlock.hash) {
        console.error('Invalid previous hash at block', i);
        return false;
      }
    }

    return true;
  }

  // Get supply chain history for a product
  async getProductSupplyChain(productId: string): Promise<SupplyChainEntry[]> {
    const entries = this.chain
      .filter(block => block.data.productId === productId)
      .map(block => block.data)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return entries;
  }

  // Get supply chain history for a batch
  async getBatchSupplyChain(batchId: string): Promise<SupplyChainEntry[]> {
    const entries = this.chain
      .filter(block => block.data.batchId === batchId)
      .map(block => block.data)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return entries;
  }

  // Add ICEPACA product to supply chain
  async addICEPACAProduct(productData: {
    productId: string;
    batchId: string;
    materialCertificates: MaterialCertificate[];
  }): Promise<string[]> {
    const blockHashes: string[] = [];

    try {
      // Step 1: Raw Materials Verification
      const rawMaterialsEntry: SupplyChainEntry = {
        productId: productData.productId,
        batchId: productData.batchId,
        stage: 'raw_materials',
        location: 'Certified Material Supplier - Taiwan',
        timestamp: new Date(),
        certifications: productData.materialCertificates.map(cert => cert.certificateId),
        testResults: {
          toxicityTest: {
            result: 'PASSED',
            testDate: new Date(),
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
              'Mercury': 'Not Detected (<0.1 ppm)',
              'Cadmium': 'Not Detected (<0.1 ppm)'
            }
          }
        },
        verifiedBy: 'ICEPACA_QA_TEAM',
        digitalSignature: this.generateSignature('raw_materials', productData.productId)
      };

      blockHashes.push(await this.addBlock(rawMaterialsEntry));

      // Step 2: Manufacturing
      const manufacturingEntry: SupplyChainEntry = {
        productId: productData.productId,
        batchId: productData.batchId,
        stage: 'manufacturing',
        location: 'ICEPACA Manufacturing Facility - Oregon, USA',
        timestamp: new Date(),
        certifications: ['ISO_9001', 'FDA_REGISTERED', 'GMP_CERTIFIED'],
        testResults: {
          durabilityTest: {
            result: 'PASSED',
            cycleCount: 1000,
            temperatureRange: '-40°F to 140°F',
            leakTest: true
          }
        },
        verifiedBy: 'MANUFACTURING_QC',
        digitalSignature: this.generateSignature('manufacturing', productData.productId)
      };

      blockHashes.push(await this.addBlock(manufacturingEntry));

      // Step 3: Quality Testing
      const qualityTestingEntry: SupplyChainEntry = {
        productId: productData.productId,
        batchId: productData.batchId,
        stage: 'quality_testing',
        location: 'ICEPACA Quality Lab - Oregon, USA',
        timestamp: new Date(),
        certifications: ['QUALITY_PASSED', 'BATCH_APPROVED'],
        testResults: {
          toxicityTest: {
            result: 'PASSED',
            testDate: new Date(),
            labName: 'ICEPACA Internal Lab',
            certificateId: `ICEPACA-QT-${productData.batchId}`,
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
        verifiedBy: 'QUALITY_ASSURANCE_LEAD',
        digitalSignature: this.generateSignature('quality_testing', productData.productId)
      };

      blockHashes.push(await this.addBlock(qualityTestingEntry));

      // Step 4: Packaging
      const packagingEntry: SupplyChainEntry = {
        productId: productData.productId,
        batchId: productData.batchId,
        stage: 'packaging',
        location: 'ICEPACA Packaging Facility - Oregon, USA',
        timestamp: new Date(),
        certifications: ['SUSTAINABLE_PACKAGING', 'RECYCLABLE_MATERIALS'],
        verifiedBy: 'PACKAGING_SUPERVISOR',
        digitalSignature: this.generateSignature('packaging', productData.productId)
      };

      blockHashes.push(await this.addBlock(packagingEntry));

      // Step 5: Distribution
      const distributionEntry: SupplyChainEntry = {
        productId: productData.productId,
        batchId: productData.batchId,
        stage: 'distribution',
        location: 'ICEPACA Distribution Center - California, USA',
        timestamp: new Date(),
        certifications: ['CHAIN_OF_CUSTODY', 'TEMPERATURE_CONTROLLED'],
        verifiedBy: 'LOGISTICS_MANAGER',
        digitalSignature: this.generateSignature('distribution', productData.productId)
      };

      blockHashes.push(await this.addBlock(distributionEntry));

      return blockHashes;
    } catch (error) {
      console.error('Error adding ICEPACA product to supply chain:', error);
      throw error;
    }
  }

  // Generate digital signature for verification
  private generateSignature(stage: string, productId: string): string {
    const data = `${stage}_${productId}_${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  // Verify product authenticity
  async verifyProduct(productId: string, batchId: string): Promise<{
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
  }> {
    try {
      const supplyChainEntries = await this.getBatchSupplyChain(batchId);
      const chainValid = this.validateChain();
      
      if (supplyChainEntries.length === 0) {
        return {
          isAuthentic: false,
          confidence: 0,
          verificationDetails: {
            chainIntegrity: false,
            certificationsValid: false,
            testResultsVerified: false,
            digitalSignaturesValid: false
          },
          supplyChainComplete: false,
          lastVerified: new Date()
        };
      }

      // Check if all stages are present
      const expectedStages = ['raw_materials', 'manufacturing', 'quality_testing', 'packaging', 'distribution'];
      const presentStages = supplyChainEntries.map(entry => entry.stage);
      const supplyChainComplete = expectedStages.every(stage => presentStages.includes(stage));

      // Verify test results
      const testResultsVerified = supplyChainEntries.some(entry => 
        entry.testResults?.toxicityTest?.result === 'PASSED'
      );

      // Check certifications
      const certificationsValid = supplyChainEntries.some(entry => 
        entry.certifications.length > 0
      );

      // Verify digital signatures (simplified check)
      const digitalSignaturesValid = supplyChainEntries.every(entry => 
        entry.digitalSignature && entry.digitalSignature.length > 0
      );

      const verificationDetails = {
        chainIntegrity: chainValid,
        certificationsValid,
        testResultsVerified,
        digitalSignaturesValid
      };

      // Calculate confidence score
      let confidence = 0;
      if (verificationDetails.chainIntegrity) confidence += 25;
      if (verificationDetails.certificationsValid) confidence += 25;
      if (verificationDetails.testResultsVerified) confidence += 25;
      if (verificationDetails.digitalSignaturesValid) confidence += 25;

      const isAuthentic = confidence >= 75 && supplyChainComplete;

      return {
        isAuthentic,
        confidence,
        verificationDetails,
        supplyChainComplete,
        lastVerified: new Date()
      };
    } catch (error) {
      console.error('Error verifying product:', error);
      return {
        isAuthentic: false,
        confidence: 0,
        verificationDetails: {
          chainIntegrity: false,
          certificationsValid: false,
          testResultsVerified: false,
          digitalSignaturesValid: false
        },
        supplyChainComplete: false,
        lastVerified: new Date()
      };
    }
  }

  // Get sustainability metrics from blockchain
  async getSustainabilityMetrics(productId: string): Promise<{
    carbonFootprint: number;
    recycledContentPercentage: number;
    sustainabilityScore: number;
    certifications: string[];
    transportationImpact: {
      totalMiles: number;
      carbonEmissions: number;
    };
  }> {
    const supplyChainEntries = await this.getProductSupplyChain(productId);
    
    // Calculate based on supply chain data
    const certifications = [...new Set(supplyChainEntries.flatMap(entry => entry.certifications))];
    const recycledContent = supplyChainEntries.find(entry => 
      entry.testResults?.materialComposition?.recycledContent
    )?.testResults?.materialComposition?.recycledContent || 0;

    // Mock calculations for demonstration
    const carbonFootprint = 2.5; // kg CO2
    const transportationMiles = 1200; // Total miles from raw materials to retail
    const transportationEmissions = transportationMiles * 0.001; // kg CO2 per mile

    // Sustainability score based on various factors
    let sustainabilityScore = 50; // Base score
    if (recycledContent > 0) sustainabilityScore += 20;
    if (certifications.includes('SUSTAINABLE_PACKAGING')) sustainabilityScore += 15;
    if (carbonFootprint < 3.0) sustainabilityScore += 15;

    return {
      carbonFootprint,
      recycledContentPercentage: recycledContent,
      sustainabilityScore: Math.min(sustainabilityScore, 100),
      certifications,
      transportationImpact: {
        totalMiles: transportationMiles,
        carbonEmissions: transportationEmissions
      }
    };
  }

  // Initialize sample data for demonstration
  async initializeSampleData(): Promise<void> {
    try {
      // Create material certificates
      const sampleCertificates: MaterialCertificate[] = [
        {
          certificateId: 'CERT-TPU-2024-001',
          issuedBy: 'Materials Testing Institute',
          issuedDate: new Date('2024-01-15'),
          expiryDate: new Date('2025-01-15'),
          materialType: 'Thermoplastic Polyurethane (TPU)',
          certifications: {
            fda_approved: true,
            eu_compliant: true,
            rohs_compliant: true,
            reach_compliant: true,
            recycled_content_verified: true
          },
          testLab: 'SGS International',
          qrCode: 'QR_CERT_TPU_001'
        }
      ];

      // Add sample products to blockchain
      const sampleProducts = [
        { productId: 'medium-pack', batchId: 'BATCH-MP-2024-001' },
        { productId: 'large-pack', batchId: 'BATCH-LP-2024-001' },
        { productId: 'small-pack', batchId: 'BATCH-SP-2024-001' }
      ];

      for (const product of sampleProducts) {
        await this.addICEPACAProduct({
          ...product,
          materialCertificates: sampleCertificates
        });
      }

      console.log('Sample blockchain data initialized');
    } catch (error) {
      console.error('Error initializing sample data:', error);
    }
  }

  // Get chain statistics
  getChainStats(): {
    totalBlocks: number;
    totalProducts: number;
    totalBatches: number;
    chainValid: boolean;
    lastBlockHash: string;
    avgBlockTime: number;
  } {
    const uniqueProducts = new Set(this.chain.map(block => block.data.productId)).size - 1; // Exclude genesis
    const uniqueBatches = new Set(this.chain.map(block => block.data.batchId)).size - 1;
    
    // Calculate average block time
    let totalTime = 0;
    for (let i = 1; i < this.chain.length; i++) {
      const timeDiff = this.chain[i].timestamp.getTime() - this.chain[i - 1].timestamp.getTime();
      totalTime += timeDiff;
    }
    const avgBlockTime = this.chain.length > 1 ? totalTime / (this.chain.length - 1) : 0;

    return {
      totalBlocks: this.chain.length,
      totalProducts: uniqueProducts,
      totalBatches: uniqueBatches,
      chainValid: this.validateChain(),
      lastBlockHash: this.getLatestBlock().hash,
      avgBlockTime
    };
  }
}

export default new BlockchainService();