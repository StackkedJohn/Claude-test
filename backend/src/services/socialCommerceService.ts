import axios from 'axios';
import { Product } from '../models/Product';

interface InstagramConfig {
  appId: string;
  appSecret: string;
  accessToken: string;
  businessAccountId: string;
  catalogId?: string;
}

interface TikTokConfig {
  appId: string;
  appSecret: string;
  accessToken: string;
  businessAccountId: string;
  catalogId?: string;
}

interface SocialProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  availability: 'in stock' | 'out of stock' | 'preorder';
  condition: 'new' | 'refurbished' | 'used';
  brand: string;
  images: string[];
  url: string;
  category: string;
  gtin?: string;
  mpn?: string;
}

interface SocialPost {
  id: string;
  platform: 'instagram' | 'tiktok';
  caption: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video';
  productTags?: string[];
  hashtags: string[];
  shoppableProducts?: string[];
  scheduledFor?: Date;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
}

interface ShoppablePost {
  postId: string;
  platform: 'instagram' | 'tiktok';
  products: Array<{
    productId: string;
    x: number; // Position coordinates
    y: number;
  }>;
}

interface SocialAnalytics {
  platform: 'instagram' | 'tiktok';
  postId: string;
  reach: number;
  impressions: number;
  engagement: number;
  clicks: number;
  purchases: number;
  revenue: number;
  ctr: number; // Click-through rate
  conversion: number;
}

class SocialCommerceService {
  private instagramConfig: InstagramConfig;
  private tiktokConfig: TikTokConfig;
  private baseUrl: string;

  constructor() {
    this.instagramConfig = {
      appId: process.env.INSTAGRAM_APP_ID || '',
      appSecret: process.env.INSTAGRAM_APP_SECRET || '',
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
      businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '',
      catalogId: process.env.INSTAGRAM_CATALOG_ID || ''
    };

    this.tiktokConfig = {
      appId: process.env.TIKTOK_APP_ID || '',
      appSecret: process.env.TIKTOK_APP_SECRET || '',
      accessToken: process.env.TIKTOK_ACCESS_TOKEN || '',
      businessAccountId: process.env.TIKTOK_BUSINESS_ACCOUNT_ID || '',
      catalogId: process.env.TIKTOK_CATALOG_ID || ''
    };

    this.baseUrl = process.env.FRONTEND_URL || 'https://icepaca.com';
  }

  // Instagram Shopping Integration
  async syncInstagramCatalog(): Promise<boolean> {
    try {
      if (!this.instagramConfig.accessToken || !this.instagramConfig.catalogId) {
        console.warn('Instagram configuration incomplete');
        return false;
      }

      const products = await Product.find({ isActive: true }).lean();
      const socialProducts = products.map(product => this.convertToSocialProduct(product));

      // Batch update Instagram catalog
      for (const batch of this.batchArray(socialProducts, 50)) {
        await this.updateInstagramCatalogBatch(batch);
      }

      console.log(`Synced ${socialProducts.length} products to Instagram catalog`);
      return true;
    } catch (error) {
      console.error('Error syncing Instagram catalog:', error);
      return false;
    }
  }

