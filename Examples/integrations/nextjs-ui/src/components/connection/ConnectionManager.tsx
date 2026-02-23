import React, { useEffect, useCallback, useState } from 'react';
import { useToast } from '@/components/toast/ToasterProvider';
import { 
  DisconnectReason, 
  RoomEvent 
} from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';

interface ConnectionManagerProps {
  children: React.ReactNode;
}

interface ReconnectionState {
  isReconnecting: boolean;
}

export function ConnectionManager({ children }: ConnectionManagerProps) {
  const { setToastMessage } = useToast();
  const room = useRoomContext();
  
  // Simplified reconnection state
  const [reconnectionState, setReconnectionState] = useState<ReconnectionState>({
    isReconnecting: false
  });

  // Handle disconnection and show message (LiveKit handles reconnection internally)
  const handleDisconnection = useCallback(() => {
    if (reconnectionState.isReconnecting) {
      return;
    }

    console.log('[ConnectionManager] Connection lost');
    setToastMessage({
      message: 'Connection lost. Attempting to reconnect...',
      type: 'error'
    });

    setReconnectionState({
      isReconnecting: true
    });
  }, [reconnectionState.isReconnecting, setToastMessage]);

  // Handle room events
  useEffect(() => {
    if (!room) return;

    const handleDisconnected = (reason?: DisconnectReason) => {
      console.log('[ConnectionManager] Room disconnected:', reason);
      
      // Show disconnect message for any reason
      setToastMessage({
        message: 'Connection ended',
        type: 'error'
      });

      // Call the disconnect handler when we actually disconnect
      handleDisconnection();
    };

    const handleReconnecting = () => {
      console.log('[ConnectionManager] Room reconnecting...');
      setReconnectionState({
        isReconnecting: true
      });
      
      setToastMessage({
        message: 'Reconnecting...',
        type: 'error'
      });
    };

    const handleReconnected = () => {
      console.log('[ConnectionManager] Room reconnected');
      setReconnectionState({
        isReconnecting: false
      });

      setToastMessage({
        message: 'Reconnected successfully',
        type: 'success'
      });
    };

    const handleConnected = () => {
      console.log('[ConnectionManager] Room connected');
      // Reset reconnection state on successful connection
      setReconnectionState({
        isReconnecting: false
      });
    };

    // Subscribe to room events
    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.Reconnecting, handleReconnecting);
    room.on(RoomEvent.Reconnected, handleReconnected);
    room.on(RoomEvent.Connected, handleConnected);

    return () => {
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(RoomEvent.Reconnecting, handleReconnecting);
      room.off(RoomEvent.Reconnected, handleReconnected);
      room.off(RoomEvent.Connected, handleConnected);
    };
  }, [room, setToastMessage, handleDisconnection]);

  return <>{children}</>;
}; 