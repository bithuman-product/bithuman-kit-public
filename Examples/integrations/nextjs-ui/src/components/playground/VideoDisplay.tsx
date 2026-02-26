/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useRef, useState } from 'react';
import { VideoTrack, TrackReferenceOrPlaceholder } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';

interface VideoDisplayProps {
  agentVideoTrack?: TrackReferenceOrPlaceholder;
  localVideoTrack?: TrackReferenceOrPlaceholder;
  isCameraEnabled: boolean;
  roomState: ConnectionState;
  videoFit: string;
  avatarImage?: string;
}

function useFpsCounter(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [fps, setFps] = useState<number | null>(null);
  const prevFrames = useRef(0);
  const prevTime = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number;

    const measure = () => {
      const video = container.querySelector('video');
      if (video) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quality = (video as any).getVideoPlaybackQuality?.();
        const now = performance.now();

        if (quality) {
          const totalFrames = quality.totalVideoFrames;
          if (prevTime.current > 0) {
            const elapsed = (now - prevTime.current) / 1000;
            if (elapsed >= 1) {
              const delta = totalFrames - prevFrames.current;
              setFps(Math.round(delta / elapsed));
              prevFrames.current = totalFrames;
              prevTime.current = now;
            }
          } else {
            prevFrames.current = totalFrames;
            prevTime.current = now;
          }
        }
      }

      rafId = requestAnimationFrame(measure);
    };

    rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, [containerRef]);

  return fps;
}

export const VideoDisplay = ({
  agentVideoTrack,
  localVideoTrack,
  isCameraEnabled,
  videoFit = 'cover',
  avatarImage,
}: VideoDisplayProps) => {
  const agentVideoRef = useRef<HTMLDivElement | null>(null);
  const fps = useFpsCounter(agentVideoRef);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {/* Avatar placeholder image (shown while waiting for video stream) */}
      {!agentVideoTrack && avatarImage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <img src={avatarImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Agent video */}
      {agentVideoTrack && (
        <div className="absolute inset-0" ref={agentVideoRef}>
          <VideoTrack
            trackRef={agentVideoTrack}
            className={`w-full h-full object-${videoFit}`}
          />
        </div>
      )}

      {/* FPS overlay */}
      {fps !== null && fps > 0 && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/50 text-white/80 text-xs font-mono z-10">
          {fps} FPS
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
