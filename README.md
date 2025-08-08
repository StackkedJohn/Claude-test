# ICEPACA E-commerce Website

A full-stack e-commerce website for ICEPACA - Revolutionary Reusable Ice Packs. Built with React frontend and Node.js backend, featuring a mobile-first design, PWA capabilities, and comprehensive accessibility features.

## 🦙 Features

### Frontend (React + TypeScript)
- **Responsive Design**: Mobile-first approach with CSS Grid and Flexbox
- **Hero Banner**: Animated alpaca mascot with ice cube effects
- **Shop Page**: Bento grid layout with 4 ICEPACA products (Small $10, Medium $15, Large $20, Adventure Bundle $45)
- **Product Cards**: High-res images with stock indicators, pricing, and frosty hover animations
- **Shopping Cart**: Real-time cart management with session persistence
- **Global Search**: Autocomplete functionality with voice search support
- **Personalized Recommendations**: CRO-optimized product suggestions based on cart contents
- **PWA Support**: Offline access, installable app, service worker caching
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **SEO Optimized**: Meta tags, structured data, sitemap generation
- **Performance**: Lazy loading, image compression, <2s load time target
- **Admin Dashboard**: Inventory management with real-time alerts

### Backend (Node.js + Express + MongoDB)
- **MongoDB Database**: Complete product catalog with inventory tracking
- **RESTful API**: Products, cart, and inventory management endpoints
- **Real-time Stock Tracking**: Automatic low-stock and out-of-stock alerts
- **Email Notifications**: Admin alerts for inventory issues
- **Shopping Cart API**: Session-based cart with stock reservation
- **Admin Dashboard API**: Product management and analytics
- **TypeScript**: Type-safe backend development
- **Security**: Helmet.js, CORS, compression middleware

