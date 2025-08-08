import { useState, useEffect } from 'react';

interface ApprovalStats {
  totalPending: number;
  aiPending: number;
  highPriority: number;
  last24Hours: number;
}

export const useApprovalNotifications = () => {
  const [stats, setStats] = useState<ApprovalStats>({
    totalPending: 0,
    aiPending: 0,
    highPriority: 0,
    last24Hours: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovalStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/blog/admin/posts?status=pending_approval&limit=100', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch approval stats');
      }

      const data = await response.json();
      const posts = data.posts || [];

      // Calculate stats
      const totalPending = posts.length;
      const aiPending = posts.filter((post: any) => 
        post.aiGenerated?.isAIGenerated && post.aiGenerated?.reviewStatus === 'pending'
      ).length;
      
      const highPriority = posts.filter((post: any) => 
        (post.aiGenerated?.isAIGenerated && post.aiGenerated?.confidence > 0.8) ||
        new Date(post.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
      ).length;
      
      const last24Hours = posts.filter((post: any) => 
        new Date(post.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
      ).length;

      setStats({
        totalPending,
        aiPending,
        highPriority,
        last24Hours
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch approval stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovalStats();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchApprovalStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    loading,
    error,
    refresh: fetchApprovalStats
  };
};

export default useApprovalNotifications;