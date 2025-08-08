import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  MicrophoneIcon,
  StopIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  SparklesIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  suggestions?: string[];
  products?: Array<{
    id: string;
    name: string;
    price: number;
    image: string;
  }>;
}

interface AIChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  onProductClick?: (productId: string) => void;
}

const AIChatbot: React.FC<AIChatbotProps> = ({ isOpen, onClose, onProductClick }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize chatbot
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeChat();
    }
  }, [isOpen, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeChat = () => {
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'bot',
      content: "Hi! I'm ICEPACA's AI assistant. I can help you find the perfect ice pack, answer questions about puncture resistance, cooling duration, and more. How can I help you today?",
      timestamp: new Date(),
      suggestions: [
        "How puncture-resistant are your packs?",
        "What size do I need for my cooler?",
        "How long do they stay cold?",
        "Are they safe for food contact?"
      ]
    };

    setMessages([welcomeMessage]);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    // Add typing indicator
    const typingMessage: ChatMessage = {
      id: `typing-${Date.now()}`,
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };

    setMessages(prev => [...prev, typingMessage]);

    try {
      // Simulate AI processing
      const response = await processUserMessage(content);
      
      // Remove typing indicator and add actual response
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      setMessages(prev => [...prev, response]);

      // Text-to-speech if enabled
      if (speechEnabled && response.content) {
        speakText(response.content);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        content: "I'm sorry, I'm having trouble processing your request right now. Please try again or contact our support team.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const processUserMessage = async (message: string): Promise<ChatMessage> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));

    const lowerMessage = message.toLowerCase();
    let response = '';
    let suggestions: string[] = [];
    let products: any[] = [];

    // Pattern matching for common questions
    if (lowerMessage.includes('puncture') || lowerMessage.includes('resistant') || lowerMessage.includes('durable')) {
      response = "Great question! ICEPACA packs are extremely puncture-resistant thanks to our multi-layer construction. They use a puncture-resistant outer shell with reinforced seams. In our tests, they can withstand over 50 pounds of pressure without leaking. They're designed to handle rough outdoor conditions, camping trips, and daily use without worry.";
      suggestions = [
        "What materials are they made from?",
        "How long is the warranty?",
        "Can they handle freezing temperatures?"
      ];
    } else if (lowerMessage.includes('size') || lowerMessage.includes('fit') || lowerMessage.includes('cooler') || lowerMessage.includes('dimension')) {
      response = "I'd be happy to help you find the right size! ICEPACA offers several sizes:\n\n• Small (6\"×4\"×1\"): Perfect for lunch boxes and small coolers\n• Medium (10\"×6\"×1.5\"): Great for day trips and medium coolers\n• Large (12\"×8\"×2\"): Ideal for camping and large coolers\n\nWould you like to try our AR fit preview to see which size works best for your cooler?";
      suggestions = [
        "Try AR fit preview",
        "Show me all sizes",
        "What's the largest size available?"
      ];
      products = [
        { id: '1', name: 'ICEPACA Small Pack', price: 14.99, image: '/images/small-pack.jpg' },
        { id: '2', name: 'ICEPACA Medium Pack', price: 24.99, image: '/images/medium-pack.jpg' },
        { id: '3', name: 'ICEPACA Large Pack', price: 34.99, image: '/images/large-pack.jpg' }
      ];
    } else if (lowerMessage.includes('cold') || lowerMessage.includes('cooling') || lowerMessage.includes('temperature') || lowerMessage.includes('freeze') || lowerMessage.includes('chill')) {
      response = "ICEPACA packs provide excellent cooling performance! Here's what you can expect:\n\n• Small packs: 4-6 hours of cooling\n• Medium packs: 8-12 hours of cooling\n• Large packs: 12-18 hours of cooling\n\nThey freeze solid in 4-6 hours and maintain temperatures below 40°F for extended periods. The exact duration depends on external temperature, cooler insulation, and how often it's opened.";
      suggestions = [
        "How do I prepare them for use?",
        "Can they be refrozen multiple times?",
        "What's the best way to store them?"
      ];
    } else if (lowerMessage.includes('safe') || lowerMessage.includes('food') || lowerMessage.includes('toxic') || lowerMessage.includes('bpa')) {
      response = "Absolutely! ICEPACA packs are 100% food-safe and non-toxic. They're:\n\n• BPA-free and phthalate-free\n• FDA-approved materials only\n• Safe for direct contact with food and drinks\n• Non-toxic gel that's safe even if accidentally punctured\n• CPSIA compliant for children's products\n\nThey're perfect for lunch boxes, baby bottles, and any food storage needs!";
      suggestions = [
        "What's inside the gel?",
        "Are they dishwasher safe?",
        "Can kids use them safely?"
      ];
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('discount') || lowerMessage.includes('sale')) {
      response = "Our current pricing is very competitive:\n\n• Small packs: $14.99\n• Medium packs: $24.99\n• Large packs: $34.99\n\nWe offer:\n• Free shipping on orders over $50\n• Bulk discounts for 3+ packs\n• Seasonal promotions\n• Student and military discounts\n\nWould you like me to check for any current promotions for you?";
      suggestions = [
        "Show me bulk pricing",
        "Check current promotions",
        "Do you have a loyalty program?"
      ];
    } else if (lowerMessage.includes('eco') || lowerMessage.includes('environment') || lowerMessage.includes('sustainable') || lowerMessage.includes('green')) {
      response = "We're proud of our environmental commitment! ICEPACA packs are:\n\n• Reusable for 1000+ cycles (vs single-use ice)\n• Made from recyclable materials\n• Reduces plastic waste by 90% vs disposable alternatives\n• Manufactured using renewable energy\n• Carbon-neutral shipping available\n\nEach pack prevents hundreds of plastic ice bags from entering landfills!";
      suggestions = [
        "How do I recycle them eventually?",
        "What's your carbon footprint?",
        "Do you have eco-friendly packaging?"
      ];
    } else if (lowerMessage.includes('warranty') || lowerMessage.includes('guarantee') || lowerMessage.includes('return')) {
      response = "We stand behind our products with confidence:\n\n• 2-year warranty against defects\n• 30-day money-back guarantee\n• Free replacement for punctures in first year\n• Hassle-free return process\n• Lifetime customer support\n\nIf you're not completely satisfied, we'll make it right!";
      suggestions = [
        "How do I claim warranty?",
        "What's your return process?",
        "Do you offer extended warranty?"
      ];
    } else if (lowerMessage.includes('shipping') || lowerMessage.includes('delivery') || lowerMessage.includes('fast')) {
      response = "We offer several shipping options:\n\n• Standard shipping: 5-7 business days (FREE on $50+)\n• Express shipping: 2-3 business days ($9.99)\n• Next-day delivery: Available in select areas ($19.99)\n• International shipping: Available to 50+ countries\n\nMost orders ship within 24 hours on business days!";
      suggestions = [
        "Track my order",
        "International shipping rates",
        "Same-day delivery options"
      ];
    } else {
      // Generic helpful response
      response = "I'd be happy to help! I can assist you with information about our ice packs, including sizes, cooling performance, durability, pricing, and more. What specific questions do you have about ICEPACA products?";
      suggestions = [
        "Tell me about puncture resistance",
        "Help me choose the right size",
        "What makes ICEPACA different?",
        "Show me all products"
      ];
    }

    return {
      id: Date.now().toString(),
      type: 'bot',
      content: response,
      timestamp: new Date(),
      suggestions,
      products: products.length > 0 ? products : undefined
    };
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const startVoiceRecording = async () => {
    if (!privacyConsent) {
      alert('Please accept the privacy policy before using voice features.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processVoiceInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // In production, this would send audio to speech-to-text API
      // For demo, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate transcribed text
      const mockTranscriptions = [
        "How puncture resistant are your ice packs?",
        "What size do I need for my camping cooler?",
        "How long do they stay cold?",
        "Are they safe for food contact?",
        "What's the best size for lunch boxes?"
      ];
      
      const transcription = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
      
      // Add transcribed message and process it
      await handleSendMessage(transcription);
    } catch (error) {
      console.error('Error processing voice input:', error);
      alert('Sorry, I couldn\'t process your voice input. Please try typing instead.');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    // Remove markdown-like formatting for speech
    const cleanText = text.replace(/[*•]/g, '').replace(/\n/g, ' ');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    // Try to use a pleasant voice
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Female') || voice.name.includes('Samantha')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    speechSynthesis.speak(utterance);
  };

  const acceptPrivacyPolicy = () => {
    setPrivacyConsent(true);
    setShowPrivacyNotice(false);
  };

  const declinePrivacyPolicy = () => {
    setShowPrivacyNotice(false);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] h-[32rem] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-2xl text-white">
        <div className="flex items-center">
          <div className="relative">
            <SparklesIcon className="h-6 w-6 mr-2" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h3 className="font-semibold">ICEPACA Assistant</h3>
            <p className="text-xs text-blue-100">AI-powered support</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSpeechEnabled(!speechEnabled)}
            className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title={speechEnabled ? "Disable speech" : "Enable speech"}
          >
            {speechEnabled ? (
              <SpeakerWaveIcon className="h-5 w-5" />
            ) : (
              <SpeakerXMarkIcon className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Privacy Notice */}
      <AnimatePresence>
        {showPrivacyNotice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-yellow-50 border-b border-yellow-200 p-3"
          >
            <div className="flex items-start">
              <InformationCircleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-yellow-800 mb-2">
                  Our AI chatbot uses voice recognition and processes your messages to provide personalized assistance. 
                  <a href="/privacy" className="text-yellow-900 underline ml-1">Privacy Policy</a>
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={acceptPrivacyPolicy}
                    className="text-xs bg-yellow-600 text-white px-3 py-1 rounded-md hover:bg-yellow-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={declinePrivacyPolicy}
                    className="text-xs text-yellow-700 px-3 py-1 hover:text-yellow-800"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.type === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                message.type === 'user'
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              )}
            >
              {message.isTyping ? (
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-gray-500 ml-2">AI is thinking...</span>
                </div>
              ) : (
                <div>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  
                  {message.products && (
                    <div className="mt-3 space-y-2">
                      {message.products.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => onProductClick?.(product.id)}
                          className="flex items-center space-x-3 bg-white rounded-lg p-2 cursor-pointer hover:bg-gray-50 border border-gray-200"
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-xs">{product.name}</p>
                            <p className="text-green-600 font-semibold text-xs">${product.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {message.suggestions && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleSendMessage(inputMessage)}
              placeholder="Ask me anything about ICEPACA products..."
              className="w-full p-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={isProcessing || !privacyConsent}
            />
            <button
              onClick={() => handleSendMessage(inputMessage)}
              disabled={!inputMessage.trim() || isProcessing || !privacyConsent}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
          
          <button
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            disabled={isProcessing || !privacyConsent}
            className={cn(
              "p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              isRecording
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {isRecording ? (
              <StopIcon className="h-5 w-5" />
            ) : (
              <MicrophoneIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AIChatbot;