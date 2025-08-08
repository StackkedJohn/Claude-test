// Content routes for FAQ, About, and user-generated content
import express, { Request, Response } from 'express';
import { authenticateToken, requireModerator, optionalAuth } from '../middleware/auth';

const router = express.Router();

// FAQ data (in production, this would be in a database)
const faqData = [
  {
    id: 1,
    category: 'Product Information',
    question: 'How long do ICEPACA ice packs keep things cold?',
    answer: 'ICEPACA ice packs are designed for extended cooling performance. Our Small pack keeps items cold for 6-8 hours, Medium pack for 10-12 hours, and Large pack for 16-24 hours. The actual duration depends on ambient temperature, insulation, and how frequently the cooler is opened.',
    keywords: ['duration', 'cold', 'hours', 'cooling', 'performance'],
    helpful: 45,
    notHelpful: 3
  },
  {
    id: 2,
    category: 'Usage & Care',
    question: 'How do I properly freeze my ICEPACA ice pack?',
    answer: 'Place your ICEPACA ice pack flat in your freezer for the recommended freeze time: Small (4-6 hours), Medium (6-8 hours), Large (8-12 hours). For best results, ensure your freezer is set to 0°F (-18°C) or below. The pack should feel completely solid when ready to use.',
    keywords: ['freeze', 'freezer', 'preparation', 'care', 'instructions'],
    helpful: 38,
    notHelpful: 1
  },
  {
    id: 3,
    category: 'Product Information',
    question: 'Are ICEPACA ice packs safe and non-toxic?',
    answer: 'Absolutely! ICEPACA ice packs are made with food-safe TPU (Thermoplastic Polyurethane) and contain non-toxic gel that is safe for use around food and beverages. All our products are FDA approved and meet strict safety standards. The gel is biodegradable and environmentally friendly.',
    keywords: ['safe', 'non-toxic', 'FDA', 'food-safe', 'environmental', 'biodegradable'],
    helpful: 52,
    notHelpful: 0
  },
  {
    id: 4,
    category: 'Sustainability',
    question: 'How are ICEPACA ice packs better for the environment?',
    answer: 'ICEPACA ice packs are reusable up to 1,500+ times, eliminating the need for single-use ice. Each use saves approximately 0.5-2.0 kg of CO2 emissions compared to buying ice. Our packs are made from recyclable materials and the gel is biodegradable. After 5+ years of use, they can be recycled through appropriate channels.',
    keywords: ['environment', 'reusable', 'recyclable', 'CO2', 'sustainable', 'eco-friendly'],
    helpful: 41,
    notHelpful: 2
  },
  {
    id: 5,
    category: 'Usage & Care',
    question: 'Can I use ICEPACA ice packs for medical purposes?',
    answer: 'Yes! ICEPACA ice packs are excellent for injury treatment, post-workout recovery, and medical applications. The flexible material conforms to body contours when frozen. Always wrap in a thin towel when applying to skin to prevent ice burn. Not recommended for open wounds without proper medical guidance.',
    keywords: ['medical', 'injury', 'recovery', 'flexible', 'treatment', 'safety'],
    helpful: 29,
    notHelpful: 1
  },
  {
    id: 6,
    category: 'Product Information',
    question: 'What sizes of ICEPACA ice packs are available?',
    answer: 'We offer three sizes: Small (8"×6"×1", 0.75 lbs) perfect for lunch boxes, Medium (10"×8"×1.5", 1.25 lbs) ideal for coolers and picnics, and Large (12"×10"×2", 2.1 lbs) designed for marine use and extended adventures. We also offer the Adventure Bundle with all three sizes at a discounted price.',
    keywords: ['sizes', 'dimensions', 'small', 'medium', 'large', 'bundle', 'weight'],
    helpful: 34,
    notHelpful: 0
  },
  {
    id: 7,
    category: 'Orders & Shipping',
    question: 'How long does shipping take?',
    answer: 'We offer standard shipping (5-7 business days) for $8.99, and expedited shipping (2-3 business days) for $15.99. Orders over $50 qualify for free standard shipping. All orders are processed within 1-2 business days. You\'ll receive tracking information via email once your order ships.',
    keywords: ['shipping', 'delivery', 'tracking', 'processing', 'free shipping'],
    helpful: 28,
    notHelpful: 4
  },
  {
    id: 8,
    category: 'Orders & Shipping',
    question: 'What is your return policy?',
    answer: 'We offer a 30-day satisfaction guarantee. If you\'re not completely happy with your ICEPACA ice pack, you can return it for a full refund. Products must be in original condition. Return shipping is free for defective items. For non-defective returns, customers cover return shipping costs.',
    keywords: ['return', 'refund', 'guarantee', 'satisfaction', 'policy', 'defective'],
    helpful: 31,
    notHelpful: 2
  },
  {
    id: 9,
    category: 'Usage & Care',
    question: 'How do I clean my ICEPACA ice pack?',
    answer: 'Clean your ICEPACA ice pack with mild soap and warm water. The durable TPU material is easy to wipe clean. For deeper sanitization, use a 10:1 water-to-bleach solution. Rinse thoroughly and air dry before freezing. Do not put in dishwasher or expose to temperatures above 140°F (60°C).',
    keywords: ['clean', 'sanitize', 'care', 'maintenance', 'soap', 'bleach'],
    helpful: 26,
    notHelpful: 1
  },
  {
    id: 10,
    category: 'Product Information',
    question: 'What makes ICEPACA different from regular ice packs?',
    answer: 'ICEPACA ice packs are inspired by alpacas\' incredible temperature resilience. Our proprietary gel formula and marine-grade TPU construction provide superior cooling performance that lasts 2-3x longer than standard ice packs. Plus, they\'re leak-proof, flexible when frozen, and designed for 1,500+ uses.',
    keywords: ['difference', 'superior', 'alpaca', 'proprietary', 'leak-proof', 'flexible'],
    helpful: 48,
    notHelpful: 1
  }
];

