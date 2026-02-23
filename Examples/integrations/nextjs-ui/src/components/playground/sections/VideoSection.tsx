import React from 'react';
import { TrackReferenceOrPlaceholder } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import { VideoDisplay } from '../VideoDisplay';

interface VideoSectionConfig {
  video_fit?: string;
}

interface VideoSectionProps {
  roomState: ConnectionState;
  agentVideoTrack: TrackReferenceOrPlaceholder;
  localVideoTrack: TrackReferenceOrPlaceholder;
  isCameraEnabled: boolean;
  showEmojiAnimation: boolean;
  activeEmoji: string | null;
  config: VideoSectionConfig;
  isSlideCentric: boolean;
}

/**
 * Video section component with support for displaying agent and user video
 */
export const VideoSection = ({
  roomState,
  agentVideoTrack,
  localVideoTrack,
  isCameraEnabled,
  config,
}: VideoSectionProps) => {
  // Simple loading text for connecting states
  const loadingContent = (
    <div className="flex items-center justify-center h-full w-full">
      <div className="text-white text-xl">Connecting...</div>
    </div>
  );

  let content = null;
  
  if (roomState === ConnectionState.Connected) {
    // Only directly show content when fully connected
    content = (
      <VideoDisplay
        agentVideoTrack={agentVideoTrack}
        localVideoTrack={localVideoTrack}
        isCameraEnabled={isCameraEnabled}
        roomState={roomState}
        videoFit={config.video_fit || 'cover'}
      />
    );
  } else {
    // For all other states (Disconnected, Connecting, Reconnecting) show a loading message
    content = loadingContent;
  }

  return (
    <div className="flex flex-col w-full h-full grow text-gray-950 bg-black rounded-md relative">
      {content}
    </div>
  );
}; 