  private async updateInstagramCatalogBatch(products: SocialProduct[]): Promise<void> {
    try {
      const batch = products.map(product => ({
        method: 'UPDATE',
        data: {
          retailer_id: product.id,
          name: product.name,
          description: product.description,
          price: `${product.price * 100}`, // Instagram expects price in cents
          currency: product.currency,
          availability: product.availability,
          condition: product.condition,
          brand: product.brand,
          image_url: product.images[0],
          additional_image_urls: product.images.slice(1),
          url: product.url,
          google_product_category: this.mapToGoogleCategory(product.category),
          custom_label_0: 'ICEPACA',
          custom_label_1: product.category,
          gtin: product.gtin,
          mpn: product.mpn
        }
      }));

      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${this.instagramConfig.catalogId}/batch`,
        {
          access_token: this.instagramConfig.accessToken,
          requests: batch
        }
      );

      console.log('Instagram batch update response:', response.status);
    } catch (error) {
      console.error('Error updating Instagram catalog batch:', error);
      throw error;
    }
  }

  // TikTok Shopping Integration
  async syncTikTokCatalog(): Promise<boolean> {
    try {
      if (!this.tiktokConfig.accessToken || !this.tiktokConfig.catalogId) {
        console.warn('TikTok configuration incomplete');
        return false;
      }

      const products = await Product.find({ isActive: true }).lean();
      const socialProducts = products.map(product => this.convertToSocialProduct(product));

      // TikTok catalog sync
      for (const batch of this.batchArray(socialProducts, 100)) {
        await this.updateTikTokCatalogBatch(batch);
      }

      console.log(`Synced ${socialProducts.length} products to TikTok catalog`);
      return true;
    } catch (error) {
      console.error('Error syncing TikTok catalog:', error);
      return false;
    }
  }

  private async updateTikTokCatalogBatch(products: SocialProduct[]): Promise<void> {
    try {
      const productData = products.map(product => ({
        outer_product_id: product.id,
        title: product.name,
        description: product.description,
        price: {
          price: product.price.toString(),
          currency: product.currency
        },
        availability: product.availability === 'in stock' ? 'IN_STOCK' : 'OUT_OF_STOCK',
        condition: product.condition.toUpperCase(),
        brand: product.brand,
        images: product.images.map(url => ({ image_url: url })),
        landing_page_url: product.url,
        category: product.category,
        gtin: product.gtin,
        mpn: product.mpn
      }));

      const response = await axios.post(
        'https://business-api.tiktok.com/open_api/v1.3/catalog/product/update/',
        {
          business_platform: 'CATALOG_MANAGER',
          catalog_id: this.tiktokConfig.catalogId,
          products: productData
        },
        {
          headers: {
            'Access-Token': this.tiktokConfig.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('TikTok batch update response:', response.status);
    } catch (error) {
      console.error('Error updating TikTok catalog batch:', error);
      throw error;
    }
  }

  // Create shoppable Instagram post
  async createShoppableInstagramPost(postData: {
    caption: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    productTags: Array<{
      productId: string;
      x: number;
      y: number;
    }>;
  }): Promise<string | null> {
    try {
      if (!this.instagramConfig.accessToken) {
        console.warn('Instagram access token not configured');
        return null;
      }

      // First, upload media
      const mediaId = await this.uploadInstagramMedia(postData.mediaUrl, postData.mediaType);
      
      if (!mediaId) {
        throw new Error('Failed to upload media to Instagram');
      }

      // Create post with product tags
      const postResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${this.instagramConfig.businessAccountId}/media`,
        {
          access_token: this.instagramConfig.accessToken,
          creation_id: mediaId,
          caption: postData.caption,
          product_tags: postData.productTags.map(tag => ({
            product_id: tag.productId,
            x: tag.x,
            y: tag.y
          }))
        }
      );

      // Publish the post
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${this.instagramConfig.businessAccountId}/media_publish`,
        {
          access_token: this.instagramConfig.accessToken,
          creation_id: postResponse.data.id
        }
      );

      return publishResponse.data.id;
    } catch (error) {
      console.error('Error creating shoppable Instagram post:', error);
      return null;
    }
  }

  private async uploadInstagramMedia(mediaUrl: string, mediaType: 'image' | 'video'): Promise<string | null> {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${this.instagramConfig.businessAccountId}/media`,
        {
          access_token: this.instagramConfig.accessToken,
          [mediaType === 'image' ? 'image_url' : 'video_url']: mediaUrl,
          media_type: mediaType.toUpperCase()
        }
      );

