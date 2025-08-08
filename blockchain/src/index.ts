import express from 'express';
import cors from 'cors';
import { blockchainService } from '../../backend/src/services/blockchainService';

const app = express();
const port = process.env.BLOCKCHAIN_PORT || 3002;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'blockchain' });
});

// Get blockchain info
app.get('/info', (req, res) => {
  const chain = blockchainService.getChain();
  res.json({
    length: chain.length,
    difficulty: 4,
    lastBlock: chain[chain.length - 1]
  });
});

// Get full chain
app.get('/chain', (req, res) => {
  res.json({
    chain: blockchainService.getChain(),
    length: blockchainService.getChain().length
  });
});

// Add product to blockchain
app.post('/products', (req, res) => {
  try {
    const { productId, name, category, sustainabilityData } = req.body;
    
    const result = blockchainService.addICEPACAProduct(
      productId,
      name,
      category,
      sustainabilityData
    );
    
    res.json({
      success: true,
      blockIndex: result.index,
      blockHash: result.hash,
      message: 'Product added to blockchain'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Verify product
app.get('/products/:productId/verify', (req, res) => {
  try {
    const { productId } = req.params;
    const verification = blockchainService.verifyProduct(productId);
    
    res.json({
      productId,
      verified: verification !== null,
      verification
    });
  } catch (error) {
    res.status(400).json({
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get sustainability metrics
app.get('/sustainability', (req, res) => {
  try {
    const metrics = blockchainService.getSustainabilityMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mine pending transactions (for development)
app.post('/mine', (req, res) => {
  try {
    console.log('Mining pending transactions...');
    // In a real blockchain, this would mine pending transactions
    res.json({
      success: true,
      message: 'Mining completed (simulation)'
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(port, () => {
  console.log(`🔗 Blockchain service running on port ${port}`);
});