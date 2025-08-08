// MongoDB initialization script for development
print('🚀 Initializing ICEPACA development database...');

// Switch to the development database
db = db.getSiblingDB('icepaca-dev');

// Create collections with initial data
db.createCollection('products');
db.createCollection('users');
db.createCollection('orders');
db.createCollection('reviews');
db.createCollection('cart');
db.createCollection('blog');

// Insert sample products
db.products.insertMany([
  {
    _id: ObjectId(),
    name: 'Small Ice Pack',
    description: 'Perfect for lunch boxes and small coolers. Non-toxic, eco-friendly materials.',
    price: 19.99,
    category: 'small',
    size: 'Small',
    dimensions: '6" x 4" x 1"',
    weight: '0.5 lbs',
    stock: 150,
    images: [
      'https://via.placeholder.com/400x400/4A90E2/FFFFFF?text=Small+Ice+Pack',
      'https://via.placeholder.com/400x400/7B68EE/FFFFFF?text=Small+Pack+Detail'
    ],
    features: [
      'Non-toxic gel formula',
      'Flexible when frozen',
      'Reusable and durable',
      'Leak-proof design',
      'BPA-free materials'
    ],
    sustainabilityData: {
      materials: ['Recycled plastic outer shell', 'Non-toxic cooling gel'],
      recyclable: true,
      carbonFootprint: '2.1 kg CO2eq',
      certifications: ['FDA Approved', 'BPA-Free', 'Eco-Friendly']
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    name: 'Medium Ice Pack',
    description: 'Ideal for day trips and medium coolers. Long-lasting cooling power.',
    price: 29.99,
    category: 'medium',
    size: 'Medium',
    dimensions: '8" x 6" x 1.5"',
    weight: '1.2 lbs',
    stock: 120,
    images: [
      'https://via.placeholder.com/400x400/50C878/FFFFFF?text=Medium+Ice+Pack',
      'https://via.placeholder.com/400x400/32CD32/FFFFFF?text=Medium+Pack+Detail'
    ],
    features: [
      'Extended cooling duration',
      'Ergonomic design',
      'Non-toxic gel formula',
      'Flexible when frozen',
      'Professional grade'
    ],
    sustainabilityData: {
      materials: ['Recycled plastic outer shell', 'Bio-based cooling gel'],
      recyclable: true,
      carbonFootprint: '3.2 kg CO2eq',
      certifications: ['FDA Approved', 'BPA-Free', 'Eco-Friendly', 'GREENGUARD Certified']
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    name: 'Large Ice Pack',
    description: 'Great for extended trips and large coolers. Maximum cooling capacity.',
    price: 39.99,
    category: 'large',
    size: 'Large',
    dimensions: '12" x 8" x 2"',
    weight: '2.0 lbs',
    stock: 80,
    images: [
      'https://via.placeholder.com/400x400/FF6B6B/FFFFFF?text=Large+Ice+Pack',
      'https://via.placeholder.com/400x400/FF4444/FFFFFF?text=Large+Pack+Detail'
    ],
    features: [
      'Maximum cooling power',
      'Heavy-duty construction',
      'Commercial grade',
      'Long-lasting performance',
      'Versatile applications'
    ],
    sustainabilityData: {
      materials: ['100% recycled plastic shell', 'Plant-based cooling gel'],
      recyclable: true,
      carbonFootprint: '4.1 kg CO2eq',
      certifications: ['FDA Approved', 'BPA-Free', 'Eco-Friendly', 'GREENGUARD Gold']
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    name: 'Ice Pack Set - Family Pack',
    description: 'Complete set with small, medium, and large ice packs. Perfect for families.',
    price: 79.99,
    category: 'bundle',
    size: 'Bundle',
    dimensions: 'Varies',
    weight: '3.7 lbs',
    stock: 60,
    images: [
      'https://via.placeholder.com/400x400/9B59B6/FFFFFF?text=Family+Pack+Bundle',
      'https://via.placeholder.com/400x400/8E44AD/FFFFFF?text=Bundle+Contents'
    ],
    features: [
      '3 different sizes included',
      'Cost-effective bundle',
      'Complete cooling solution',
      'Gift-ready packaging',
      'Best value option'
    ],
    sustainabilityData: {
      materials: ['Mixed recycled plastics', 'Eco-friendly gel compounds'],
      recyclable: true,
      carbonFootprint: '8.5 kg CO2eq',
      certifications: ['FDA Approved', 'BPA-Free', 'Eco-Friendly', 'Family Safe']
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Insert sample admin user
db.users.insertOne({
  _id: ObjectId(),
  email: 'admin@icepaca.com',
  name: 'ICEPACA Admin',
  password: '$2b$10$placeholder.hash.for.admin.password', // In real app, use proper bcrypt hash
  role: 'admin',
  isActive: true,
  isVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  profile: {
    firstName: 'ICEPACA',
    lastName: 'Admin',
    phone: '+1-555-0123',
    address: {
      street: '123 Ice Pack Lane',
      city: 'Cool City',
      state: 'CA',
      zipCode: '90210',
      country: 'USA'
    }
  },
  preferences: {
    newsletter: true,
    promotions: true,
    notifications: true
  }
});

// Insert sample customer user
db.users.insertOne({
  _id: ObjectId(),
  email: 'customer@example.com',
  name: 'John Doe',
  password: '$2b$10$placeholder.hash.for.customer.password',
  role: 'customer',
  isActive: true,
  isVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1-555-0124',
    address: {
      street: '456 Customer St',
      city: 'Sample City',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    }
  },
  preferences: {
    newsletter: true,
    promotions: false,
    notifications: true
  }
});

// Insert sample reviews
const products = db.products.find().toArray();
if (products.length > 0) {
  db.reviews.insertMany([
    {
      _id: ObjectId(),
      productId: products[0]._id,
      userId: ObjectId(),
      rating: 5,
      title: 'Perfect for lunch boxes!',
      comment: 'These small ice packs are exactly what I needed for my kids lunch boxes. They stay cold all day and are the perfect size.',
      verified: true,
      helpful: 8,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    {
      _id: ObjectId(),
      productId: products[1]._id,
      userId: ObjectId(),
      rating: 4,
      title: 'Great for camping trips',
      comment: 'Used these on our weekend camping trip. They kept our food cold for the entire weekend. Very satisfied!',
      verified: true,
      helpful: 12,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    {
      _id: ObjectId(),
      productId: products[2]._id,
      userId: ObjectId(),
      rating: 5,
      title: 'Excellent quality!',
      comment: 'These large ice packs are built to last. Professional quality at a great price. Highly recommend!',
      verified: true,
      helpful: 15,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  ]);
}

// Insert sample blog posts
db.blog.insertMany([
  {
    _id: ObjectId(),
    title: 'The Ultimate Guide to Ice Pack Care and Maintenance',
    slug: 'ice-pack-care-maintenance-guide',
    excerpt: 'Learn how to properly care for your ice packs to ensure maximum longevity and performance.',
    content: 'Ice packs are essential tools for keeping food fresh and beverages cold, but proper care and maintenance are crucial for getting the most out of your investment...',
    author: {
      name: 'ICEPACA Team',
      email: 'team@icepaca.com',
      avatar: 'https://via.placeholder.com/100x100/4A90E2/FFFFFF?text=IT'
    },
    status: 'published',
    featured: true,
    featuredImage: 'https://via.placeholder.com/800x400/4A90E2/FFFFFF?text=Ice+Pack+Care+Guide',
    tags: ['care', 'maintenance', 'tips', 'guide'],
    categories: ['Guides', 'Tips'],
    seoTitle: 'Ice Pack Care Guide - ICEPACA Tips for Longevity',
    seoDescription: 'Complete guide to caring for your ice packs. Expert tips for maximum performance and longevity.',
    readTime: 8,
    views: 1247,
    likes: 89,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  },
  {
    _id: ObjectId(),
    title: 'Eco-Friendly Cooling: Why Non-Toxic Ice Packs Matter',
    slug: 'eco-friendly-non-toxic-ice-packs',
    excerpt: 'Discover the environmental and health benefits of choosing non-toxic, eco-friendly ice packs.',
    content: 'In todays environmentally conscious world, making sustainable choices extends to every aspect of our lives, including the cooling products we use...',
    author: {
      name: 'ICEPACA Team',
      email: 'team@icepaca.com',
      avatar: 'https://via.placeholder.com/100x100/50C878/FFFFFF?text=IT'
    },
    status: 'published',
    featured: false,
    featuredImage: 'https://via.placeholder.com/800x400/50C878/FFFFFF?text=Eco+Friendly+Cooling',
    tags: ['eco-friendly', 'sustainability', 'non-toxic', 'environment'],
    categories: ['Sustainability', 'Health'],
    seoTitle: 'Eco-Friendly Non-Toxic Ice Packs - ICEPACA Sustainable Cooling',
    seoDescription: 'Learn about the benefits of eco-friendly, non-toxic ice packs for your health and the environment.',
    readTime: 6,
    views: 892,
    likes: 67,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }
]);

// Create indexes for better performance
db.products.createIndex({ name: "text", description: "text" });
db.products.createIndex({ category: 1 });
db.products.createIndex({ price: 1 });
db.products.createIndex({ isActive: 1 });

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

db.orders.createIndex({ userId: 1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ createdAt: -1 });

db.reviews.createIndex({ productId: 1 });
db.reviews.createIndex({ rating: -1 });

db.blog.createIndex({ slug: 1 }, { unique: true });
db.blog.createIndex({ status: 1 });
db.blog.createIndex({ publishedAt: -1 });
db.blog.createIndex({ title: "text", content: "text" });

print('✅ ICEPACA development database initialized successfully!');
print('📦 Sample products inserted: ' + db.products.count());
print('👥 Sample users inserted: ' + db.users.count());
print('⭐ Sample reviews inserted: ' + db.reviews.count());
print('📝 Sample blog posts inserted: ' + db.blog.count());
print('🔍 Database indexes created');
print('🚀 Ready for development!');