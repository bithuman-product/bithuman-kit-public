import React, { useState, useEffect } from 'react';
import { ConnectionState } from 'livekit-client';
import { useConnectionState } from '@livekit/components-react';

interface ConnectionStatusIndicatorProps {
  className?: string;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ 
  className = "fixed top-4 right-4 z-50" 
}) => {
  const roomState = useConnectionState();
  const [showStatus, setShowStatus] = useState(false);
  
  // Show status indicator temporarily when state changes or when disconnected
  useEffect(() => {
    if (roomState === ConnectionState.Disconnected || roomState === ConnectionState.Reconnecting) {
      setShowStatus(true);
    } else if (roomState === ConnectionState.Connected) {
      // Show briefly on successful connection, then fade out
      setShowStatus(true);
      const timer = setTimeout(() => setShowStatus(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [roomState]);

  // Auto-hide after 30 seconds for connecting states to avoid clutter
  useEffect(() => {
    if (roomState === ConnectionState.Connecting) {
      const timer = setTimeout(() => setShowStatus(false), 30000);
      return () => clearTimeout(timer);
    }
  }, [roomState]);

  // Don't show anything if connected and past the display timeout
  if (!showStatus && roomState === ConnectionState.Connected) {
    return null;
  }

  const getStatusConfig = () => {
    switch (roomState) {
      case ConnectionState.Connected:
        return {
          text: "Connected",
          bgColor: "bg-green-500",
          textColor: "text-white",
          icon: "●",
          pulse: false
        };
      case ConnectionState.Connecting:
        return {
          text: "Connecting...",
          bgColor: "bg-blue-500",
          textColor: "text-white",
          icon: "●",
          pulse: true
        };
      case ConnectionState.Reconnecting:
        return {
          text: "Reconnecting...",
          bgColor: "bg-yellow-500",
          textColor: "text-white",
          icon: "●",
          pulse: true
        };
      case ConnectionState.Disconnected:
        return {
          text: "Disconnected",
          bgColor: "bg-red-500",
          textColor: "text-white",
          icon: "●",
          pulse: false
        };
      default:
        return {
          text: "Unknown",
          bgColor: "bg-gray-500",
          textColor: "text-white",
          icon: "●",
          pulse: false
        };
    }
  };

  const status = getStatusConfig();

  return (
    <div className={className}>
      <div 
        className={`
          ${status.bgColor} ${status.textColor}
          px-3 py-2 rounded-lg shadow-lg
          flex items-center space-x-2
          text-sm font-medium
          transition-all duration-300
          ${status.pulse ? 'animate-pulse' : ''}
          backdrop-blur-sm bg-opacity-90
        `}
      >
        <span 
          className={`
            text-xs leading-none
            ${status.pulse ? 'animate-pulse' : ''}
          `}
        >
          {status.icon}
        </span>
        <span>{status.text}</span>
      </div>
    </div>
  );
}; 