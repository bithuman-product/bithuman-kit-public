import { NextApiRequest, NextApiResponse } from "next";
import { AccessToken, AgentDispatchClient, RoomServiceClient, VideoGrant } from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const livekitUrl = process.env.LIVEKIT_URL || "http://localhost:17880";

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

    // Extract basic parameters
    const roomName = (req.query.roomName as string) || "default-room";
    const identity = (req.query.participantName as string) || `user-${Math.random().toString(36).substring(7)}`;

    console.log('[token-api] Generating token for:', { roomName, identity });

    // Ensure the room exists and has an agent dispatched
    const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
    const agentDispatch = new AgentDispatchClient(livekitUrl, apiKey, apiSecret);

    try {
      await roomService.createRoom({ name: roomName });
      await agentDispatch.createDispatch(roomName, "");
      console.log('[token-api] Room created with agent dispatch');
    } catch (e) {
      // Room may already exist or dispatch already active — that's fine
      console.log('[token-api] Room/dispatch setup:', (e as Error).message?.substring(0, 100));
    }

    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      roomCreate: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    };

    // Create AccessToken with proper expiration
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: identity,
      ttl: 3600, // Token valid for 1 hour
    });

    at.addGrant(grant);
    const token = await at.toJwt();

    console.log('[token-api] Token generated successfully');

    res.status(200).json({
      accessToken: token,
      url: process.env.NEXT_PUBLIC_LIVEKIT_URL || ""
    });
  } catch (e) {
    console.error('[token-api] Error generating token:', e);
    res.statusMessage = (e as Error).message;
    res.status(500).end();
  }
}