// About page content
const aboutContent = {
  story: {
    title: 'The ICEPACA Story: Born from Nature\'s Resilience',
    content: `Our journey began with a simple observation: alpacas are incredible creatures that thrive in extreme temperature variations. From the frigid Andean nights to blazing mountain sun, these remarkable animals maintain their core temperature through amazing natural adaptations.

This inspired our founder, Dr. Sarah Chen, to ask: "What if we could harness that same resilience in a cooling solution?" After 10+ years of research and development, ICEPACA was born.

Our breakthrough came from studying how alpacas' fiber naturally regulates temperature and moisture. We developed a proprietary gel formula that mimics these properties, combined with marine-grade materials that withstand the toughest conditions.

Today, ICEPACA ice packs deliver superior cooling performance while being completely non-toxic, reusable up to 1,500+ times, and environmentally sustainable. Every pack saves countless trips to buy ice and reduces CO2 emissions by up to 2kg per use.

From lunch boxes to marine expeditions, ICEPACA keeps your adventures cool while protecting our planet.`,
    highlights: [
      '10+ years of scientific research and development',
      'Inspired by alpacas\' natural temperature resilience',
      'Proprietary gel formula for superior performance',
      'Non-toxic, FDA-approved materials',
      'Reusable 1,500+ times for ultimate sustainability',
      'Saves 0.5-2.0 kg CO2 emissions per use'
    ]
  },
  team: {
    title: 'Meet Our Team',
    members: [
      {
        name: 'Dr. Sarah Chen',
        role: 'Founder & Chief Innovation Officer',
        bio: 'Marine biologist turned materials scientist with a passion for biomimicry and sustainability.',
        image: '/images/team/sarah-chen.jpg'
      },
      {
        name: 'Marcus Rodriguez',
        role: 'Head of Product Development',
        bio: '15+ years in thermal engineering, specializing in phase-change materials and insulation.',
        image: '/images/team/marcus-rodriguez.jpg'
      },
      {
        name: 'Elena Vasquez',
        role: 'Sustainability Director',
        bio: 'Environmental engineer focused on circular economy and life-cycle assessment.',
        image: '/images/team/elena-vasquez.jpg'
      }
    ]
  },
  mission: 'To revolutionize cooling solutions through nature-inspired innovation while protecting our planet for future generations.',
  values: [
    'Innovation inspired by nature',
    'Environmental stewardship',
    'Superior performance and quality',
    'Transparency and honesty',
    'Customer-first approach'
  ]
};

// Get FAQ data
router.get('/faq', async (req: Request, res: Response) => {
  try {
    const { search, category } = req.query;
    let faqs = [...faqData];

    // Filter by category
    if (category && category !== 'all') {
      faqs = faqs.filter(faq => 
        faq.category.toLowerCase() === (category as string).toLowerCase()
      );
    }

    // Search functionality
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      faqs = faqs.filter(faq => 
        faq.question.toLowerCase().includes(searchTerm) ||
        faq.answer.toLowerCase().includes(searchTerm) ||
        faq.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
      );
    }

    // Get unique categories
    const categories = [...new Set(faqData.map(faq => faq.category))];

    res.json({
      success: true,
      faqs,
      categories,
      total: faqs.length
    });

  } catch (error: any) {
    console.error('Get FAQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQ data'
    });
  }
});

// Get specific FAQ by ID
router.get('/faq/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const faq = faqData.find(f => f.id === parseInt(id));

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    res.json({
      success: true,
      faq
    });

  } catch (error: any) {
    console.error('Get FAQ by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQ'
    });
  }
});

