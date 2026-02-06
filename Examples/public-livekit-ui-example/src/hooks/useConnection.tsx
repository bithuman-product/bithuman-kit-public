"use client"

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useConfig } from '@/hooks/useConfig';

export type ConnectionMode = "env" | "manual";

type TokenGeneratorData = {
  shouldConnect: boolean;
  wsUrl: string;
  token: string;
  mode: ConnectionMode;
  disconnect: () => Promise<void>;
  connect: (mode: ConnectionMode) => Promise<void>;
};

const ConnectionContext = createContext<TokenGeneratorData | undefined>(undefined);

export const ConnectionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { config } = useConfig();
  const [connectionDetails, setConnectionDetails] = useState<{
    wsUrl: string;
    token: string;
    mode: ConnectionMode;
    shouldConnect: boolean;
  }>({ wsUrl: "", token: "", shouldConnect: false, mode: "manual" });

  const connect = useCallback(
    async (mode: ConnectionMode) => {
      // Prevent duplicate requests
      if (connectionDetails.shouldConnect && connectionDetails.mode === mode) {
        console.log('[connection] Already connected with the same mode, skipping duplicate request');
        return;
      }
      
      // Set connecting state immediately to prevent parallel requests
      setConnectionDetails(prev => ({ ...prev, mode }));
      
      let token = "";
      let url = "";
      
      if (mode === "env") {
        if (!process.env.NEXT_PUBLIC_LIVEKIT_URL) {
          throw new Error("NEXT_PUBLIC_LIVEKIT_URL is not set");
        }
        url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
        
        // Simple parameter setup
        const params = new URLSearchParams();
        if (config.settings.room_name) {
          params.append('roomName', config.settings.room_name);
        }
        if (config.settings.participant_name) {
          params.append('participantName', config.settings.participant_name);
        }
        
        // Get token from the API
        const tokenUrl = `/api/token?${params.toString()}`;
        console.log('[connection] Fetching token from:', tokenUrl);
        const response = await fetch(tokenUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch token: ${response.status}`);
        }
        
        const data = await response.json();
        token = data.accessToken;
        
        if (!token) {
          throw new Error("Failed to get access token");
        }
      }

      console.log('[connection] Connection successful:', { mode, url: url.substring(0, 50) + '...' });

      setConnectionDetails({
        wsUrl: url,
        token: token,
        shouldConnect: true,
        mode,
      });
    },
    [connectionDetails.shouldConnect, connectionDetails.mode, config.settings.room_name, config.settings.participant_name]
  );

  const disconnect = useCallback(async () => {
    console.log('[connection] Disconnecting...');
    setConnectionDetails({
      wsUrl: "",
      token: "",
      shouldConnect: false,
      mode: "manual",
    });
  }, []);

  return (
    <ConnectionContext.Provider
      value={{
        wsUrl: connectionDetails.wsUrl,
        token: connectionDetails.token,
        shouldConnect: connectionDetails.shouldConnect,
        mode: connectionDetails.mode,
        connect,
        disconnect,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error("useConnection must be used within a ConnectionProvider");
  }
  return context;
};

export const useAppConfig = () => {
  // Simple default config for basic functionality
  return {
    title: "Video Chat",
    description: "Simple video chat interface",
    settings: {
      editable: true,
      theme_color: "blue",
      chat: false,
      inputs: {
        camera: true,
        mic: true,
      },
      outputs: {
        audio: true,
        video: true,
      },
      ws_url: "",
      token: "",
      room_name: "default-room",
      participant_name: "user",
    },
  };
};