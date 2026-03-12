import { useState, useEffect } from 'react';

interface SystemMetrics {
  cpu: {
    percentage: number;
    cores: number;
  };
  memory: {
    percentage: number;
    used: number;
    total: number;
    process: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
    };
  };
}

export function useSystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/system/metrics');
        if (!response.ok) {
          throw new Error('Failed to fetch system metrics');
        }
        const data = await response.json();
        setMetrics(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch system metrics:', error);
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchMetrics();

    // Then fetch every 5 seconds
    const interval = setInterval(fetchMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  return { metrics, loading };
}