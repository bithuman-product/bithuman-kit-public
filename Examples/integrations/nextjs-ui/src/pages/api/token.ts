import { NextApiRequest, NextApiResponse } from "next";
import { AccessToken, VideoGrant } from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

console.log('[token-api] Config:', {
  apiKey: apiKey ? `${apiKey.substring(0, 4)}...` : '(not set)',
});

// LiveKit auto-dispatches ROOM-type agent workers when a participant joins.
// No explicit createDispatch needed — just issue a token and let the user join.

export default async function handleToken(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (!apiKey || !apiSecret) {
      res.statusMessage = "Environment variables aren't set up correctly";
      res.status(500).end();
      return;
    }

    const roomName = (req.query.roomName as string) || "default-room";
    const identity = (req.query.participantName as string) || `user-${Math.random().toString(36).substring(7)}`;

    console.log('[token-api] Token request:', { roomName, identity });

    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      roomCreate: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    };

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: identity,
      ttl: 3600,
    });

    at.addGrant(grant);
    const token = await at.toJwt();

    // Client LiveKit URL: server.js proxies /rtc WebSocket to LiveKit,
    // so the browser connects to the same host:port as the frontend.
    const clientUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL
      || `ws://${req.headers.host || 'localhost:4202'}`;

    console.log('[token-api] Token issued:', { roomName, identity, url: clientUrl });

    res.status(200).json({
      accessToken: token,
      url: clientUrl,
      avatarImage: process.env.BITHUMAN_AVATAR_IMAGE || '',
    });
  } catch (e) {
    console.error('[token-api] Error:', e);
    res.statusMessage = (e as Error).message;
    res.status(500).end();
  }
}
