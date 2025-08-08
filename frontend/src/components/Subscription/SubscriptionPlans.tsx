import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckIcon,
  XMarkIcon,
  GiftIcon,
  TruckIcon,
  StarIcon,
  ShoppingBagIcon,
  CalendarIcon,
  CreditCardIcon,
  PauseIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckSolid } from '@heroicons/react/24/solid';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  billingInterval: 'monthly' | 'quarterly' | 'annually';
  features: string[];
  isPopular?: boolean;
  savings?: string;
  estimatedValue: number;
}

interface AdventureKit {
  month: string;
  year: number;
  theme: string;
  products: Array<{
    id: string;
    name: string;
    description: string;
    quantity: number;
    isExclusive?: boolean;
  }>;
  bonusContent: {
    guide?: string;
    tips: string[];
    videoUrl?: string;
  };
  estimatedValue: number;
  actualPrice: number;
}

interface UserSubscription {
  id: string;
  planId: string;
  planName: string;
  status: 'active' | 'paused' | 'cancelled' | 'past_due';
  nextBillingDate: Date;
  nextDeliveryDate: Date;
  totalSaved: number;
  deliveriesReceived: number;
  canPause: boolean;
  canCancel: boolean;
  canSkip: boolean;
}

const SubscriptionPlans: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentKit, setCurrentKit] = useState<AdventureKit | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'preview' | 'manage'>('plans');
  const [loading, setLoading] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const [plansResponse, kitResponse, subscriptionResponse] = await Promise.all([
        fetch('/api/subscriptions/plans'),
        fetch('/api/subscriptions/current-kit'),
        fetch('/api/subscriptions/user')
      ]);

      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setPlans(plansData.plans || mockPlans);
      } else {
        setPlans(mockPlans);
      }

      if (kitResponse.ok) {
        const kitData = await kitResponse.json();
        setCurrentKit(kitData);
      } else {
        setCurrentKit(mockCurrentKit);
      }

      if (subscriptionResponse.ok) {
        const subData = await subscriptionResponse.json();
        setUserSubscription(subData);
        setActiveTab('manage');
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      setPlans(mockPlans);
      setCurrentKit(mockCurrentKit);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setIsSubscribing(true);
    try {
      // In production, integrate with payment processor
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          paymentMethodId: 'pm_mock_payment_method',
          deliveryAddress: {
            name: 'John Doe',
            street: '123 Main St',
            city: 'Anytown',
            state: 'ST',
            zipCode: '12345',
            country: 'US'
          }
        })
      });

      if (response.ok) {
        const { subscription } = await response.json();
        setUserSubscription(subscription);
        setActiveTab('manage');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handlePauseResume = async () => {
    if (!userSubscription) return;

    try {
      const endpoint = userSubscription.status === 'active' ? 'pause' : 'resume';
      const response = await fetch(`/api/subscriptions/${userSubscription.id}/${endpoint}`, {
        method: 'POST'
      });

      if (response.ok) {
        setUserSubscription(prev => prev ? {
          ...prev,
          status: prev.status === 'active' ? 'paused' : 'active'
        } : null);
      }
    } catch (error) {
      console.error('Error pausing/resuming subscription:', error);
    }
  };

  const handleSkipDelivery = async () => {
    if (!userSubscription) return;

    try {
      const response = await fetch(`/api/subscriptions/${userSubscription.id}/skip-next`, {
        method: 'POST'
      });

      if (response.ok) {
        // Update next delivery date
        const nextMonth = new Date(userSubscription.nextDeliveryDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        setUserSubscription(prev => prev ? {
          ...prev,
          nextDeliveryDate: nextMonth
        } : null);
      }
    } catch (error) {
      console.error('Error skipping delivery:', error);
    }
  };

  const formatPrice = (price: number, interval: string) => {
    if (interval === 'annually') {
      return `$${price}/year`;
    } else if (interval === 'quarterly') {
      return `$${price}/quarter`;
    }
    return `$${price}/month`;
  };

  const getIntervalLabel = (interval: string) => {
    switch (interval) {
      case 'monthly': return 'Every Month';
      case 'quarterly': return 'Every 3 Months';
      case 'annually': return 'Every Year';
      default: return interval;
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow border h-96"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'plans', label: 'Choose Plan', show: !userSubscription },
    { id: 'preview', label: 'This Month\'s Kit', show: true },
    { id: 'manage', label: 'Manage Subscription', show: !!userSubscription }
  ].filter(tab => tab.show);

  // Mock data
  const mockPlans: SubscriptionPlan[] = [
    {
      id: 'monthly',
      name: 'Monthly Adventure Kit',
      description: 'Perfect for trying out our subscription service',
      price: 29.99,
      billingInterval: 'monthly',
      features: [
        '1-2 premium ice packs',
        'Monthly adventure guide',
        'Exclusive accessories',
        'Free shipping',
        'Skip or cancel anytime'
      ],
      estimatedValue: 45
    },
    {
      id: 'quarterly',
      name: 'Quarterly Explorer Box',
      description: 'Best value for regular adventurers',
      price: 79.99,
      originalPrice: 89.99,
      billingInterval: 'quarterly',
      features: [
        '3-4 premium ice packs',
        'Seasonal adventure gear',
        'Exclusive ICEPACA merchandise',
        'Comprehensive guides',
        '15% member discount',
        'Priority support'
      ],
      isPopular: true,
      savings: 'Save $30',
      estimatedValue: 120
    },
    {
      id: 'annual',
      name: 'Annual Adventure Collection',
      description: 'Maximum savings for committed adventurers',
      price: 299.99,
      originalPrice: 359.88,
      billingInterval: 'annually',
      features: [
        'All quarterly boxes',
        'VIP member benefits',
        'Product upgrades',
        'Early access to releases',
        '25% member discount',
        'Personal consultant',
        'Custom personalization'
      ],
      savings: 'Save $60',
      estimatedValue: 480
    }
  ];

  const mockCurrentKit: AdventureKit = {
    month: 'February',
    year: 2024,
    theme: 'Winter Sports Ready',
    products: [
      {
        id: 'featured-pack',
        name: 'ICEPACA Winter Sport Pack',
        description: 'Extra-durable ice pack designed for winter sports',
        quantity: 1,
        isExclusive: true
      },
      {
        id: 'thermal-holder',
        name: 'Thermal Bottle Holder',
        description: 'Keeps drinks at perfect temperature during winter activities',
        quantity: 1
      },
      {
        id: 'bonus-item',
        name: 'ICEPACA Winter Sticker Pack',
        description: 'Exclusive winter-themed stickers',
        quantity: 1,
        isExclusive: true
      }
    ],
    bonusContent: {
      guide: 'Winter Sports Cooling Guide',
      tips: [
        'Use ice packs to prevent food from freezing in extreme cold',
        'Layer ice packs for extended cooling in winter conditions',
        'Ice packs work great for injury care during winter sports'
      ],
      videoUrl: '/guides/winter-sports-demo.mp4'
    },
    estimatedValue: 52.99,
    actualPrice: 29.99
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          ICEPACA Adventure Kits
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Get curated ice packs and cooling accessories delivered to your door every month. 
          Discover new products, save money, and never run out of cooling power for your adventures!
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex justify-center space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Subscription Plans */}
      {activeTab === 'plans' && (
        <div className="space-y-8">
          {/* Value Proposition */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 text-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center">
                <GiftIcon className="h-12 w-12 text-blue-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Curated Selection</h3>
                <p className="text-sm text-gray-600">
                  Handpicked products based on seasonal activities and customer feedback
                </p>
              </div>
              <div className="flex flex-col items-center">
                <TruckIcon className="h-12 w-12 text-purple-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Free Shipping</h3>
                <p className="text-sm text-gray-600">
                  Always free shipping, right to your door, every month
                </p>
              </div>
              <div className="flex flex-col items-center">
                <StarIcon className="h-12 w-12 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Exclusive Access</h3>
                <p className="text-sm text-gray-600">
                  Get new products before anyone else, plus subscriber-only items
                </p>
              </div>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-lg shadow-lg border-2 overflow-hidden ${
                  plan.isPopular ? 'border-purple-500 relative' : 'border-gray-200'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 mb-4">{plan.description}</p>
                    
                    <div className="mb-4">
                      <div className="flex items-center justify-center space-x-2">
                        {plan.originalPrice && (
                          <span className="text-lg text-gray-400 line-through">
                            {formatPrice(plan.originalPrice, plan.billingInterval)}
                          </span>
                        )}
                        <span className="text-3xl font-bold text-gray-900">
                          {formatPrice(plan.price, plan.billingInterval)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{getIntervalLabel(plan.billingInterval)}</p>
                      {plan.savings && (
                        <span className="inline-block mt-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                          {plan.savings}
                        </span>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 mb-6">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Estimated Value:</span> ${plan.estimatedValue}
                      </p>
                      <p className="text-sm text-green-600 font-medium">
                        You save ${(plan.estimatedValue - plan.price).toFixed(2)}!
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start">
                        <CheckSolid className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isSubscribing}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      plan.isPopular
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isSubscribing ? 'Processing...' : 'Start Subscription'}
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-3">
                    Cancel or pause anytime
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Frequently Asked Questions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="font-medium text-gray-900 mb-2">When will I be charged?</p>
                <p className="text-gray-600">
                  You'll be charged today for your first box, then automatically on your billing cycle.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-2">Can I skip a month?</p>
                <p className="text-gray-600">
                  Yes! You can skip deliveries anytime before the 15th of the month.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-2">What if I don't like something?</p>
                <p className="text-gray-600">
                  We have a 100% satisfaction guarantee. Contact us for exchanges or refunds.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-2">Can I cancel anytime?</p>
                <p className="text-gray-600">
                  Absolutely! Cancel or pause your subscription anytime with no penalties.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* This Month's Kit Preview */}
      {activeTab === 'preview' && currentKit && (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentKit.month} {currentKit.year} Adventure Kit
            </h2>
            <p className="text-lg text-purple-600 font-medium">{currentKit.theme}</p>
          </div>

          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold mb-2">What's Inside</h3>
                  <p className="opacity-90">Curated for this month's adventures</p>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-90">Estimated Value</p>
                  <p className="text-2xl font-bold">${currentKit.estimatedValue}</p>
                  <p className="text-sm opacity-90">Your Price: ${currentKit.actualPrice}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {currentKit.products.map((product, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <ShoppingBagIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{product.name}</h4>
                        {product.isExclusive && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                            Exclusive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{product.description}</p>
                      <p className="text-xs text-gray-500 mt-1">Quantity: {product.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <GiftIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Bonus Content
                </h4>
                <div className="space-y-2">
                  {currentKit.bonusContent.guide && (
                    <p className="text-sm text-gray-700">
                      📖 {currentKit.bonusContent.guide}
                    </p>
                  )}
                  {currentKit.bonusContent.tips.map((tip, index) => (
                    <p key={index} className="text-sm text-gray-700">
                      💡 {tip}
                    </p>
                  ))}
                  {currentKit.bonusContent.videoUrl && (
                    <p className="text-sm text-gray-700">
                      🎥 Exclusive demo video
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Subscription */}
      {activeTab === 'manage' && userSubscription && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Your Subscription</h2>
                <p className="text-gray-600">{userSubscription.planName}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                userSubscription.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : userSubscription.status === 'paused'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {userSubscription.status.charAt(0).toUpperCase() + userSubscription.status.slice(1)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <CalendarIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Next Billing</p>
                <p className="font-semibold text-gray-900">
                  {userSubscription.nextBillingDate.toLocaleDateString()}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <TruckIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Next Delivery</p>
                <p className="font-semibold text-gray-900">
                  {userSubscription.nextDeliveryDate.toLocaleDateString()}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <StarIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Total Saved</p>
                <p className="font-semibold text-gray-900">
                  ${userSubscription.totalSaved}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              {userSubscription.canPause && (
                <button
                  onClick={handlePauseResume}
                  className="flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
                >
                  {userSubscription.status === 'active' ? (
                    <>
                      <PauseIcon className="h-4 w-4 mr-2" />
                      Pause Subscription
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-4 w-4 mr-2" />
                      Resume Subscription
                    </>
                  )}
                </button>
              )}
              
              {userSubscription.canSkip && (
                <button
                  onClick={handleSkipDelivery}
                  className="flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Skip Next Delivery
                </button>
              )}
              
              <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors">
                <CreditCardIcon className="h-4 w-4 mr-2" />
                Update Payment
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="mb-2">
              <strong>Need help?</strong> Contact our customer success team at{' '}
              <a href="mailto:support@icepaca.com" className="text-blue-600 hover:underline">
                support@icepaca.com
              </a>
            </p>
            <p>
              You can cancel or modify your subscription anytime. Changes made before the 15th of the month 
              will apply to the next billing cycle.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPlans;