import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  TagIcon,
  DocumentTextIcon,
  PhotoIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { useBlogAPI } from '../../hooks/useBlogAPI';

interface AIContentGeneratorProps {
  onContentGenerated: () => void;
}

interface GenerationTask {
  id: string;
  topic: string;
  category: string;
  keywords: string[];
  status: 'idle' | 'researching' | 'generating' | 'completed' | 'error';
  progress: number;
  result?: {
    title: string;
    excerpt: string;
    content: string;
    featuredImageUrl?: string;
    confidence: number;
  };
  error?: string;
}

const AIContentGenerator: React.FC<AIContentGeneratorProps> = ({ onContentGenerated }) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'queue' | 'history'>('generate');
  const [topic, setTopic] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [generateNow, setGenerateNow] = useState(true);
  const [currentTask, setCurrentTask] = useState<GenerationTask | null>(null);
  const [generationHistory, setGenerationHistory] = useState<GenerationTask[]>([]);
  const [contentQueue, setContentQueue] = useState<any[]>([]);
  
  const { categories, generateContent, getContentQueue, loading } = useBlogAPI();

  // Predefined topic suggestions
  const topicSuggestions = [
    {
      category: 'Cooling Tips',
      topics: [
        '2025 trends in reusable cooling products',
        'benefits of non-toxic ice packs for camping',
        'how to keep food fresh during long hiking trips',
        'best practices for ice pack maintenance',
        'comparing different cooling gel technologies',
        'eco-friendly alternatives to traditional ice',
        'cooling solutions for hot climate adventures',
        'food safety tips for outdoor enthusiasts',
        'maximizing ice pack lifespan and efficiency',
        'sustainable cooling for zero-waste camping'
      ]
    },
    {
      category: 'Adventure Stories',
      topics: [
        'epic outdoor adventures with reliable cooling gear',
        'summer camping tips for hot weather destinations',
        'wilderness survival cooling techniques',
        'backpacking in extreme heat conditions',
        'marine adventures and waterproof cooling',
        'desert hiking with proper cooling preparation',
        'family camping cooling success stories',
        'ultralight backpacking cooling strategies',
        'winter gear storage and summer preparation',
        'international adventure cooling challenges'
      ]
    },
    {
      category: 'Eco Living',
      topics: [
        'sustainable cooling solutions for environmentally conscious consumers',
        'reducing plastic waste with reusable cooling products',
        'carbon footprint of different cooling methods',
        'eco-friendly picnic and outdoor dining',
        'green alternatives to single-use ice packs',
        'sustainable outdoor lifestyle choices',
        'environmental impact of cooling technologies',
        'plastic-free camping and hiking gear',
        'renewable energy for portable cooling',
        'circular economy in outdoor gear industry'
      ]
    }
  ];

  useEffect(() => {
    if (activeTab === 'queue') {
      fetchContentQueue();
    }
  }, [activeTab]);

  const fetchContentQueue = async () => {
    try {
      const queue = await getContentQueue();
      setContentQueue(queue);
    } catch (error) {
      console.error('Failed to fetch content queue:', error);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const selectTopicSuggestion = (suggestedTopic: string, category: string) => {
    setTopic(suggestedTopic);
    const categoryObj = categories.find(c => c.name === category);
    if (categoryObj) {
      setSelectedCategory(categoryObj._id);
    }
    
    // Auto-generate relevant keywords
    const autoKeywords = extractKeywords(suggestedTopic);
    setKeywords(autoKeywords);
  };

  const extractKeywords = (text: string): string[] => {
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
    const words = text.toLowerCase().split(' ')
      .filter(word => !commonWords.includes(word) && word.length > 2)
      .slice(0, 5);
    
    // Add ICEPACA specific keywords
    const baseKeywords = ['icepaca', 'cooling products', 'ice packs'];
    return [...baseKeywords, ...words];
  };

  const handleGenerate = async () => {
    if (!topic || !selectedCategory) {
      alert('Please fill in topic and category');
      return;
    }

    const taskId = Date.now().toString();
    const newTask: GenerationTask = {
      id: taskId,
      topic,
      category: categories.find(c => c._id === selectedCategory)?.name || '',
      keywords,
      status: 'researching',
      progress: 0
    };

    setCurrentTask(newTask);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setCurrentTask(prev => {
          if (!prev) return null;
          const newProgress = Math.min(prev.progress + 10, 90);
          const status = newProgress < 30 ? 'researching' : 
                        newProgress < 70 ? 'generating' : prev.status;
          
          return { ...prev, progress: newProgress, status };
        });
      }, 1000);

      const result = generateNow 
        ? await generateContent({
            topic,
            category: selectedCategory,
            keywords
          })
        : await generateContent({
            topic,
            category: selectedCategory,
            keywords,
            scheduledFor: new Date(scheduledFor)
          });

      clearInterval(progressInterval);

      const completedTask: GenerationTask = {
        ...newTask,
        status: 'completed',
        progress: 100,
        result: {
          title: result.post.title,
          excerpt: result.post.excerpt,
          content: result.post.content,
          featuredImageUrl: result.post.featuredImage?.url,
          confidence: result.post.aiGenerated.confidence
        }
      };

      setCurrentTask(completedTask);
      setGenerationHistory(prev => [completedTask, ...prev]);
      
      // Reset form
      setTopic('');
      setKeywords([]);
      setSelectedCategory('');
      setScheduledFor('');
      
      // Notify parent
      onContentGenerated();

    } catch (error) {
      const errorTask: GenerationTask = {
        ...newTask,
        status: 'error',
        progress: 0,
        error: error.message || 'Generation failed'
      };
      
      setCurrentTask(errorTask);
      setGenerationHistory(prev => [errorTask, ...prev]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'researching':
        return <MagnifyingGlassIcon className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'generating':
        return <SparklesIcon className="w-5 h-5 text-purple-500 animate-pulse" />;
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      idle: 'bg-gray-100 text-gray-800',
      researching: 'bg-blue-100 text-blue-800',
      generating: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'generate', label: 'Generate Content', icon: SparklesIcon },
            { id: 'queue', label: 'Content Queue', icon: ClockIcon },
            { id: 'history', label: 'Generation History', icon: DocumentTextIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm',
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className="-ml-0.5 mr-2 h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'generate' && (
          <motion.div
            key="generate"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Content Generation Form */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                <SparklesIcon className="mr-2 h-5 w-5 text-purple-500" />
                AI Content Generator
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topic
                  </label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder="e.g., 2025 trends in reusable cooling products"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Keywords
                  </label>
                  <div className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                      placeholder="Add keyword..."
                    />
                    <button
                      onClick={addKeyword}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map(keyword => (
                      <span
                        key={keyword}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                      >
                        <TagIcon className="mr-1 h-3 w-3" />
                        {keyword}
                        <button
                          onClick={() => removeKeyword(keyword)}
                          className="ml-1 text-purple-600 hover:text-purple-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={generateNow}
                        onChange={(e) => setGenerateNow(e.target.checked)}
                        className="mr-2 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Generate now
                      </span>
                    </label>
                  </div>
                  
                  {!generateNow && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Schedule for
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledFor}
                        onChange={(e) => setScheduledFor(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleGenerate}
                  disabled={loading || !topic || !selectedCategory}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SparklesIcon className="mr-2 h-4 w-4" />
                  )}
                  {generateNow ? 'Generate Content' : 'Schedule Generation'}
                </button>
              </div>
            </div>
            
            {/* Topic Suggestions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                Topic Suggestions
              </h3>
              
              <div className="space-y-6">
                {topicSuggestions.map((categoryGroup) => (
                  <div key={categoryGroup.category}>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      {categoryGroup.category}
                    </h4>
                    <div className="space-y-2">
                      {categoryGroup.topics.slice(0, 5).map((suggestedTopic, index) => (
                        <button
                          key={index}
                          onClick={() => selectTopicSuggestion(suggestedTopic, categoryGroup.category)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                        >
                          {suggestedTopic}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'queue' && (
          <motion.div
            key="queue"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Content Generation Queue
                </h3>
              </div>
              
              {contentQueue.length === 0 ? (
                <div className="text-center py-12">
                  <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h4 className="mt-2 text-sm font-medium text-gray-900">No queued content</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    Schedule content generation to see items in the queue.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {contentQueue.map((item) => (
                    <div key={item._id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {item.topic}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Keywords: {item.keywords.join(', ')}
                          </p>
                          <p className="text-sm text-gray-500">
                            Scheduled: {new Date(item.scheduledFor).toLocaleString()}
                          </p>
                        </div>
                        <div className="ml-4">
                          <span className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            getStatusColor(item.status)
                          )}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1">{item.status}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Generation History
                </h3>
              </div>
              
              {generationHistory.length === 0 ? (
                <div className="text-center py-12">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h4 className="mt-2 text-sm font-medium text-gray-900">No generation history</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    Generate content to see your generation history.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {generationHistory.map((task) => (
                    <div key={task.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(task.status)}
                            <p className="text-sm font-medium text-gray-900">
                              {task.result?.title || task.topic}
                            </p>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Category: {task.category}
                          </p>
                          {task.result && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-600">
                                {task.result.excerpt}
                              </p>
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                <span>Confidence: {Math.round((task.result.confidence || 0) * 100)}%</span>
                                {task.result.featuredImageUrl && (
                                  <span className="flex items-center">
                                    <PhotoIcon className="mr-1 h-3 w-3" />
                                    Image generated
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          {task.error && (
                            <p className="text-sm text-red-600 mt-2">
                              Error: {task.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Generation Progress */}
      <AnimatePresence>
        {currentTask && currentTask.status !== 'completed' && currentTask.status !== 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-purple-100">
                    <SparklesIcon className="h-6 w-6 text-purple-600 animate-pulse" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Generating Content
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 capitalize">
                        {currentTask.status}...
                      </p>
                    </div>
                    <div className="mt-4">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${currentTask.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {currentTask.progress}% complete
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIContentGenerator;