import React, { useState, useEffect } from 'react';

interface StatusData {
  ongoing_incidents?: Array<{
    current_worst_impact: string;
  }>;
  in_progress_maintenances?: Array<{
    id: string;
    status: string;
  }>;
  scheduled_maintenances?: Array<{
    starts_at: string;
  }>;
}

interface StatusState {
  dotClass: string;
  statusMessage: string;
}

export const FernStatusWidget: React.FC = () => {
  const [status, setStatus] = useState<StatusState>({
    dotClass: 'is-loading',
    statusMessage: 'Checking status...'
  });

  const apiEndpoint = 'https://status.buildwithfern.com/api/v1/summary';
  const refreshInterval = 5 * 60 * 1000; // 5 minutes

  const updateStatus = (data: StatusData) => {
    let dotClass = 'is-green';
    let statusMessage = 'All systems operational';
    
    // Check for ongoing incidents
    if (data.ongoing_incidents && data.ongoing_incidents.length > 0) {
      let worstImpact = 0;
      for (const incident of data.ongoing_incidents) {
        let impactLevel = 0;
        
        if (incident.current_worst_impact === 'degraded_performance') {
          impactLevel = 1;
        } else if (incident.current_worst_impact === 'partial_outage') {
          impactLevel = 2;
        } else if (incident.current_worst_impact === 'full_outage') {
          impactLevel = 3;
        }
        
        if (impactLevel > worstImpact) {
          worstImpact = impactLevel;
        }
      }
      
      // Set status based on severity
      if (worstImpact === 3) {
        dotClass = 'is-red';
        statusMessage = 'Service outage';
      } else if (worstImpact === 2) {
        dotClass = 'is-orange';
        statusMessage = 'Partial outage';
      } else if (worstImpact === 1) {
        dotClass = 'is-yellow';
        statusMessage = 'Degraded performance';
      }
    }
    
    // Check for in-progress maintenance
    if (data.in_progress_maintenances && data.in_progress_maintenances.length > 0) {
      if (dotClass === 'is-green') {
        dotClass = 'is-blue';
        statusMessage = 'Maintenance in progress';
      }
    }
    
    // Check for scheduled maintenance
    if (data.scheduled_maintenances && data.scheduled_maintenances.length > 0) {
      if (dotClass === 'is-green') {
        const now = new Date();
        let soonMaintenance = false;
        
        for (const maintenance of data.scheduled_maintenances) {
          const startsAt = new Date(maintenance.starts_at);
          const hoursDiff = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
          
          if (hoursDiff <= 24) {
            soonMaintenance = true;
            break;
          }
        }
        
        if (soonMaintenance) {
          dotClass = 'is-blue';
          statusMessage = 'Scheduled maintenance soon';
        }
      }
    }
    
    setStatus({ dotClass, statusMessage });
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch(apiEndpoint);
      if (response.ok) {
        const data: StatusData = await response.json();
        updateStatus(data);
      } else {
        setStatus({ dotClass: 'is-red', statusMessage: 'Cannot check status' });
      }
    } catch (error) {
      console.error('Error fetching status:', error);
      setStatus({ dotClass: 'is-red', statusMessage: 'Cannot check status' });
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, refreshInterval);
    return () => clearInterval(interval);
  }, []);

  const getBackgroundColor = () => {
    switch (status.dotClass) {
      case 'is-green': return '#00c853';
      case 'is-red': return '#f44336';
      case 'is-orange': return '#ff9800';
      case 'is-blue': return '#2196f3';
      case 'is-yellow': return '#ffc107';
      case 'is-loading': return '#cccccc';
      default: return '#cccccc';
    }
  };

  return (
    <a 
      href="https://status.buildwithfern.com" 
      target="_blank" 
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div id="fern-status-widget" className="fern-status-widget">
        <div 
          className={`footer_badge-dot ${status.dotClass}`}
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            marginRight: '8px',
            position: 'relative',
            display: 'inline-block',
            backgroundColor: getBackgroundColor(),
          }}
        />
        <span id="fern-status-text" className="fern-status-text">{status.statusMessage}</span>
        
        <style>{`
          .fern-status-widget {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            border-radius: 9999px;
            padding: 0.25rem 0.75rem;
            align-self: flex-start;
            cursor: pointer;
            text-decoration: none;
            transition: background-color 150ms ease, color 150ms ease;
            height: 2rem;
          }

          .fern-status-widget svg {
            display: none !important;
          }

          .fern-status-widget:hover {
            background-color: var(--grayscale-a4);
          }

          .fern-status-widget:hover .fern-status-text {
            color: var(--grayscale-12);
          }

          .fern-status-text {
            font-size: 0.875rem;
            color: var(--grayscale-10);
            font-weight: 400;
          }

          .footer_badge-dot::after {
            content: '';
            position: absolute;
            top: -4px;
            left: -4px;
            right: -4px;
            bottom: -4px;
            border-radius: 50%;
            background: radial-gradient(circle, transparent 0%, currentColor 70%, currentColor 100%);
            opacity: 0.4;
            animation: pulse-expand 2s infinite ease-out;
          }
          
          .footer_badge-dot.is-green::after { color: #00c853; }
          .footer_badge-dot.is-red::after { color: #f44336; }
          .footer_badge-dot.is-orange::after { color: #ff9800; }
          .footer_badge-dot.is-blue::after { color: #2196f3; }
          .footer_badge-dot.is-yellow::after { color: #ffc107; }
          .footer_badge-dot.is-loading::after { color: #cccccc; }
          
          @keyframes pulse-expand {
            0% { transform: scale(0.6); opacity: 0.5; }
            100% { transform: scale(1.5); opacity: 0; }
          }
        `}</style>
      </div>
    </a>
  );
};
