import React, { useState, useEffect } from 'react';

interface OAStatus {
  running: boolean;
  port: number;
  pid?: number;
  url?: string;
  startedByNexus?: boolean;
}

const OAPage: React.FC = () => {
  const [status, setStatus] = useState<OAStatus>({ running: false, port: 3460 });

  // Fetch OA status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/oa/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch OA status:', err);
    }
  };

  return (
    <div className="oa-page">
      {/* Embedded View - fills the remaining space */}
      {status.running && status.url ? (
        <iframe
          src={status.url}
          title="OA Dashboard"
          className="oa-iframe"
        />
      ) : (
        <div className="oa-loading">
          <p>OA Service not running</p>
          <p className="hint">Start the OA service from the control panel to view the dashboard</p>
        </div>
      )}
    </div>
  );
};

export default OAPage;
