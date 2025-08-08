import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminAlert extends Document {
  type: 'low-stock' | 'out-of-stock' | 'system' | 'order';
  title: string;
  message: string;
  productId?: mongoose.Types.ObjectId;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  isEmailSent: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const AdminAlertSchema: Schema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['low-stock', 'out-of-stock', 'system', 'order']
  },
  title: {
    type: String,
    required: true,
    maxLength: 100
  },
  message: {
    type: String,
    required: true,
    maxLength: 500
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isEmailSent: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for efficient querying
AdminAlertSchema.index({ type: 1, isRead: 1 });
AdminAlertSchema.index({ severity: 1, createdAt: -1 });
AdminAlertSchema.index({ productId: 1 });

export default mongoose.model<IAdminAlert>('AdminAlert', AdminAlertSchema);