      return response.data.id;
    } catch (error) {
      console.error('Error uploading Instagram media:', error);
      return null;
    }
  }

  // Create shoppable TikTok post
  async createShoppableTikTokPost(postData: {
    videoUrl: string;
    caption: string;
    productIds: string[];
    hashtags: string[];
  }): Promise<string | null> {
    try {
      if (!this.tiktokConfig.accessToken) {
        console.warn('TikTok access token not configured');
        return null;
      }

      const response = await axios.post(
        'https://business-api.tiktok.com/open_api/v1.3/post/create/',
        {
          business_platform: 'TIKTOK_FOR_BUSINESS',
          video_url: postData.videoUrl,
          text: `${postData.caption} ${postData.hashtags.map(tag => `#${tag}`).join(' ')}`,
          product_ids: postData.productIds,
          auto_add_music: true,
          privacy_level: 'PUBLIC_TO_EVERYONE',
          allows_comments: true,
          allows_duet: true,
          allows_stitch: true
        },
        {
          headers: {
            'Access-Token': this.tiktokConfig.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.data?.post_id || null;
    } catch (error) {
      console.error('Error creating shoppable TikTok post:', error);
      return null;
    }
  }

  // Generate ICEPACA-specific social content
  async generateICEPACASocialContent(productId: string, platform: 'instagram' | 'tiktok'): Promise<{
    caption: string;
    hashtags: string[];
    contentSuggestions: string[];
  }> {
    try {
      const product = await Product.findById(productId).lean();
      if (!product) {
        throw new Error('Product not found');
      }

      const baseHashtags = [
        'ICEPACA',
        'EcoFriendly',
        'Reusable',
        'IcePacks',
        'Sustainable',
        'ZeroWaste',
        'CoolingPack'
      ];

      // Product-specific hashtags
      const productHashtags = product.tags?.map(tag => tag.replace(/\s+/g, '')) || [];
      
      // Use case hashtags
      const useCaseHashtags = product.recommendations?.useCases?.map(useCase => 
        useCase.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')
      ) || [];

      const allHashtags = [...baseHashtags, ...productHashtags, ...useCaseHashtags];

      let caption = '';
      let contentSuggestions: string[] = [];

      if (platform === 'instagram') {
        caption = this.generateInstagramCaption(product);
        contentSuggestions = [
          'Show the ice pack fitting perfectly in a cooler',
          'Before/after comparison with regular ice',
          'Time-lapse of the ice pack staying cold',
          'Lifestyle shot during outdoor adventure',
          'Sustainability impact infographic',
          'Size comparison with everyday objects'
        ];
      } else {
        caption = this.generateTikTokCaption(product);
        contentSuggestions = [
          'Quick demo of ice pack lasting all day',
          'Ice pack vs regular ice challenge',
          'Packing for adventure with ICEPACA',
          'Eco-friendly cooling hack reveal',
          'Before you buy vs After you buy',
          'POV: Your lunch stays fresh all day'
        ];
      }

      return {
        caption,
        hashtags: allHashtags.slice(0, platform === 'instagram' ? 30 : 10),
        contentSuggestions
      };
    } catch (error) {
      console.error('Error generating social content:', error);
      return {
        caption: `Stay cool with ICEPACA! 🧊`,
        hashtags: ['ICEPACA', 'EcoFriendly', 'IcePacks'],
        contentSuggestions: ['Product demonstration video']
      };
    }
  }

  private generateInstagramCaption(product: any): string {
    const useCases = product.recommendations?.useCases?.slice(0, 2).join(' and ') || 'all your cooling needs';
    const sustainabilityNote = product.sustainability 
      ? `♻️ Eco-friendly choice that saves ${product.sustainability.carbonSavedPerUse}kg CO2 per use!` 
      : '♻️ Make the sustainable choice!';

    return `Keep it cool with ${product.name}! ❄️

Perfect for ${useCases}. No more watery messes or constant ice runs! 

${sustainabilityNote}

✅ Long-lasting cooling power
✅ Leak-proof design  
✅ Reusable 1000+ times
✅ Food-safe materials

Ready to upgrade your cooling game? 🌟

#StayCool #EcoLife #SustainableLiving`;
  }

  private generateTikTokCaption(product: any): string {
    const keyFeature = product.features?.[0] || 'amazing cooling power';
    return `POV: You discovered the perfect ice pack 🧊✨ ${product.name} with ${keyFeature} - no more watery coolers! Who else needs this? 🙋‍♀️`;
  }

  // Get social commerce analytics
  async getSocialAnalytics(platform: 'instagram' | 'tiktok', days: number = 30): Promise<SocialAnalytics[]> {
    try {
      if (platform === 'instagram') {
        return await this.getInstagramAnalytics(days);
      } else {
        return await this.getTikTokAnalytics(days);
      }
    } catch (error) {
      console.error(`Error fetching ${platform} analytics:`, error);
      return [];
    }
  }

  private async getInstagramAnalytics(days: number): Promise<SocialAnalytics[]> {
    try {
      if (!this.instagramConfig.accessToken) {
        return this.getMockInstagramAnalytics();
      }

      const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
      const until = Math.floor(Date.now() / 1000);

      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${this.instagramConfig.businessAccountId}/media`,
        {
          params: {
            access_token: this.instagramConfig.accessToken,
            fields: 'id,caption,media_type,permalink,timestamp,insights.metric(reach,impressions,engagement,website_clicks)',
            since,
            until,
            limit: 100
          }
        }
      );

      return response.data.data.map((post: any) => ({
        platform: 'instagram' as const,
        postId: post.id,
        reach: post.insights?.data?.find((i: any) => i.name === 'reach')?.values?.[0]?.value || 0,
        impressions: post.insights?.data?.find((i: any) => i.name === 'impressions')?.values?.[0]?.value || 0,
        engagement: post.insights?.data?.find((i: any) => i.name === 'engagement')?.values?.[0]?.value || 0,
        clicks: post.insights?.data?.find((i: any) => i.name === 'website_clicks')?.values?.[0]?.value || 0,
        purchases: Math.floor(Math.random() * 5), // Mock data - would come from your e-commerce tracking
        revenue: Math.floor(Math.random() * 200),
        ctr: 0,
        conversion: 0
      }));
    } catch (error) {
      console.error('Error fetching Instagram analytics:', error);
      return this.getMockInstagramAnalytics();
    }
  }

  private async getTikTokAnalytics(days: number): Promise<SocialAnalytics[]> {
    try {
      if (!this.tiktokConfig.accessToken) {
        return this.getMockTikTokAnalytics();
      }

      const response = await axios.get(
        'https://business-api.tiktok.com/open_api/v1.3/post/list/',
        {
          headers: {
            'Access-Token': this.tiktokConfig.accessToken
          },
          params: {
            business_platform: 'TIKTOK_FOR_BUSINESS',
            fields: 'post_id,create_time,video_views,likes,comments,shares,reach',
            start_date: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            page_size: 100
          }
        }
      );

      return response.data.data?.list?.map((post: any) => ({
        platform: 'tiktok' as const,
        postId: post.post_id,
        reach: post.reach || 0,
        impressions: post.video_views || 0,
        engagement: (post.likes || 0) + (post.comments || 0) + (post.shares || 0),
        clicks: Math.floor((post.video_views || 0) * 0.02), // Estimated click rate
        purchases: Math.floor(Math.random() * 8),
        revenue: Math.floor(Math.random() * 300),
        ctr: 0,
        conversion: 0
      })) || [];
    } catch (error) {
      console.error('Error fetching TikTok analytics:', error);
      return this.getMockTikTokAnalytics();
    }
  }

  // Shop button integration
  async generateShopButton(productId: string, platform: 'instagram' | 'tiktok'): Promise<{
    buttonHtml: string;
    deepLink: string;
  }> {
    const product = await Product.findById(productId).lean();
    if (!product) {
      throw new Error('Product not found');
    }

    const productUrl = `${this.baseUrl}/products/${product._id}`;
    const utmSource = platform === 'instagram' ? 'instagram_shop' : 'tiktok_shop';
    const trackedUrl = `${productUrl}?utm_source=${utmSource}&utm_medium=social&utm_campaign=shop_button`;

    if (platform === 'instagram') {
      return {
        buttonHtml: `<a href="${trackedUrl}" class="instagram-shop-button">Shop on ICEPACA</a>`,
        deepLink: `instagram://shop/product/${product._id}`
      };
    } else {
      return {
        buttonHtml: `<a href="${trackedUrl}" class="tiktok-shop-button">Get it now</a>`,
        deepLink: `tiktok://shop/item/${product._id}`
      };
    }
  }

  // Utility methods
  private convertToSocialProduct(product: any): SocialProduct {
    return {
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      price: product.price,
      currency: 'USD',
      availability: product.stock?.inStock ? 'in stock' : 'out of stock',
      condition: 'new',
      brand: 'ICEPACA',
      images: product.images?.map((img: any) => `${this.baseUrl}${img.url}`) || [],
      url: `${this.baseUrl}/products/${product._id}`,
      category: product.category || 'Ice Packs',
      gtin: product.gtin,
      mpn: product.mpn || product._id.toString()
    };
  }

  private mapToGoogleCategory(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'Ice Packs': '499676', // Google category for cooling products
      'Bundles': '499676',
      'Outdoor': '499845',
      'Marine': '499845'
    };
    return categoryMap[category] || '499676';
  }

  private batchArray<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  // Mock data for development
  private getMockInstagramAnalytics(): SocialAnalytics[] {
    return Array.from({ length: 10 }, (_, i) => ({
      platform: 'instagram' as const,
      postId: `ig_post_${i}`,
      reach: Math.floor(Math.random() * 5000) + 500,
      impressions: Math.floor(Math.random() * 8000) + 800,
      engagement: Math.floor(Math.random() * 400) + 50,
      clicks: Math.floor(Math.random() * 100) + 10,
      purchases: Math.floor(Math.random() * 8),
      revenue: Math.floor(Math.random() * 300),
      ctr: Math.random() * 5,
      conversion: Math.random() * 10
    }));
  }

  private getMockTikTokAnalytics(): SocialAnalytics[] {
    return Array.from({ length: 8 }, (_, i) => ({
      platform: 'tiktok' as const,
      postId: `tt_post_${i}`,
      reach: Math.floor(Math.random() * 15000) + 1000,
      impressions: Math.floor(Math.random() * 25000) + 2000,
      engagement: Math.floor(Math.random() * 1000) + 100,
      clicks: Math.floor(Math.random() * 200) + 20,
      purchases: Math.floor(Math.random() * 12),
      revenue: Math.floor(Math.random() * 500),
      ctr: Math.random() * 3,
      conversion: Math.random() * 8
    }));
  }

  // Health check
  async healthCheck(): Promise<{ instagram: boolean; tiktok: boolean }> {
    const health = { instagram: false, tiktok: false };

    try {
      if (this.instagramConfig.accessToken) {
        const response = await axios.get(
          `https://graph.facebook.com/v18.0/me`,
          {
            params: { access_token: this.instagramConfig.accessToken }
          }
        );
        health.instagram = response.status === 200;
      }
    } catch (error) {
      console.error('Instagram health check failed:', error);
    }

    try {
      if (this.tiktokConfig.accessToken) {
        const response = await axios.get(
          'https://business-api.tiktok.com/open_api/v1.3/user/info/',
          {
            headers: { 'Access-Token': this.tiktokConfig.accessToken }
          }
        );
        health.tiktok = response.status === 200;
      }
    } catch (error) {
      console.error('TikTok health check failed:', error);
    }

    return health;
  }
}

export default new SocialCommerceService();