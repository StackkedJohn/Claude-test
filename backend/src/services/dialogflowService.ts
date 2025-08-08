import { SessionsClient, protos } from '@google-cloud/dialogflow';

interface DialogflowResponse {
  fulfillmentText: string;
  intent: {
    name: string;
    displayName: string;
    confidence: number;
  };
  parameters: { [key: string]: any };
  suggestions?: string[];
  products?: Array<{
    id: string;
    name: string;
    price: number;
    image: string;
  }>;
}

class DialogflowService {
  private sessionsClient: SessionsClient | null = null;
  private projectId: string;
  private sessionId: string;
  private languageCode: string;

  constructor() {
    this.projectId = process.env.DIALOGFLOW_PROJECT_ID || 'icepaca-chatbot';
    this.sessionId = 'default-session';
    this.languageCode = 'en-US';

    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      // Initialize Dialogflow client
      // In production, use service account credentials
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.DIALOGFLOW_PRIVATE_KEY) {
        const config: any = {};
        
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          config.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        } else if (process.env.DIALOGFLOW_PRIVATE_KEY) {
          config.credentials = {
            private_key: process.env.DIALOGFLOW_PRIVATE_KEY.replace(/\\n/g, '\n'),
            client_email: process.env.DIALOGFLOW_CLIENT_EMAIL
          };
        }