// Rate FAQ helpfulness
router.post('/faq/:id/helpful', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body; // true for helpful, false for not helpful
    
    const faqIndex = faqData.findIndex(f => f.id === parseInt(id));
    if (faqIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    // In production, you'd want to track user votes to prevent spam
    if (helpful === true) {
      faqData[faqIndex].helpful += 1;
    } else if (helpful === false) {
      faqData[faqIndex].notHelpful += 1;
    }

    res.json({
      success: true,
      helpful: faqData[faqIndex].helpful,
      notHelpful: faqData[faqIndex].notHelpful,
      message: 'Thank you for your feedback!'
    });

  } catch (error: any) {
    console.error('Rate FAQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record feedback'
    });
  }
});

// Get About page content
router.get('/about', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      about: aboutContent
    });

  } catch (error: any) {
    console.error('Get About content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch About content'
    });
  }
});

// User-generated content submission
router.post('/user-content', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { 
      type, // 'adventure_story', 'product_suggestion', 'testimonial'
      title, 
      content, 
      location,
      adventureType, // camping, fishing, marine, etc.
      productUsed,
      contactAllowed 
    } = req.body;

    // Validation
    if (!type || !title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Type, title, and content are required'
      });
    }

    const validTypes = ['adventure_story', 'product_suggestion', 'testimonial'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type'
      });
    }

    // In production, save to database
    const userContent = {
      id: Date.now(), // In production, use proper ID generation
      userId,
      type,
      title: title.trim(),
      content: content.trim(),
      location,
      adventureType,
      productUsed,
      contactAllowed: !!contactAllowed,
      status: 'pending', // pending, approved, rejected
      submittedAt: new Date(),
      approved: false,
      featured: false
    };

    // In production, you'd save this to your database
    // await UserContent.create(userContent);

    res.status(201).json({
      success: true,
      message: 'Thank you for sharing your story! We\'ll review it and may feature it on our website.',
      submissionId: userContent.id
    });

  } catch (error: any) {
    console.error('Submit user content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit content'
    });
  }
});

// Get featured user content (for homepage/marketing)
router.get('/user-content/featured', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 6;
    const type = req.query.type as string;

    // In production, fetch from database
    // For now, return mock data
    const featuredContent = [
      {
        id: 1,
        type: 'adventure_story',
        title: 'Three Days in Yellowstone',
        content: 'Our ICEPACA Large pack kept our food fresh for the entire backcountry trip. Even in 85°F heat, everything stayed perfectly cold!',
        author: 'Mike T.',
        location: 'Yellowstone National Park, WY',
        adventureType: 'camping',
        productUsed: 'Large Pack',
        submittedAt: new Date('2024-07-15'),
        featured: true
      },
      {
        id: 2,
        type: 'testimonial',
        title: 'Perfect for Marine Use',
        content: 'As a charter boat captain, I need cooling that works. ICEPACA packs outperform everything else I\'ve tried. They last all day even in direct sun.',
        author: 'Captain Sarah M.',
        location: 'Key West, FL',
        adventureType: 'marine',
        productUsed: 'Large Pack',
        submittedAt: new Date('2024-07-20'),
        featured: true
      },
      {
        id: 3,
        type: 'adventure_story',
        title: 'Kids\' Soccer Tournament Success',
        content: 'Used the Medium pack to keep drinks cold during a weekend tournament. Parents were amazed it was still working after 12 hours in 90°F weather!',
        author: 'Jennifer L.',
        location: 'Phoenix, AZ',
        adventureType: 'sports',
        productUsed: 'Medium Pack',
        submittedAt: new Date('2024-07-10'),
        featured: true
      }
    ];

    let content = [...featuredContent];

    // Filter by type if specified
    if (type && type !== 'all') {
      content = content.filter(c => c.type === type);
    }

    // Limit results
    content = content.slice(0, limit);

    res.json({
      success: true,
      content
    });

  } catch (error: any) {
    console.error('Get featured content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured content'
    });
  }
});

// Newsletter signup with incentive
router.post('/newsletter-signup', async (req: Request, res: Response) => {
  try {
    const { email, firstName, source, incentive } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // In production, save to database and send to email service
    const subscription = {
      email: email.toLowerCase().trim(),
      firstName: firstName?.trim(),
      source: source || 'popup', // popup, footer, checkout, etc.
      incentive: incentive || '10% off first order',
      subscribedAt: new Date(),
      active: true,
      discountCode: `WELCOME${Math.random().toString(36).substring(2, 8).toUpperCase()}` // Generate unique code
    };

    // In production:
    // 1. Save to database
    // 2. Send welcome email with discount code
    // 3. Add to email marketing service (Mailchimp, Klaviyo, etc.)

    res.json({
      success: true,
      message: 'Welcome to the ICEPACA family! Check your email for your 10% discount code.',
      discountCode: subscription.discountCode
    });

  } catch (error: any) {
    console.error('Newsletter signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sign up for newsletter'
    });
  }
});

export default router;