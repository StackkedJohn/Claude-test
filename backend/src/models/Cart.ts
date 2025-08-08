import mongoose, { Document, Schema } from 'mongoose';

export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  addedAt: Date;
}

export interface ICart extends Document {
  sessionId: string;
  items: ICartItem[];
  totalItems: number;
  totalPrice: number;
  discountCode?: string;
  discountAmount?: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const CartSchema: Schema = new Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  items: [CartItemSchema],
  totalItems: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  discountCode: String,
  discountAmount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    default: Date.now,
    expires: 24 * 60 * 60 // 24 hours in seconds
  }
}, {
  timestamps: true
});

// Method to calculate totals
CartSchema.methods.calculateTotals = function() {
  this.totalItems = this.items.reduce((sum: number, item: ICartItem) => sum + item.quantity, 0);
  this.totalPrice = this.items.reduce((sum: number, item: ICartItem) => sum + (item.price * item.quantity), 0);
  
  if (this.discountAmount) {
    this.totalPrice = Math.max(0, this.totalPrice - this.discountAmount);
  }
  
  return { totalItems: this.totalItems, totalPrice: this.totalPrice };
};

// Method to add item to cart
CartSchema.methods.addItem = function(productId: mongoose.Types.ObjectId, quantity: number, price: number) {
  const existingItemIndex = this.items.findIndex((item: ICartItem) => 
    item.productId.toString() === productId.toString()
  );

  if (existingItemIndex > -1) {
    this.items[existingItemIndex].quantity += quantity;
  } else {
    this.items.push({
      productId,
      quantity,
      price,
      addedAt: new Date()
    });
  }

  this.calculateTotals();
};

// Method to remove item from cart
CartSchema.methods.removeItem = function(productId: mongoose.Types.ObjectId) {
  this.items = this.items.filter((item: ICartItem) => 
    item.productId.toString() !== productId.toString()
  );
  this.calculateTotals();
};

// Method to update item quantity
CartSchema.methods.updateItemQuantity = function(productId: mongoose.Types.ObjectId, quantity: number) {
  const itemIndex = this.items.findIndex((item: ICartItem) => 
    item.productId.toString() === productId.toString()
  );

  if (itemIndex > -1) {
    if (quantity <= 0) {
      this.items.splice(itemIndex, 1);
    } else {
      this.items[itemIndex].quantity = quantity;
    }
    this.calculateTotals();
    return true;
  }
  return false;
};

// Method to clear cart
CartSchema.methods.clearCart = function() {
  this.items = [];
  this.totalItems = 0;
  this.totalPrice = 0;
  this.discountCode = undefined;
  this.discountAmount = 0;
};

export default mongoose.model<ICart>('Cart', CartSchema);