### Design System
- **Color Scheme**: Light blue (#ADD8E6), Dark blue (#00008B), White (#FFFFFF)
- **Typography**: Poppins font family with ice-themed effects
- **Animations**: Floating elements, shimmer effects, 3D ice drips
- **Icons**: Emoji-based icons for better cross-platform compatibility

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd icepaca-ecommerce
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd ../backend
   npm install
   ```

4. **Set up MongoDB**
   - Install MongoDB locally or use MongoDB Atlas
   - Copy `backend/.env.example` to `backend/.env` and configure your database URL

### Development

1. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

2. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Backend runs on http://localhost:5000

3. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm start
   ```
   Frontend runs on http://localhost:3000

4. **Access Admin Dashboard**
   Navigate to http://localhost:3000/admin
   Login with: `admin` / `admin123`

### Production Build

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Build Backend**
   ```bash
   cd backend
   npm run build
   ```

## 📁 Project Structure

```
icepaca-ecommerce/
├── frontend/
│   ├── public/
│   │   ├── manifest.json          # PWA manifest
│   │   ├── sw.js                  # Service worker
│   │   └── sitemap.xml           # SEO sitemap
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navigation.tsx     # Responsive nav bar with cart badge
│   │   │   ├── HeroBanner.tsx     # Animated hero section
│   │   │   ├── FeatureGrid.tsx    # Bento grid layout
│   │   │   ├── SearchBar.tsx      # Global search with autocomplete
│   │   │   ├── ProductCard.tsx    # Product cards with stock indicators
│   │   │   ├── Footer.tsx         # Footer with social links
│   │   │   ├── SEOHead.tsx        # SEO meta tags
│   │   │   └── LazyImage.tsx      # Performance optimized images
│   │   ├── pages/
│   │   │   ├── Home.tsx          # Homepage with hero and features
│   │   │   ├── Shop.tsx          # Shop page with product grid
│   │   │   └── AdminDashboard.tsx # Admin inventory management
│   │   ├── contexts/
│   │   │   └── CartContext.tsx   # Shopping cart state management
│   │   ├── styles/
│   │   │   └── GlobalStyles.ts   # Styled-components global styles
│   │   ├── utils/
│   │   │   ├── swRegistration.ts # PWA service worker utils
│   │   │   └── performance.ts    # Performance optimization utils
│   │   └── App.tsx              # Main app with routing
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── Product.ts        # Product schema with inventory
│   │   │   ├── Cart.ts          # Shopping cart schema
│   │   │   └── AdminAlert.ts    # Admin alerts schema
│   │   ├── routes/
│   │   │   ├── products.ts      # Product API endpoints
│   │   │   ├── cart.ts          # Cart management endpoints
│   │   │   └── admin.ts         # Admin dashboard endpoints
│   │   ├── services/
│   │   │   └── alertService.ts  # Real-time stock monitoring
│   │   └── server.ts           # Express server with MongoDB
│   ├── .env.example            # Environment configuration template
│   ├── tsconfig.json
│   └── package.json
└── README.md
```

## 🔧 Key Technologies

### Frontend
- **React 19**: Latest React with concurrent features
- **TypeScript**: Type safety and better developer experience
- **Styled Components**: CSS-in-JS with theme support
- **Framer Motion**: Smooth animations and transitions
- **React Helmet Async**: SEO and meta tag management
- **React Router DOM**: Client-side routing
- **Web Vitals**: Performance monitoring

### Backend
- **Express.js**: Fast, unopinionated web framework
- **TypeScript**: Type-safe server development
- **Helmet**: Security middleware
- **CORS**: Cross-origin resource sharing
- **Compression**: Response compression
- **Morgan**: HTTP request logger

## 🎨 Design Features

- **Alpaca Mascot**: Floating animated alpaca with ice cube
- **Ice Effects**: Shimmer animations, frost gradients, 3D drip effects
- **Bento Grid**: Modern card layout for feature showcase
- **Frosty Gradients**: Subtle ice-themed background effects
- **Responsive Typography**: Scalable text with proper contrast ratios

## ♿ Accessibility

- **ARIA Labels**: Proper semantic markup
- **Keyboard Navigation**: Full keyboard accessibility
- **Voice Search**: Speech recognition support
- **Screen Reader**: Optimized for assistive technologies
- **High Contrast**: Support for high contrast mode
- **Reduced Motion**: Respects user motion preferences

## ⚡ Performance Optimizations

- **Lazy Loading**: Images and components load on demand
- **Service Worker**: Caching and offline functionality
- **Code Splitting**: Dynamic imports for better loading
- **Image Compression**: Optimized image delivery
- **Font Optimization**: Preloaded critical fonts
- **Bundle Analysis**: Webpack bundle size monitoring

## 🔍 SEO Features

- **Meta Tags**: Comprehensive Open Graph and Twitter Cards
- **Structured Data**: JSON-LD schema markup
- **Sitemap**: XML sitemap for search engines
- **Robots.txt**: Search engine crawling instructions
- **Canonical URLs**: Proper URL canonicalization

## 📱 PWA Features

- **Installable**: Add to home screen capability
- **Offline Access**: Service worker caching
- **Push Notifications**: Web push support
- **Background Sync**: Offline form submissions
- **App Manifest**: Native app-like experience

## 🧪 Testing & Quality

- **Performance Budget**: <2 second load time target
- **Lighthouse Scoring**: 90+ scores across all metrics
- **Web Vitals**: Core Web Vitals monitoring
- **Cross-browser**: Support for modern browsers
- **Mobile Testing**: Responsive design validation

## 📊 Analytics & Monitoring

- **Web Vitals**: Performance metrics collection
- **Error Tracking**: Error boundary implementation
- **User Analytics**: Custom event tracking
- **Performance Monitoring**: Real-time performance data

## 🔒 Security

- **Helmet.js**: Security headers
- **CORS**: Cross-origin protection
- **Input Validation**: XSS and injection prevention
- **HTTPS**: Secure communication
- **CSP**: Content Security Policy headers

## 🚀 Deployment

The application is production-ready and can be deployed to:
- **Frontend**: Vercel, Netlify, AWS S3 + CloudFront
- **Backend**: Heroku, AWS EC2, DigitalOcean
- **Database**: MongoDB Atlas, PostgreSQL
- **CDN**: Cloudflare, AWS CloudFront

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, email hello@icepaca.com or visit our contact page.

---

**ICEPACA** - Keep it cool, keep it sustainable! 🦙❄️