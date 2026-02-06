import { useState, useCallback } from 'react';
import { LocalParticipant, Track } from 'livekit-client';
import { VoiceAssistant } from '@livekit/components-react';

/**
 * Custom hook to manage audio controls (muting/unmuting)
 */
export function useAudioControls(
  voiceAssistant: VoiceAssistant | null, 
  localParticipant: LocalParticipant | null,
  setIsMicEnabled?: (enabled: boolean) => void
) {
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  
  // Function to toggle audio muting
  const toggleAudio = useCallback(async () => {
    const newMuteState = !isAudioMuted;
    setIsAudioMuted(newMuteState);
    
    try {
      // Set all audio elements to muted state (output)
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.muted = newMuteState;
      });
      
      // If we have the voice assistant's audio track, control that too
      if (
        voiceAssistant && 
        voiceAssistant.audioTrack && 
        voiceAssistant.audioTrack.track
      ) {
        // Some tracks have a mute() method
        if (
          typeof voiceAssistant.audioTrack.track.mute === 'function' && 
          typeof voiceAssistant.audioTrack.track.unmute === 'function'
        ) {
          if (newMuteState) {
            voiceAssistant.audioTrack.track.mute();
          } else {
            voiceAssistant.audioTrack.track.unmute();
          }
        }
      }
      
      // Also toggle microphone (input) if available
      if (localParticipant) {
        // If we're muting audio, also mute the microphone
        // If we're unmuting audio, also unmute the microphone
        const newMicState = !newMuteState;
        
        // First disable/enable at participant level
        await localParticipant.setMicrophoneEnabled(newMicState);
        
        // Then ensure all microphone tracks are properly muted/unmuted
        const publications = Array.from(localParticipant.trackPublications.values());
        publications.forEach(pub => {
          if (pub.kind === Track.Kind.Audio && pub.source === Track.Source.Microphone) {
            const track = pub.track;
            if (track) {
              if (newMuteState) {
                track.mute();
              } else {
                track.unmute();
              }
            }
          }
        });
        
        // Synchronize the mic enabled state in the UI
        if (setIsMicEnabled) {
          setIsMicEnabled(newMicState);
        }
        
        console.log(`Microphone ${newMicState ? 'enabled' : 'disabled'} via audio toggle`);
      }
    } catch (error) {
      console.error('Error toggling audio state:', error);
      // Revert state if there was an error
      setIsAudioMuted(!newMuteState);
    }
  }, [isAudioMuted, voiceAssistant, localParticipant, setIsMicEnabled]);
  
  return { isAudioMuted, toggleAudio };
} 