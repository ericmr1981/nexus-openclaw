import { useState } from 'react';

export function BitOfficeEmbed() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="bit-office-embed" style={{ height: 'calc(100vh - 80px)' }}>
      {loading && (
        <div className="embed-loading">
          <div className="loading-spinner" />
          <p>Loading Bit Office...</p>
        </div>
      )}
      <iframe
        src="http://localhost:3000"
        title="Bit Office"
        onLoad={() => setLoading(false)}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: loading ? 'none' : 'block',
        }}
      />
    </div>
  );
}
