"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { VideoSection } from './sections/VideoSection';
import { PlaygroundProvider, usePlayground } from '@/contexts/PlaygroundContext';
import { useConfig } from '@/hooks/useConfig';
import { 
  useLocalParticipant, 
  useConnectionState, 
  useVoiceAssistant, 
  useTracks,
  BarVisualizer 
} from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';

/**
 * Props for the Playground component
 */
export interface PlaygroundProps {
  /** Auto-connect when component loads */
  autoConnect?: boolean;
  /** Callback when connect/disconnect is clicked */
  onConnect: (connect: boolean) => void;
}

/**
 * Loading screen component with progress bar and particle effects
 */
const LoadingScreen = ({ progress }: { progress: number }) => {
  return (
    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Particle effects background */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
      
      {/* Progress bar */}
      <div className="w-96 h-1 bg-gray-900 rounded-full overflow-hidden relative z-10">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 transition-all duration-1000 ease-out shadow-lg"
          style={{ width: `${progress}%` }}
        />
        {/* Glowing effect */}
        <div 
          className="absolute top-0 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-1000 ease-out"
          style={{ 
            width: '20%',
            left: `${Math.max(0, progress - 10)}%`,
            opacity: progress > 0 ? 1 : 0
          }}
        />
      </div>
    </div>
  );
};

/**
 * Camera Icon Component
 */
const CameraIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {!enabled && <line x1="1" y1="1" x2="23" y2="23"/>}
    <polygon points="23 7 16 12 23 17 23 7"/>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
);

/**
 * Microphone Icon Component
 */
const MicrophoneIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {!enabled && <line x1="1" y1="1" x2="23" y2="23"/>}
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

/**
 * Audio/Speaker Icon Component
 */
const AudioIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {!enabled && <line x1="23" y1="9" x2="17" y2="15"/>}
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    {enabled && (
      <>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </>
    )}
  </svg>
);

/**
 * PlaygroundPresenter component handles the UI rendering with context-provided state
 */
const PlaygroundPresenter = () => {
  const { config } = useConfig();
  const { 
    // State - only keep essential camera/mic states
    isCameraEnabled,
    isMicEnabled,
    isAudioMuted,
    
    // Actions - only keep essential actions
    toggleCamera,
    toggleMicrophone,
    toggleAudio,
  } = usePlayground();
  
  const roomState = useConnectionState();
  const voiceAssistant = useVoiceAssistant();
  
  // Loading state and progress
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get voice assistant state and audio track for visualizer
  const { state: agentState, audioTrack: agentAudioTrack } = useVoiceAssistant();
  
  // Get video tracks using the useTracks hook
  const localTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );
  
  const localVideoTrack = localTracks.find(
    track => track.source === Track.Source.Camera
  );

  // Handle loading progress
  useEffect(() => {
    if (roomState === ConnectionState.Connected) {
      // Complete the progress and hide loading after a short delay
      setLoadingProgress(100);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    } else if (roomState === ConnectionState.Connecting) {
      // Simulate progress during connection
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev; // Stop at 90% until actually connected
          return prev + 2;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [roomState]);

  // Initialize loading progress
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingProgress(10);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen progress={loadingProgress} />;
  }

  return (
    <div className="flex flex-col justify-center items-center bg-black text-white overflow-hidden h-full w-full relative">
      {/* Main video display */}
      <VideoSection
        roomState={roomState}
        agentVideoTrack={voiceAssistant?.videoTrack}
        localVideoTrack={localVideoTrack}
        isCameraEnabled={isCameraEnabled}
        showEmojiAnimation={false}
        activeEmoji={null}
        config={config}
        isSlideCentric={false}
      />
      
      {/* bitHuman logo in top left corner */}
      <div className="absolute top-4 left-4 z-10">
        <a 
          href="https://bithuman.ai" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <Image 
            src="/bitHuman.png" 
            alt="bitHuman" 
            width={48}
            height={48}
            className="opacity-70 hover:opacity-90 transition-opacity duration-300 cursor-pointer"
          />
        </a>
      </div>
      
      {/* Integrated control panel with voice activity indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 px-5 py-4 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
        {/* Voice activity section */}
        {isMicEnabled && agentAudioTrack && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-white/90">Listening</span>
            </div>
            <div className="h-8 w-16">
              <BarVisualizer
                state={agentState}
                barCount={5}
                trackRef={agentAudioTrack}
                className="lk-audio-bar-visualizer-glass"
              />
            </div>
          </div>
        )}
        
        {/* Divider line if voice activity is shown */}
        {isMicEnabled && agentAudioTrack && (
          <div className="w-px h-6 bg-white/20"></div>
        )}
        
        {/* Control buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCamera}
            className={`
              p-3 rounded-xl transition-all duration-300 backdrop-blur-sm
              bg-white/10 text-white/80 border border-white/20
              hover:bg-white/20 hover:text-white hover:border-white/30 hover:scale-110 
              active:scale-95 active:bg-white/30
              ${!isCameraEnabled ? 'opacity-50' : 'opacity-100'}
            `}
            title={isCameraEnabled ? 'Turn camera off' : 'Turn camera on'}
          >
            <CameraIcon enabled={isCameraEnabled} />
          </button>
          
          <button
            onClick={toggleMicrophone}
            className={`
              p-3 rounded-xl transition-all duration-300 backdrop-blur-sm
              bg-white/10 text-white/80 border border-white/20
              hover:bg-white/20 hover:text-white hover:border-white/30 hover:scale-110 
              active:scale-95 active:bg-white/30
              ${!isMicEnabled ? 'opacity-50' : 'opacity-100'}
            `}
            title={isMicEnabled ? 'Turn microphone off' : 'Turn microphone on'}
          >
            <MicrophoneIcon enabled={isMicEnabled} />
          </button>
          
          <button
            onClick={toggleAudio}
            className={`
              p-3 rounded-xl transition-all duration-300 backdrop-blur-sm
              bg-white/10 text-white/80 border border-white/20
              hover:bg-white/20 hover:text-white hover:border-white/30 hover:scale-110 
              active:scale-95 active:bg-white/30
              ${isAudioMuted ? 'opacity-50' : 'opacity-100'}
            `}
            title={!isAudioMuted ? 'Mute audio' : 'Unmute audio'}
          >
            <AudioIcon enabled={!isAudioMuted} />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main Playground component that wraps the presenter in a context provider
 */
export default function Playground({
  autoConnect = false,
  onConnect,
}: PlaygroundProps) {
  const roomState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const voiceAssistant = useVoiceAssistant();

  // Auto connect on mount if autoConnect is true
  useEffect(() => {
    if (autoConnect && roomState === ConnectionState.Disconnected) {
      onConnect(true);
    }
  }, [autoConnect, roomState, onConnect]);
    
  return (
    <PlaygroundProvider
      localParticipant={localParticipant}
      voiceAssistant={voiceAssistant}
      roomState={roomState}
    >
      <PlaygroundPresenter />
    </PlaygroundProvider>
  );
}
