// Comprehensive shipping service with Shippo API and EasyPost fallback
import Shippo from 'shippo';
// @ts-ignore
import EasyPost from 'easypost';

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface ShippingItem {
  productId: string;
  name: string;
  quantity: number;
  weight: number; // in lbs
  dimensions: {
    length: number; // in inches
    width: number;
    height: number;
  };
  value: number; // USD value for customs
  hsCode?: string; // Harmonized System code for international shipping
  originCountry?: string;
}

export interface ShippingRate {
  id: string;
  provider: 'USPS' | 'FedEx' | 'UPS' | 'DHL';
  serviceName: string;
  displayName: string;
  cost: number;
  currency: string;
  estimatedDays: number;
  deliveryDate?: string;
  carbonFootprint?: {
    co2Grams: number;
    offsetCost?: number;
    ecoFriendly: boolean;
  };
  features: string[];
  icon?: string;
  kineticsAnimation?: string;
}

export interface ShippingQuote {
  rates: ShippingRate[];
  fromAddress: ShippingAddress;
  toAddress: ShippingAddress;
  items: ShippingItem[];
  totalWeight: number;
  totalValue: number;
  international: boolean;
  errors?: string[];
}

export interface AddressValidation {
  valid: boolean;
  suggestions?: ShippingAddress[];
  errors?: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery?: string;
  lastUpdate: string;
  events: Array<{
    date: string;
    status: string;
    location?: string;
    description: string;
  }>;
}

class ShippingService {
  private shippo: any;
  private easypost: any;
  private useShippo: boolean;

  constructor() {
    this.useShippo = !!process.env.SHIPPO_API_KEY;
    
    if (this.useShippo) {
      this.shippo = new Shippo(process.env.SHIPPO_API_KEY);
    } else if (process.env.EASYPOST_API_KEY) {
      this.easypost = new EasyPost(process.env.EASYPOST_API_KEY);
    }
  }

  // Validate shipping address
  async validateAddress(address: ShippingAddress): Promise<AddressValidation> {
    try {
      if (this.useShippo && this.shippo) {
        const validationResult = await this.shippo.address.create({
          name: `${address.firstName} ${address.lastName}`,
          company: address.company || '',
          street1: address.address1,
          street2: address.address2 || '',
          city: address.city,
          state: address.state,
          zip: address.zipCode,
          country: address.country,
          phone: address.phone || '',
          email: address.email || '',
          validate: true
        });

        return {
          valid: validationResult.validation_results?.is_valid || false,
          confidence: this.getConfidenceLevel(validationResult.validation_results),
          suggestions: validationResult.validation_results?.messages?.length > 0 
            ? [this.convertShippoAddressToShippingAddress(validationResult)]
            : undefined,
          errors: validationResult.validation_results?.messages?.map((m: any) => m.text) || []
        };
      } else if (this.easypost) {
        const validationResult = await this.easypost.Address.create({
          name: `${address.firstName} ${address.lastName}`,
          company: address.company,
          street1: address.address1,
          street2: address.address2,
          city: address.city,
          state: address.state,
          zip: address.zipCode,
          country: address.country,
          phone: address.phone,
          email: address.email,
          verify: true
        });

        return {
          valid: !validationResult.verifications?.delivery?.errors?.length,
          confidence: 'high',
          suggestions: validationResult.verifications?.delivery?.errors?.length > 0 
            ? [this.convertEasyPostAddressToShippingAddress(validationResult)]
            : undefined,
          errors: validationResult.verifications?.delivery?.errors?.map((e: any) => e.message) || []
        };
      } else {
        // Fallback basic validation
        return this.basicAddressValidation(address);
      }
    } catch (error: any) {
      console.error('Address validation error:', error);
      return {
        valid: false,
        confidence: 'low',
        errors: [`Address validation failed: ${error.message}`]
      };
    }
  }

  // Get shipping rates
  async getShippingRates(
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    items: ShippingItem[]
  ): Promise<ShippingQuote> {
    try {
      const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
      const totalValue = items.reduce((sum, item) => sum + (item.value * item.quantity), 0);
      const international = toAddress.country !== 'US';

      if (this.useShippo && this.shippo) {
        return await this.getShippoRates(fromAddress, toAddress, items, totalWeight, totalValue, international);
      } else if (this.easypost) {
        return await this.getEasyPostRates(fromAddress, toAddress, items, totalWeight, totalValue, international);
      } else {
        // Fallback to estimated rates
        return await this.getFallbackRates(fromAddress, toAddress, items, totalWeight, totalValue, international);
      }
    } catch (error: any) {
      console.error('Shipping rates error:', error);
      return {
        rates: [],
        fromAddress,
        toAddress,
        items,
        totalWeight: items.reduce((sum, item) => sum + (item.weight * item.quantity), 0),
        totalValue: items.reduce((sum, item) => sum + (item.value * item.quantity), 0),
        international: toAddress.country !== 'US',
        errors: [`Failed to get shipping rates: ${error.message}`]
      };
    }
  }

