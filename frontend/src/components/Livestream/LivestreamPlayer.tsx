import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ChatBubbleLeftIcon,
  HeartIcon,
  ShareIcon,
  ShoppingBagIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

interface LivestreamPlayerProps {
  streamId: string;
  title: string;
  description: string;
  isLive: boolean;
  viewerCount: number;
  products?: Array<{
    id: string;
    name: string;
    price: number;
    image: string;
  }>;
  onClose?: () => void;
}

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
  isHost?: boolean;
}

interface StreamProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  isHighlighted: boolean;
  timestamp?: number;
}

const LivestreamPlayer: React.FC<LivestreamPlayerProps> = ({
  streamId,
  title,
  description,
  isLive,
  viewerCount,
  products = [],
  onClose
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showProducts, setShowProducts] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [likes, setLikes] = useState(247);
  const [hasLiked, setHasLiked] = useState(false);
  const [highlightedProducts, setHighlightedProducts] = useState<StreamProduct[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mock chat messages
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        user: 'OutdoorFan92',
        message: 'How long do these stay cold?',
        timestamp: new Date(Date.now() - 300000)
      },
      {
        id: '2',
        user: 'ICEPACAHost',
        message: 'Great question! Our ice packs stay cold for 6-24 hours depending on conditions 🧊',
        timestamp: new Date(Date.now() - 280000),
        isHost: true
      },
      {
        id: '3',
        user: 'CampingMom',
        message: 'Perfect for lunch boxes!',
        timestamp: new Date(Date.now() - 240000)
      },
      {
        id: '4',
        user: 'EcoWarrior',
        message: 'Love the sustainability aspect! ♻️',
        timestamp: new Date(Date.now() - 200000)
      },
      {
        id: '5',
        user: 'AdventureSeeker',
        message: 'Which size is best for day hikes?',
        timestamp: new Date(Date.now() - 180000)
      }
    ];

    setChatMessages(mockMessages);

    // Simulate live chat updates
    const chatInterval = setInterval(() => {
      if (isLive && Math.random() > 0.7) {
        const newMsg: ChatMessage = {
          id: Date.now().toString(),
          user: `User${Math.floor(Math.random() * 1000)}`,
          message: [
            'This is amazing!',
            'Where can I buy this?',
            'Does it work for hot food too?',
            'How much does it cost?',
            'I need this for camping!',
            'Is it dishwasher safe?',
            'Love this demo! 🔥',
            'Take my money! 💸'
          ][Math.floor(Math.random() * 8)],
          timestamp: new Date()
        };

        setChatMessages(prev => [...prev.slice(-20), newMsg]);
      }
    }, 5000);

    // Simulate product highlights during stream
    const productInterval = setInterval(() => {
      if (isLive && products.length > 0 && Math.random() > 0.6) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        const highlightedProduct: StreamProduct = {
          ...randomProduct,
          isHighlighted: true,
          timestamp: Date.now()
        };

        setHighlightedProducts(prev => [highlightedProduct, ...prev.slice(0, 2)]);

        // Remove highlight after 10 seconds
        setTimeout(() => {
          setHighlightedProducts(prev => 
            prev.map(p => p.id === randomProduct.id ? { ...p, isHighlighted: false } : p)
          );
        }, 10000);
      }
    }, 15000);

    return () => {
      clearInterval(chatInterval);
      clearInterval(productInterval);
    };
  }, [isLive, products]);

  useEffect(() => {
    // Auto-scroll chat to bottom
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleLike = () => {
    if (!hasLiked) {
      setLikes(prev => prev + 1);
      setHasLiked(true);
    }
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        user: 'You',
        message: newMessage.trim(),
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-black rounded-lg overflow-hidden shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {isLive && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-500 font-semibold text-sm">LIVE</span>
                </div>
              )}
              <div className="flex items-center space-x-1 text-white">
                <EyeIcon className="h-4 w-4" />
                <span className="text-sm">{viewerCount.toLocaleString()}</span>
              </div>
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">{title}</h2>
              <p className="text-gray-400 text-sm">{description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Video Player */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              poster="/api/placeholder/800/450"
              autoPlay
              loop
              muted={isMuted}
            >
              <source src="/demo-videos/icepaca-cooling-demo.mp4" type="video/mp4" />
              {/* Fallback content */}
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <div className="text-center text-white">
                  <PlayIcon className="h-16 w-16 mx-auto mb-4" />
                  <p>Video not available</p>
                  <p className="text-sm text-gray-400">Demo: ICEPACA Cooling Demonstration</p>
                </div>
              </div>
            </video>

            {/* Video Controls Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handlePlayPause}
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                >
                  {isPlaying ? (
                    <PauseIcon className="h-5 w-5" />
                  ) : (
                    <PlayIcon className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={handleMute}
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                >
                  {isMuted ? (
                    <SpeakerXMarkIcon className="h-5 w-5" />
                  ) : (
                    <SpeakerWaveIcon className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleLike}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-full transition-all ${
                    hasLiked
                      ? 'bg-red-500 text-white'
                      : 'bg-black bg-opacity-50 text-white hover:bg-opacity-70'
                  }`}
                >
                  {hasLiked ? (
                    <HeartSolid className="h-4 w-4" />
                  ) : (
                    <HeartIcon className="h-4 w-4" />
                  )}
                  <span className="text-sm">{likes}</span>
                </button>
                <button className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all">
                  <ShareIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Product Highlights Overlay */}
            <AnimatePresence>
              {highlightedProducts.filter(p => p.isHighlighted).map((product) => (
                <motion.div
                  key={`${product.id}-${product.timestamp}`}
                  initial={{ opacity: 0, scale: 0.8, x: 50 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 50 }}
                  className="absolute top-4 right-4 bg-white rounded-lg p-3 shadow-lg max-w-xs"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-lg font-bold text-blue-600">${product.price}</p>
                    </div>
                    <button
                      onClick={() => setShowProducts(true)}
                      className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                    >
                      <ShoppingBagIcon className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="w-80 bg-gray-900 border-l border-gray-700 flex flex-col">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setShowProducts(false)}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  !showProducts
                    ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ChatBubbleLeftIcon className="h-4 w-4 inline mr-2" />
                Chat
              </button>
              <button
                onClick={() => setShowProducts(true)}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  showProducts
                    ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ShoppingBagIcon className="h-4 w-4 inline mr-2" />
                Products ({products.length})
              </button>
            </div>

            {/* Chat Panel */}
            {!showProducts && (
              <div className="flex-1 flex flex-col">
                <div
                  ref={chatRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3"
                >
                  {chatMessages.map((message) => (
                    <div key={message.id} className="flex flex-col">
                      <div className="flex items-start space-x-2">
                        <div
                          className={`flex-1 ${
                            message.isHost ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'
                          } rounded-lg p-2`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <span
                              className={`text-xs font-medium ${
                                message.isHost ? 'text-blue-100' : 'text-gray-400'
                              }`}
                            >
                              {message.user}
                            </span>
                            {message.isHost && (
                              <span className="bg-blue-500 text-white text-xs px-1 rounded">HOST</span>
                            )}
                          </div>
                          <p className="text-sm">{message.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-gray-700">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 bg-gray-800 text-white placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Products Panel */}
            {showProducts && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{product.name}</h3>
                        <p className="text-2xl font-bold text-blue-400">${product.price}</p>
                        <button className="mt-2 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {products.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <ShoppingBagIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No products featured in this stream</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivestreamPlayer;