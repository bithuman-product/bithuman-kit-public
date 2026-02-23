import React from 'react';
import { VideoTrack, TrackReferenceOrPlaceholder } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';

interface VideoDisplayProps {
  agentVideoTrack?: TrackReferenceOrPlaceholder;
  localVideoTrack?: TrackReferenceOrPlaceholder;
  isCameraEnabled: boolean;
  roomState: ConnectionState;
  videoFit: string;
}

export const VideoDisplay = ({
  agentVideoTrack,
  localVideoTrack,
  isCameraEnabled,
  videoFit = 'cover',
}: VideoDisplayProps) => {
  
  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {/* Agent video */}
      {agentVideoTrack && (
        <div className="absolute inset-0">
          <VideoTrack
            trackRef={agentVideoTrack}
            className={`w-full h-full object-${videoFit}`}
          />
        </div>
      )}
      
      {/* Local user video */}
      {localVideoTrack && isCameraEnabled && (
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20">
          <VideoTrack
            trackRef={localVideoTrack}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}; 