  private async getShippoRates(
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    items: ShippingItem[],
    totalWeight: number,
    totalValue: number,
    international: boolean
  ): Promise<ShippingQuote> {
    // Create shipment with Shippo
    const shipment = await this.shippo.shipment.create({
      address_from: {
        name: "ICEPACA",
        company: "ICEPACA Inc.",
        street1: "123 Cool Street", // Replace with actual warehouse address
        city: "San Francisco",
        state: "CA",
        zip: "94102",
        country: "US",
        phone: "+1 555 123 4567",
        email: "shipping@icepaca.com"
      },
      address_to: {
        name: `${toAddress.firstName} ${toAddress.lastName}`,
        company: toAddress.company || '',
        street1: toAddress.address1,
        street2: toAddress.address2 || '',
        city: toAddress.city,
        state: toAddress.state,
        zip: toAddress.zipCode,
        country: toAddress.country,
        phone: toAddress.phone || '',
        email: toAddress.email || ''
      },
      parcels: items.map(item => ({
        length: item.dimensions.length,
        width: item.dimensions.width,
        height: item.dimensions.height,
        distance_unit: "in",
        weight: item.weight * item.quantity,
        mass_unit: "lb"
      })),
      customs_declaration: international ? {
        contents_type: "MERCHANDISE",
        contents_explanation: "Reusable ice packs for cooling",
        non_delivery_option: "RETURN",
        certify: true,
        certify_signer: "ICEPACA Shipping",
        items: items.map(item => ({
          description: item.name,
          quantity: item.quantity,
          net_weight: item.weight,
          mass_unit: "lb",
          value_amount: item.value,
          value_currency: "USD",
          tariff_number: item.hsCode || "3926909990", // Default HS code for plastic products
          origin_country: item.originCountry || "US"
        }))
      } : undefined
    });

    // Convert Shippo rates to our format
    const rates: ShippingRate[] = shipment.rates.map((rate: any) => {
      const carbonFootprint = this.calculateCarbonFootprint(rate.provider, rate.servicelevel.name, totalWeight, international);
      
      return {
        id: rate.object_id,
        provider: this.normalizeProvider(rate.provider),
        serviceName: rate.servicelevel.name,
        displayName: this.getDisplayName(rate.provider, rate.servicelevel.name),
        cost: parseFloat(rate.amount),
        currency: rate.currency,
        estimatedDays: rate.estimated_days || this.getEstimatedDays(rate.provider, rate.servicelevel.name),
        deliveryDate: rate.delivery_date,
        carbonFootprint,
        features: this.getServiceFeatures(rate.provider, rate.servicelevel.name),
        icon: this.getProviderIcon(rate.provider),
        kineticsAnimation: this.getKineticsAnimation(rate.provider, rate.servicelevel.name)
      };
    });

    return {
      rates: rates.sort((a, b) => a.cost - b.cost), // Sort by cost
      fromAddress,
      toAddress,
      items,
      totalWeight,
      totalValue,
      international
    };
  }

  private async getEasyPostRates(
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    items: ShippingItem[],
    totalWeight: number,
    totalValue: number,
    international: boolean
  ): Promise<ShippingQuote> {
    // Implementation similar to Shippo but using EasyPost API
    // This would follow the same pattern but with EasyPost-specific calls
    return this.getFallbackRates(fromAddress, toAddress, items, totalWeight, totalValue, international);
  }

