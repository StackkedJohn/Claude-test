import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: {
    url: string;
    altText: string;
    isPrimary: boolean;
  }[];
  dimensions: {
    width: number;
    height: number;
    depth?: number;
    unit: string;
  };
  weight?: {
    value: number;
    unit: string;
  };
  stock: {
    quantity: number;
    lowStockThreshold: number;
    inStock: boolean;
    reserved: number;
  };
  category: string;
  tags: string[];
  features: string[];
  specifications: {
    capacity: string;
    freezeTime: string;
    coolingDuration: string;
    material: string;
    safetyRating: string;
  };
  sustainability: {
    carbonSavedPerUse: number;
    reusabilityCount: number;
    ecoFriendlyMaterials: string[];
    recyclable: boolean;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  bundle?: {
    isBundle: boolean;
    includedProducts: mongoose.Types.ObjectId[];
    bundleDiscount: number;
  };
  recommendations: {
    relatedProducts: mongoose.Types.ObjectId[];
    bundlesWith: mongoose.Types.ObjectId[];
    useCases: string[];
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    maxLength: 100 
  },
  description: { 
    type: String, 
    required: true,
    maxLength: 500 
  },
  price: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  compareAtPrice: { 
    type: Number, 
    min: 0 
  },
  images: [{
    url: { 
      type: String, 
      required: true 
    },
    altText: { 
      type: String, 
      required: true 
    },
    isPrimary: { 
      type: Boolean, 
      default: false 
    }
  }],
  dimensions: {
    width: { 
      type: Number, 
      required: true 
    },
    height: { 
      type: Number, 
      required: true 
    },
    depth: Number,
    unit: { 
      type: String, 
      default: 'inches' 
    }
  },
  weight: {
    value: Number,
    unit: { 
      type: String, 
      default: 'lbs' 
    }
  },
  stock: {
    quantity: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    lowStockThreshold: { 
      type: Number, 
      default: 10 
    },
    inStock: { 
      type: Boolean, 
      default: true 
    },
    reserved: { 
      type: Number, 
      default: 0 
    },
    reservations: [{
      sessionId: { 
        type: String, 
        required: true 
      },
      quantity: { 
        type: Number, 
        required: true, 
        min: 1 
      },
      reservedAt: { 
        type: Date, 
        default: Date.now 
      },
      expiresAt: { 
        type: Date, 
        required: true 
      }
    }]
  },
  category: { 
    type: String, 
    required: true 
  },
  tags: [String],
  features: [String],
  specifications: {
    capacity: String,
    freezeTime: String,
    coolingDuration: String,
    material: String,
    safetyRating: String
  },
  sustainability: {
    carbonSavedPerUse: { 
      type: Number, 
      default: 0 
    },
    reusabilityCount: { 
      type: Number, 
      default: 1000 
    },
    ecoFriendlyMaterials: [String],
    recyclable: { 
      type: Boolean, 
      default: true 
    }
  },
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  bundle: {
    isBundle: { 
      type: Boolean, 
      default: false 
    },
    includedProducts: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product' 
    }],
    bundleDiscount: { 
      type: Number, 
      default: 0 
    }
  },
  recommendations: {
    relatedProducts: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product' 
    }],
    bundlesWith: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product' 
    }],
    useCases: [String]
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});

// Indexes for better performance
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ 'stock.quantity': 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ tags: 1 });

// Virtual for stock status
ProductSchema.virtual('stockStatus').get(function() {
  if (this.stock.quantity <= 0) return 'out-of-stock';
  if (this.stock.quantity <= this.stock.lowStockThreshold) return 'low-stock';
  return 'in-stock';
});

// Method to check if product is low stock
ProductSchema.methods.isLowStock = function() {
  return this.stock.quantity <= this.stock.lowStockThreshold && this.stock.quantity > 0;
};

// Method to reserve stock
ProductSchema.methods.reserveStock = function(quantity: number) {
  if (this.stock.quantity >= quantity) {
    this.stock.reserved += quantity;
    return true;
  }
  return false;
};

// Method to release reserved stock
ProductSchema.methods.releaseStock = function(quantity: number) {
  this.stock.reserved = Math.max(0, this.stock.reserved - quantity);
};

// Method to complete purchase (remove from stock)
ProductSchema.methods.completePurchase = function(quantity: number) {
  if (this.stock.quantity >= quantity) {
    this.stock.quantity -= quantity;
    this.stock.reserved = Math.max(0, this.stock.reserved - quantity);
    this.stock.inStock = this.stock.quantity > 0;
    return true;
  }
  return false;
};

export default mongoose.model<IProduct>('Product', ProductSchema);