import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarIcon,
  PlayIcon,
  EyeIcon,
  ClockIcon,
  TagIcon,
  BellIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { PlayIcon as PlaySolid } from '@heroicons/react/24/solid';
import LivestreamPlayer from './LivestreamPlayer';

interface LivestreamEvent {
  id: string;
  title: string;
  description: string;
  scheduledFor: Date;
  duration: number; // in minutes
  host: string;
  topics: string[];
  featuredProducts: Array<{
    id: string;
    name: string;
    price: number;
    image: string;
  }>;
  thumbnailUrl: string;
  isLive: boolean;
  viewerCount: number;
  isNotificationSet: boolean;
  streamUrl?: string;
}

interface DemoVideo {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnailUrl: string;
  videoUrl: string;
  topics: string[];
  products: Array<{
    id: string;
    name: string;
    price: number;
    image: string;
  }>;
  views: number;
}

const LivestreamSchedule: React.FC = () => {
  const [upcomingStreams, setUpcomingStreams] = useState<LivestreamEvent[]>([]);
  const [demoVideos, setDemoVideos] = useState<DemoVideo[]>([]);
  const [selectedStream, setSelectedStream] = useState<LivestreamEvent | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<DemoVideo | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'demos' | 'archive'>('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreamData();
  }, []);

  const fetchStreamData = async () => {
    try {
      // Mock data for upcoming streams
      const mockUpcomingStreams: LivestreamEvent[] = [
        {
          id: 'stream-1',
          title: 'Ultimate Camping Cooling Hacks',
          description: 'Learn professional tips for keeping your food and drinks cold on extended camping trips',
          scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          duration: 45,
          host: 'Sarah from ICEPACA',
          topics: ['Camping', 'Food Safety', 'Outdoor Adventures', 'Ice Pack Tips'],
          featuredProducts: [
            {
              id: 'large-pack',
              name: 'ICEPACA Large Pack',
              price: 24.99,
              image: '/api/placeholder/100/100'
            },
            {
              id: 'adventure-bundle',
              name: 'Adventure Bundle',
              price: 59.99,
              image: '/api/placeholder/100/100'
            }
          ],
          thumbnailUrl: '/api/placeholder/400/225',
          isLive: false,
          viewerCount: 0,
          isNotificationSet: false
        },
        {
          id: 'stream-2',
          title: 'Lunch Box Solutions for Busy Parents',
          description: 'Quick and easy ways to keep school lunches fresh all day',
          scheduledFor: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          duration: 30,
          host: 'Mike, Dad of 3',
          topics: ['Back to School', 'Parenting', 'Meal Prep', 'Time Saving'],
          featuredProducts: [
            {
              id: 'small-pack',
              name: 'ICEPACA Small Pack',
              price: 12.99,
              image: '/api/placeholder/100/100'
            }
          ],
          thumbnailUrl: '/api/placeholder/400/225',
          isLive: false,
          viewerCount: 0,
          isNotificationSet: false
        },
        {
          id: 'stream-3',
          title: 'LIVE: Ice Pack vs Regular Ice Challenge',
          description: 'Watch us compare ICEPACA against traditional ice in real-time',
          scheduledFor: new Date(Date.now() - 30 * 60 * 1000), // Started 30 minutes ago
          duration: 60,
          host: 'ICEPACA Team',
          topics: ['Product Demo', 'Comparison', 'Science', 'Education'],
          featuredProducts: [
            {
              id: 'medium-pack',
              name: 'ICEPACA Medium Pack',
              price: 18.99,
              image: '/api/placeholder/100/100'
            },
            {
              id: 'large-pack',
              name: 'ICEPACA Large Pack',
              price: 24.99,
              image: '/api/placeholder/100/100'
            }
          ],
          thumbnailUrl: '/api/placeholder/400/225',
          isLive: true,
          viewerCount: 347,
          isNotificationSet: true
        }
      ];

      // Mock data for demo videos
      const mockDemoVideos: DemoVideo[] = [
        {
          id: 'demo-1',
          title: 'How Long Do ICEPACA Ice Packs Really Last?',
          description: 'Time-lapse test showing our ice packs keeping food cold for 24 hours straight',
          duration: '8:42',
          thumbnailUrl: '/api/placeholder/400/225',
          videoUrl: '/demo-videos/24-hour-test.mp4',
          topics: ['Product Testing', 'Time-lapse', 'Performance'],
          products: [
            {
              id: 'large-pack',
              name: 'ICEPACA Large Pack',
              price: 24.99,
              image: '/api/placeholder/100/100'
            }
          ],
          views: 15420
        },
        {
          id: 'demo-2',
          title: 'Perfect Picnic Packing with ICEPACA',
          description: 'Step-by-step guide to organizing your cooler for maximum efficiency',
          duration: '5:18',
          thumbnailUrl: '/api/placeholder/400/225',
          videoUrl: '/demo-videos/picnic-packing.mp4',
          topics: ['Packing Tips', 'Picnic', 'Organization'],
          products: [
            {
              id: 'medium-pack',
              name: 'ICEPACA Medium Pack',
              price: 18.99,
              image: '/api/placeholder/100/100'
            },
            {
              id: 'small-pack',
              name: 'ICEPACA Small Pack',
              price: 12.99,
              image: '/api/placeholder/100/100'
            }
          ],
          views: 8932
        },
        {
          id: 'demo-3',
          title: 'ICEPACA vs Regular Ice: The Ultimate Test',
          description: 'Side-by-side comparison showing why reusable ice packs are superior',
          duration: '12:15',
          thumbnailUrl: '/api/placeholder/400/225',
          videoUrl: '/demo-videos/ice-comparison.mp4',
          topics: ['Comparison', 'Education', 'Science', 'Benefits'],
          products: [
            {
              id: 'adventure-bundle',
              name: 'Adventure Bundle',
              price: 59.99,
              image: '/api/placeholder/100/100'
            }
          ],
          views: 23456
        },
        {
          id: 'demo-4',
          title: 'Lunch Box Cooling Hacks Every Parent Needs',
          description: 'Keep school lunches fresh with these simple tips and tricks',
          duration: '6:33',
          thumbnailUrl: '/api/placeholder/400/225',
          videoUrl: '/demo-videos/lunch-box-hacks.mp4',
          topics: ['Parenting', 'Lunch Ideas', 'Food Safety'],
          products: [
            {
              id: 'small-pack',
              name: 'ICEPACA Small Pack',
              price: 12.99,
              image: '/api/placeholder/100/100'
            }
          ],
          views: 11234
        }
      ];

      setUpcomingStreams(mockUpcomingStreams);
      setDemoVideos(mockDemoVideos);
    } catch (error) {
      console.error('Error fetching stream data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotification = (streamId: string) => {
    setUpcomingStreams(prev =>
      prev.map(stream =>
        stream.id === streamId
          ? { ...stream, isNotificationSet: !stream.isNotificationSet }
          : stream
      )
    );
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays > 0) {
      return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return 'Started';
    }
  };

  const handleWatchLive = (stream: LivestreamEvent) => {
    if (stream.isLive) {
      setSelectedStream(stream);
    }
  };

  const handleWatchDemo = (video: DemoVideo) => {
    // Convert demo video to livestream format for player
    const mockStream: LivestreamEvent = {
      id: video.id,
      title: video.title,
      description: video.description,
      scheduledFor: new Date(),
      duration: parseInt(video.duration.split(':')[0]) * 60 + parseInt(video.duration.split(':')[1]),
      host: 'ICEPACA Team',
      topics: video.topics,
      featuredProducts: video.products,
      thumbnailUrl: video.thumbnailUrl,
      isLive: false,
      viewerCount: video.views,
      isNotificationSet: false,
      streamUrl: video.videoUrl
    };
    setSelectedStream(mockStream);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow border h-64"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'upcoming', label: 'Upcoming Streams', count: upcomingStreams.length },
    { id: 'demos', label: 'Demo Videos', count: demoVideos.length },
    { id: 'archive', label: 'Past Streams', count: 0 }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Demos & Streams</h1>
        <p className="text-gray-600">
          Watch live demonstrations, learn cooling hacks, and discover new ways to use ICEPACA products
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Upcoming Streams */}
      {activeTab === 'upcoming' && (
        <div className="space-y-6">
          {upcomingStreams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingStreams.map((stream) => (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-lg shadow border overflow-hidden hover:shadow-lg transition-shadow ${
                    stream.isLive ? 'ring-2 ring-red-500' : ''
                  }`}
                >
                  <div className="relative">
                    <img
                      src={stream.thumbnailUrl}
                      alt={stream.title}
                      className="w-full h-48 object-cover"
                    />
                    {stream.isLive ? (
                      <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold flex items-center">
                        <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                        LIVE
                      </div>
                    ) : (
                      <div className="absolute top-3 left-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm flex items-center">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {stream.duration}m
                      </div>
                    )}
                    {stream.isLive && (
                      <div className="absolute top-3 right-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm flex items-center">
                        <EyeIcon className="h-3 w-3 mr-1" />
                        {stream.viewerCount}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleWatchLive(stream)}
                        disabled={!stream.isLive}
                        className={`p-3 rounded-full transition-all ${
                          stream.isLive
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        <PlaySolid className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{stream.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{stream.description}</p>
                    
                    <div className="mb-3">
                      <p className="text-sm text-gray-500 mb-1">
                        <CalendarIcon className="h-4 w-4 inline mr-1" />
                        {formatDate(stream.scheduledFor)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Hosted by {stream.host}
                      </p>
                    </div>

                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {stream.topics.slice(0, 3).map((topic) => (
                          <span
                            key={topic}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                          >
                            <TagIcon className="h-3 w-3 mr-1" />
                            {topic}
                          </span>
                        ))}
                        {stream.topics.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                            +{stream.topics.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {stream.isLive ? (
                        <button
                          onClick={() => handleWatchLive(stream)}
                          className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium mr-2"
                        >
                          Watch Live
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleNotification(stream.id)}
                          className={`flex-1 py-2 px-4 rounded-lg font-medium mr-2 transition-colors ${
                            stream.isNotificationSet
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <BellIcon className="h-4 w-4 inline mr-2" />
                          {stream.isNotificationSet ? 'Notify Set' : 'Notify Me'}
                        </button>
                      )}
                      <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                        <ShareIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming streams</h3>
              <p className="text-gray-500">Check back soon for new live demonstrations and tips!</p>
            </div>
          )}
        </div>
      )}

      {/* Demo Videos */}
      {activeTab === 'demos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {demoVideos.map((video) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow border overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleWatchDemo(video)}
              >
                <div className="relative">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute bottom-3 right-3 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                    {video.duration}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <div className="bg-white bg-opacity-90 p-3 rounded-full">
                      <PlayIcon className="h-6 w-6 text-gray-800" />
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{video.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{video.description}</p>
                  
                  <div className="mb-3 flex items-center text-sm text-gray-500">
                    <EyeIcon className="h-4 w-4 mr-1" />
                    {video.views.toLocaleString()} views
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {video.topics.slice(0, 3).map((topic) => (
                      <span
                        key={topic}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                      >
                        <TagIcon className="h-3 w-3 mr-1" />
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Archive */}
      {activeTab === 'archive' && (
        <div className="text-center py-12">
          <PlayIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Archive coming soon</h3>
          <p className="text-gray-500">Past livestreams will be available here for replay.</p>
        </div>
      )}

      {/* Livestream Player Modal */}
      {selectedStream && (
        <LivestreamPlayer
          streamId={selectedStream.id}
          title={selectedStream.title}
          description={selectedStream.description}
          isLive={selectedStream.isLive}
          viewerCount={selectedStream.viewerCount}
          products={selectedStream.featuredProducts}
          onClose={() => setSelectedStream(null)}
        />
      )}
    </div>
  );
};

export default LivestreamSchedule;