  private async getFallbackRates(
    fromAddress: ShippingAddress,
    toAddress: ShippingAddress,
    items: ShippingItem[],
    totalWeight: number,
    totalValue: number,
    international: boolean
  ): Promise<ShippingQuote> {
    // Estimated rates based on weight and distance
    const baseRates = international ? {
      'USPS': { 'Priority Mail International': 25.50, 'First-Class Package International': 15.75 },
      'FedEx': { 'International Economy': 45.00, 'International Priority': 65.00 },
      'UPS': { 'Worldwide Expedited': 55.00, 'Worldwide Saver': 48.00 }
    } : {
      'USPS': { 'Priority Mail': 8.95, 'Ground Advantage': 5.50, 'Priority Mail Express': 28.95 },
      'FedEx': { 'Ground': 12.50, '2Day': 22.00, 'Overnight': 45.00 },
      'UPS': { 'Ground': 11.75, '3 Day Select': 18.50, 'Next Day Air': 42.00 }
    };

    const rates: ShippingRate[] = [];
    
    for (const [provider, services] of Object.entries(baseRates)) {
      for (const [service, baseCost] of Object.entries(services)) {
        const weightMultiplier = Math.max(1, Math.ceil(totalWeight / 5)); // $5 per 5lbs
        const cost = baseCost * weightMultiplier;
        const carbonFootprint = this.calculateCarbonFootprint(provider, service, totalWeight, international);
        
        rates.push({
          id: `fallback_${provider}_${service}`.toLowerCase().replace(/\s+/g, '_'),
          provider: provider as any,
          serviceName: service,
          displayName: this.getDisplayName(provider, service),
          cost,
          currency: 'USD',
          estimatedDays: this.getEstimatedDays(provider, service),
          carbonFootprint,
          features: this.getServiceFeatures(provider, service),
          icon: this.getProviderIcon(provider),
          kineticsAnimation: this.getKineticsAnimation(provider, service)
        });
      }
    }

    return {
      rates: rates.sort((a, b) => a.cost - b.cost),
      fromAddress,
      toAddress,
      items,
      totalWeight,
      totalValue,
      international
    };
  }

  // Calculate carbon footprint for shipping methods
  private calculateCarbonFootprint(provider: string, service: string, weight: number, international: boolean): {
    co2Grams: number;
    offsetCost?: number;
    ecoFriendly: boolean;
  } {
    // CO2 emission factors (grams of CO2 per lb per mile)
    const emissionFactors: { [key: string]: number } = {
      'ground': 0.2, // Most eco-friendly
      'standard': 0.3,
      'express': 0.8,
      'overnight': 1.5, // Least eco-friendly due to air transport
      'international': 2.2 // Higher due to air freight
    };

    // Estimate distance (simplified - in production, use actual distance calculation)
    const estimatedDistance = international ? 5000 : 1500;
    
    // Determine service type for emission calculation
    let serviceType = 'standard';
    const serviceLower = service.toLowerCase();
    if (serviceLower.includes('ground') || serviceLower.includes('advantage')) {
      serviceType = 'ground';
    } else if (serviceLower.includes('express') || serviceLower.includes('overnight') || serviceLower.includes('next')) {
      serviceType = serviceLower.includes('overnight') ? 'overnight' : 'express';
    } else if (international) {
      serviceType = 'international';
    }

    const co2Grams = Math.round(weight * estimatedDistance * emissionFactors[serviceType]);
    const offsetCost = Math.round((co2Grams / 1000) * 0.02 * 100) / 100; // $0.02 per kg CO2
    const ecoFriendly = serviceType === 'ground' || co2Grams < 1000;

    return {
      co2Grams,
      offsetCost,
      ecoFriendly
    };
  }

  // Get tracking information
  async getTrackingInfo(trackingNumber: string, carrier: string): Promise<TrackingInfo | null> {
    try {
      if (this.useShippo && this.shippo) {
        const tracking = await this.shippo.track.get_status(carrier.toLowerCase(), trackingNumber);
        
        return {
          trackingNumber,
          carrier,
          status: tracking.tracking_status?.status || 'UNKNOWN',
          estimatedDelivery: tracking.eta,
          lastUpdate: tracking.tracking_status?.status_date || new Date().toISOString(),
          events: tracking.tracking_history?.map((event: any) => ({
            date: event.status_date,
            status: event.status,
            location: event.location?.city ? `${event.location.city}, ${event.location.state}` : '',
            description: event.status_details || event.status
          })) || []
        };
      } else {
        // Fallback tracking info (simulated)
        return {
          trackingNumber,
          carrier,
          status: 'IN_TRANSIT',
          estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          lastUpdate: new Date().toISOString(),
          events: [
            {
              date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              status: 'SHIPPED',
              location: 'San Francisco, CA',
              description: 'Package shipped from facility'
            },
            {
              date: new Date().toISOString(),
              status: 'IN_TRANSIT',
              location: 'Oakland, CA',
              description: 'In transit to destination'
            }
          ]
        };
      }
    } catch (error: any) {
      console.error('Tracking error:', error);
      return null;
    }
  }

  // Helper methods
  private normalizeProvider(provider: string): 'USPS' | 'FedEx' | 'UPS' | 'DHL' {
    const normalized = provider.toUpperCase();
    if (normalized.includes('FEDEX')) return 'FedEx';
    if (normalized.includes('UPS')) return 'UPS';
    if (normalized.includes('DHL')) return 'DHL';
    return 'USPS';
  }

  private getDisplayName(provider: string, service: string): string {
    const kineticsNames: { [key: string]: string } = {
      'USPS_Priority Mail': '🚀 Fast Freeze Priority',
      'USPS_Ground Advantage': '❄️ Cool Ground Delivery',
      'USPS_Priority Mail Express': '⚡ Ice Lightning Express',
      'FedEx_Ground': '🧊 FedEx Frost Ground',
      'FedEx_2Day': '❄️ FedEx Freeze 2-Day',
      'FedEx_Overnight': '⚡ FedEx Ice Flash',
      'UPS_Ground': '🚚 UPS Chill Ground',
      'UPS_3 Day Select': '❄️ UPS Cool Select',
      'UPS_Next Day Air': '🚀 UPS Ice Rocket'
    };

    const key = `${provider}_${service}`;
    return kineticsNames[key] || `${provider} ${service}`;
  }

  private getEstimatedDays(provider: string, service: string): number {
    const daysMap: { [key: string]: number } = {
      'ground': 5,
      'advantage': 3,
      'priority': 2,
      '2day': 2,
      '3 day': 3,
      'express': 1,
      'overnight': 1,
      'next': 1,
      'international economy': 7,
      'international priority': 5
    };

    const serviceLower = service.toLowerCase();
    for (const [key, days] of Object.entries(daysMap)) {
      if (serviceLower.includes(key)) {
        return days;
      }
    }
    return 5; // Default
  }

  private getServiceFeatures(provider: string, service: string): string[] {
    const serviceLower = service.toLowerCase();
    const features = [];

    if (serviceLower.includes('express') || serviceLower.includes('overnight') || serviceLower.includes('next')) {
      features.push('Fast Delivery', 'Signature Required');
    }
    if (serviceLower.includes('priority')) {
      features.push('Tracking Included', 'Insurance');
    }
    if (serviceLower.includes('ground')) {
      features.push('Eco-Friendly', 'Cost Effective');
    }
    if (provider === 'USPS') {
      features.push('Delivered to Mailbox');
    }

    return features;
  }

  private getProviderIcon(provider: string): string {
    const icons: { [key: string]: string } = {
      'USPS': '🏛️',
      'FedEx': '📦',
      'UPS': '🚚',
      'DHL': '✈️'
    };
    return icons[provider] || '📬';
  }

  private getKineticsAnimation(provider: string, service: string): string {
    const serviceLower = service.toLowerCase();
    
    if (serviceLower.includes('overnight') || serviceLower.includes('express')) {
      return 'lightning';
    } else if (serviceLower.includes('ground')) {
      return 'truck';
    } else if (serviceLower.includes('priority')) {
      return 'rocket';
    } else {
      return 'wave';
    }
  }

  private basicAddressValidation(address: ShippingAddress): AddressValidation {
    const errors = [];
    
    if (!address.address1 || address.address1.length < 5) {
      errors.push('Street address is too short');
    }
    if (!address.city || address.city.length < 2) {
      errors.push('City is required');
    }
    if (!address.zipCode || !/^\d{5}(-\d{4})?$/.test(address.zipCode)) {
      errors.push('Invalid ZIP code format');
    }

    return {
      valid: errors.length === 0,
      confidence: 'low',
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private getConfidenceLevel(validationResults: any): 'high' | 'medium' | 'low' {
    if (!validationResults) return 'low';
    if (validationResults.is_valid && validationResults.messages?.length === 0) return 'high';
    if (validationResults.is_valid) return 'medium';
    return 'low';
  }

  private convertShippoAddressToShippingAddress(shippoAddress: any): ShippingAddress {
    return {
      firstName: shippoAddress.name?.split(' ')[0] || '',
      lastName: shippoAddress.name?.split(' ').slice(1).join(' ') || '',
      company: shippoAddress.company,
      address1: shippoAddress.street1,
      address2: shippoAddress.street2,
      city: shippoAddress.city,
      state: shippoAddress.state,
      zipCode: shippoAddress.zip,
      country: shippoAddress.country,
      phone: shippoAddress.phone,
      email: shippoAddress.email
    };
  }

  private convertEasyPostAddressToShippingAddress(easypostAddress: any): ShippingAddress {
    return {
      firstName: easypostAddress.name?.split(' ')[0] || '',
      lastName: easypostAddress.name?.split(' ').slice(1).join(' ') || '',
      company: easypostAddress.company,
      address1: easypostAddress.street1,
      address2: easypostAddress.street2,
      city: easypostAddress.city,
      state: easypostAddress.state,
      zipCode: easypostAddress.zip,
      country: easypostAddress.country,
      phone: easypostAddress.phone,
      email: easypostAddress.email
    };
  }
}

export default new ShippingService();