        this.sessionsClient = new SessionsClient(config);
        console.log('Dialogflow client initialized successfully');
      } else {
        console.warn('Dialogflow credentials not found. Using fallback responses.');
      }
    } catch (error) {
      console.error('Failed to initialize Dialogflow client:', error);
    }
  }

  // Process user message through Dialogflow
  async processMessage(
    message: string, 
    userId: string = 'default-user', 
    context?: { [key: string]: any }
  ): Promise<DialogflowResponse> {
    try {
      if (this.sessionsClient) {
        return await this.processWithDialogflow(message, userId, context);
      } else {
        return await this.processWithFallback(message, context);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      return this.getErrorResponse();
    }
  }

  private async processWithDialogflow(
    message: string, 
    userId: string, 
    context?: { [key: string]: any }
  ): Promise<DialogflowResponse> {
    if (!this.sessionsClient) {
      throw new Error('Dialogflow client not initialized');
    }

    // Create session path
    const sessionPath = this.sessionsClient.projectAgentSessionPath(
      this.projectId, 
      `${userId}-${this.sessionId}`
    );

    // Build request
    const request: protos.google.cloud.dialogflow.v2.IDetectIntentRequest = {
      session: sessionPath,
      queryInput: {
        text: {
          text: message,
          languageCode: this.languageCode,
        },
      },
    };

    // Add context parameters if provided
    if (context) {
      request.queryParams = {
        contexts: [{
          name: `${sessionPath}/contexts/user-context`,
          lifespanCount: 5,
          parameters: context
        }]
      };
    }

    // Send request to Dialogflow
    const [response] = await this.sessionsClient.detectIntent(request);
    
    return this.formatDialogflowResponse(response);
  }

  private formatDialogflowResponse(response: protos.google.cloud.dialogflow.v2.IDetectIntentResponse): DialogflowResponse {
    const result = response.queryResult;
    
    if (!result) {
      return this.getErrorResponse();
    }

    const intent = result.intent;
    const parameters = result.parameters;
    const fulfillmentText = result.fulfillmentText || 'I apologize, but I didn\'t understand that.';

    // Extract custom payload for product recommendations
    let suggestions: string[] | undefined;
    let products: any[] | undefined;

    if (result.fulfillmentMessages) {
      for (const message of result.fulfillmentMessages) {
        if (message.payload) {
          const payload = message.payload as any;
          suggestions = payload.suggestions;
          products = payload.products;
        }
      }
    }

    return {
      fulfillmentText,
      intent: {
        name: intent?.name || '',
        displayName: intent?.displayName || 'Default Fallback Intent',
        confidence: result.intentDetectionConfidence || 0
      },
      parameters: parameters || {},
      suggestions,
      products
    };
  }

  // Fallback processing when Dialogflow is not available
  private async processWithFallback(
    message: string, 
    context?: { [key: string]: any }
  ): Promise<DialogflowResponse> {
    const lowerMessage = message.toLowerCase();
    
    // Intent detection patterns
    const intents = [
      {
        name: 'puncture.resistance',
        patterns: ['puncture', 'resistant', 'durable', 'tough', 'strong'],
        response: "ICEPACA packs are extremely puncture-resistant! They feature multi-layer construction with a reinforced outer shell that can withstand over 50 pounds of pressure. They're designed for rugged outdoor use and won't leak even under tough conditions.",
        suggestions: ['What materials are used?', 'How long is the warranty?', 'Can they handle freezing?']
      },
      {
        name: 'product.sizing',
        patterns: ['size', 'fit', 'dimensions', 'cooler', 'big', 'small'],
        response: "I can help you find the perfect size! We offer:\n• Small (6\"×4\"×1\"): Lunch boxes, small coolers\n• Medium (10\"×6\"×1.5\"): Day trips, medium coolers  \n• Large (12\"×8\"×2\"): Camping, large coolers\n\nWould you like to try our AR preview to see which fits your cooler?",
        suggestions: ['Try AR preview', 'Show all sizes', 'Size recommendations'],
        products: [
          { id: '1', name: 'Small ICEPACA Pack', price: 14.99, image: '/images/small-pack.jpg' },
          { id: '2', name: 'Medium ICEPACA Pack', price: 24.99, image: '/images/medium-pack.jpg' },
          { id: '3', name: 'Large ICEPACA Pack', price: 34.99, image: '/images/large-pack.jpg' }
        ]
      },
      {
        name: 'cooling.performance',
        patterns: ['cold', 'cool', 'temperature', 'freeze', 'chill', 'last', 'duration'],
        response: "ICEPACA packs provide excellent cooling:\n• Small: 4-6 hours\n• Medium: 8-12 hours\n• Large: 12-18 hours\n\nThey freeze solid in 4-6 hours and maintain temperatures below 40°F. Performance varies with external temperature and cooler insulation.",
        suggestions: ['How to prepare them?', 'Can they be refrozen?', 'Storage tips']
      },
      {
        name: 'safety.food',
        patterns: ['safe', 'food', 'toxic', 'bpa', 'children', 'baby', 'contact'],
        response: "Yes, completely safe! ICEPACA packs are:\n• 100% food-safe and BPA-free\n• FDA-approved materials\n• Non-toxic gel safe even if punctured\n• CPSIA compliant for children\n• Perfect for lunch boxes and baby bottles!",
        suggestions: ['What\'s in the gel?', 'Dishwasher safe?', 'Kids safety features']
      },
      {
        name: 'pricing.cost',
        patterns: ['price', 'cost', 'expensive', 'cheap', 'discount', 'sale', 'money'],
        response: "Our competitive pricing:\n• Small: $14.99\n• Medium: $24.99\n• Large: $34.99\n\nIncludes:\n• Free shipping on $50+\n• Bulk discounts available\n• 30-day money-back guarantee\n• 2-year warranty",
        suggestions: ['Bulk pricing', 'Current promotions', 'Payment options']
      },
      {
        name: 'environmental.impact',
        patterns: ['eco', 'environment', 'sustainable', 'green', 'recycle', 'planet'],
        response: "We're environmentally committed!\n• Reusable 1000+ times\n• 90% less waste vs disposable ice\n• Made from recyclable materials\n• Renewable energy manufacturing\n• Carbon-neutral shipping available\n\nEach pack prevents hundreds of plastic bags from landfills!",
        suggestions: ['Recycling program', 'Carbon footprint', 'Eco packaging']
      }
    ];

    // Find matching intent
    let matchedIntent = intents.find(intent => 
      intent.patterns.some(pattern => lowerMessage.includes(pattern))
    );

    if (!matchedIntent) {
      matchedIntent = {
        name: 'default.fallback',
        patterns: [],
        response: "I'd be happy to help! I can answer questions about ICEPACA ice packs including sizes, cooling performance, durability, pricing, and more. What would you like to know?",
        suggestions: ['Product sizes', 'Puncture resistance', 'Cooling duration', 'Safety info']
      };
    }

    return {
      fulfillmentText: matchedIntent.response,
      intent: {
        name: matchedIntent.name,
        displayName: matchedIntent.name.replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        confidence: matchedIntent.name === 'default.fallback' ? 0.5 : 0.9
      },
      parameters: this.extractParameters(message, matchedIntent.name),
      suggestions: matchedIntent.suggestions,
      products: (matchedIntent as any).products
    };
  }

  // Extract parameters from user message based on intent
  private extractParameters(message: string, intentName: string): { [key: string]: any } {
    const parameters: { [key: string]: any } = {};
    const lowerMessage = message.toLowerCase();

    switch (intentName) {
      case 'product.sizing':
        if (lowerMessage.includes('small') || lowerMessage.includes('lunch')) {
          parameters.size = 'small';
        } else if (lowerMessage.includes('large') || lowerMessage.includes('camping')) {
          parameters.size = 'large';
        } else if (lowerMessage.includes('medium')) {
          parameters.size = 'medium';
        }
        break;
        
      case 'pricing.cost':
        if (lowerMessage.includes('bulk') || lowerMessage.includes('multiple')) {
          parameters.quantity = 'bulk';
        }
        if (lowerMessage.includes('discount') || lowerMessage.includes('sale')) {
          parameters.promotion = true;
        }
        break;
    }

    return parameters;
  }

  // Convert text to speech using Google Cloud Text-to-Speech
  async textToSpeech(text: string): Promise<Buffer | null> {
    try {
      // In production, implement Google Cloud Text-to-Speech
      // For now, return null to use browser speech synthesis
      return null;
    } catch (error) {
      console.error('Text-to-speech error:', error);
      return null;
    }
  }

  // Convert speech to text using Google Cloud Speech-to-Text
  async speechToText(audioBuffer: Buffer): Promise<string | null> {
    try {
      // In production, implement Google Cloud Speech-to-Text
      // For now, simulate transcription
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockTranscriptions = [
        "How puncture resistant are your ice packs?",
        "What size do I need for my camping cooler?",
        "How long do they stay cold?",
        "Are they safe for food contact?",
        "What's the price for the large pack?"
      ];
      
      return mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
    } catch (error) {
      console.error('Speech-to-text error:', error);
      return null;
    }
  }

  // Get user context for personalization
  async getUserContext(userId: string): Promise<{ [key: string]: any }> {
    try {
      // In production, fetch from database
      return {
        userId,
        preferences: {},
        previousPurchases: [],
        location: null,
        device: 'web'
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return {};
    }
  }

  // Update user context
  async updateUserContext(userId: string, context: { [key: string]: any }): Promise<void> {
    try {
      // In production, save to database
      console.log(`Updated context for user ${userId}:`, context);
    } catch (error) {
      console.error('Error updating user context:', error);
    }
  }

  private getErrorResponse(): DialogflowResponse {
    return {
      fulfillmentText: "I'm sorry, I'm having trouble processing your request right now. Please try again or contact our support team for immediate assistance.",
      intent: {
        name: 'system.error',
        displayName: 'System Error',
        confidence: 0
      },
      parameters: {},
      suggestions: ['Contact support', 'Try again', 'Browse products']
    };
  }

  // Health check for the service
  async healthCheck(): Promise<boolean> {
    try {
      if (this.sessionsClient) {
        // Test with a simple message
        await this.processMessage('hello', 'health-check');
      }
      return true;
    } catch (error) {
      console.error('Dialogflow health check failed:', error);
      return false;
    }
  }
}

export default new DialogflowService();