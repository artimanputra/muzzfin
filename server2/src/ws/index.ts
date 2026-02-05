import { Server as SocketIOServer, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";
import dotenv from "dotenv";
<<<<<<< HEAD
import axios from "axios";

dotenv.config();

const redisUrl =
  "redis://default:xxXaPbgzkRHgmAxkhwmfJkbkkXylbLth@caboose.proxy.rlwy.net:31117";

if (!redisUrl) throw new Error("❌ Missing REDIS_URL env variable");
=======

dotenv.config();

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("❌ Missing REDIS_URL env variable");
}
>>>>>>> e579cbc

const prisma = new PrismaClient();
const redisPub = createClient({ url: redisUrl });
const redisSub = createClient({ url: redisUrl });

<<<<<<< HEAD
const redisPubConnect = async () => await redisPub.connect();
const redisSubConnect = async () => await redisSub.connect();

async function connectRedis() {
  try {
    await redisPubConnect();
    await redisSubConnect();
    console.log("✅ Connected to Redis on Railway");
  } catch (err) {
    console.error("❌ Redis connection failed:", err);
  }
=======
async function connectRedis() {
  await redisPub.connect();
  await redisSub.connect();
  console.log("✅ Redis connected");
>>>>>>> e579cbc
}
connectRedis();

// Track clients per stream
const streamClients: Map<string, Set<string>> = new Map();

<<<<<<< HEAD
// Playback state per stream
interface StreamPlaybackState {
  isPlaying: boolean;
  currentTime: number; // seconds
  lastUpdate: number; // timestamp
}

async function setPlaybackState(streamId: string, state: StreamPlaybackState) {
=======
interface StreamPlaybackState {
  isPlaying: boolean;
  currentTime: number; // seconds
}

async function setPlaybackState(
  streamId: string,
  state: StreamPlaybackState
) {
>>>>>>> e579cbc
  await redisPub.hSet(`playback:${streamId}`, {
    isPlaying: state.isPlaying ? "1" : "0",
    currentTime: state.currentTime.toString(),
  });
}

async function getPlaybackState(
  streamId: string
): Promise<StreamPlaybackState | null> {
  const data = await redisPub.hGetAll(`playback:${streamId}`);
  if (!data || Object.keys(data).length === 0) return null;
  return {
    isPlaying: data.isPlaying === "1",
    currentTime: parseFloat(data.currentTime) || 0,
  };
}

<<<<<<< HEAD
export function createSocketServer(server: any, prisma: PrismaClient) {
  const io = new SocketIOServer(server, { cors: { origin: "*" } });

  function broadcastToStream(streamId: string, message: any) {
    io.to(streamId).emit("message", message);
    redisPub.publish(`stream:${streamId}`, JSON.stringify(message));
  }

  // Redis cross-instance sync
  redisSub.pSubscribe("stream:*", (msg: any, channel: any) => {
    const streamId = channel.split(":")[1];
    io.to(streamId).emit("message", JSON.parse(msg));
=======
function broadcastToStream(
  io: SocketIOServer,
  streamId: string,
  message: any
) {
  io.to(streamId).emit("message", message);
  redisPub.publish(`stream:${streamId}`, JSON.stringify(message));
}

export function createSocketServer(server: any, prismaClient: PrismaClient) {
  const io = new SocketIOServer(server, { cors: { origin: "*" } });

  redisSub.pSubscribe("stream:*", (msg, channel) => {
    try {
      const parts = channel.split(":");
      const streamId = parts[1];
      io.to(streamId).emit("message", JSON.parse(msg));
    } catch (err) {
      console.error("Redis pSubscribe error:", err);
    }
>>>>>>> e579cbc
  });

  io.on("connection", (socket: Socket) => {
    let joinedStreamId: string | null = null;

    socket.on("message", async ({ action, payload }: any) => {
      try {
        switch (action) {
          case "join_stream": {
            const { streamId, userId, role } = payload || {};
            if (!streamId || !userId) {
              socket.emit("message", { error: "🚫 Missing streamId or userId" });
              return;
            }
            joinedStreamId = streamId;
            socket.join(streamId);
            (socket as any).data = { role, streamId };

<<<<<<< HEAD
            // Initialize playback state if not exists
=======
            if (!streamClients.has(streamId)) {
              streamClients.set(streamId, new Set());
            }
            streamClients.get(streamId)!.add(socket.id);

            // Ensure playback state exists
>>>>>>> e579cbc
            let state = await getPlaybackState(streamId);
            if (!state) {
              state = { isPlaying: false, currentTime: 0 };
              await setPlaybackState(streamId, state);
            }

<<<<<<< HEAD
            // Send current playback state
            socket.emit("message", { action: "playback_state", payload: state });
=======
            // Send current state to this client
            socket.emit("message", {
              action: "playback_state",
              payload: { ...state },
            });
>>>>>>> e579cbc

            // Notify viewer count
            broadcastToStream(io, streamId, {
              action: "viewer_count",
              payload: { count: streamClients.get(streamId)!.size },
            });

            break;
          }

          case "play": {
            if (!joinedStreamId) return;
<<<<<<< HEAD
            let state = await getPlaybackState(joinedStreamId);
            if (!state) state = { isPlaying: false, currentTime: 0, lastUpdate: Date.now() };

            state.isPlaying = true;
            state.lastUpdate = Date.now();
            await setPlaybackState(joinedStreamId, state);

            broadcastToStream(joinedStreamId, { action: "play" });
=======
            const { position } = payload || {};
            const time = typeof position === "number" && position >= 0
              ? position
              : 0;
            const state =
              (await getPlaybackState(joinedStreamId)) || {
                isPlaying: false,
                currentTime: 0,
              };
            state.isPlaying = true;
            state.currentTime = time;
            await setPlaybackState(joinedStreamId, state);
            broadcastToStream(io, joinedStreamId, {
              action: "play",
              payload: { currentTime: time },
            });
>>>>>>> e579cbc
            break;
          }

          case "pause": {
            if (!joinedStreamId) return;
<<<<<<< HEAD
            let state = await getPlaybackState(joinedStreamId);
            if (!state) return;

            if (state.isPlaying) {
              const elapsed = (Date.now() - state.lastUpdate) / 1000;
              state.currentTime += elapsed;
            }
            state.isPlaying = false;
            state.lastUpdate = Date.now();
            await setPlaybackState(joinedStreamId, state);

            broadcastToStream(joinedStreamId, { action: "pause" });
=======
            const { position } = payload || {};
            const time = typeof position === "number" && position >= 0
              ? position
              : 0;
            const state =
              (await getPlaybackState(joinedStreamId)) || {
                isPlaying: false,
                currentTime: 0,
              };
            state.isPlaying = false;
            state.currentTime = time;
            await setPlaybackState(joinedStreamId, state);
            broadcastToStream(io, joinedStreamId, {
              action: "pause",
              payload: { currentTime: time },
            });
>>>>>>> e579cbc
            break;
          }

          case "seek": {
            if (!joinedStreamId) return;
<<<<<<< HEAD
            const { position } = payload;
            if (typeof position !== "number" || position < 0) {
              socket.emit("message", { error: "⚠️ Invalid seek time" });
              return;
            }

            let state = await getPlaybackState(joinedStreamId);
            if (!state) state = { isPlaying: false, currentTime: 0, lastUpdate: Date.now() };

            state.currentTime = position;
            state.lastUpdate = Date.now();
            await setPlaybackState(joinedStreamId, state);

            broadcastToStream(joinedStreamId, {
              action: "seek",
              payload: { currentTime: position },
            });
            break;
          }

          case "add_song": {
            const { url, streamId, userId } = payload;
            if (!url || !streamId || !userId) {
              socket.emit("message", { error: "⚠️ Missing url, streamId, or userId" });
              return;
            }

            try {
              const checkSong = await prisma.song.findFirst({ where: { url, streamId } });
              if (checkSong) {
                socket.emit("message", { error: "⚠️ Song already exists in this stream" });
                return;
              }

              const downloadedSong = await prisma.downloadedSong.findUnique({ where: { url } });
              const videoId = getYouTubeVideoId(url);
              if (!videoId) {
                socket.emit("message", { error: "⚠️ Invalid YouTube URL" });
                return;
              }
              const metadata = await getYouTubeMetadata(videoId);

              const result = await prisma.$transaction(async (tx: any) => {
                const newSong = await tx.song.create({
                  data: {
                    url,
                    title: metadata.title,
                    artist: metadata.artist,
                    thumbnail: metadata.thumbnail,
                    duration: metadata.duration,
                    addedAt: new Date(),
                    addedBy: { connect: { id: userId } },
                    downloadedSong: downloadedSong ? { connect: { id: downloadedSong.id } } : undefined,
                    hasSong: !!downloadedSong,
                  },
                });

                const streamDb = await tx.stream.findUnique({ where: { id: streamId }, select: { currentSongId: true } });

                let updatedStream;
                if (!streamDb?.currentSongId) {
                  updatedStream = await tx.stream.update({
                    where: { id: streamId },
                    data: { currentSong: { connect: { id: newSong.id } } },
                    include: { currentSong: true, queue: true },
                  });
                } else {
                  updatedStream = await tx.stream.update({
                    where: { id: streamId },
                    data: { queue: { connect: { id: newSong.id } } },
                    include: { currentSong: true, queue: true },
                  });
                }

                return { newSong, updatedQueue: updatedStream.queue };
              });

              await redisPub.rPush(`queue:${streamId}`, JSON.stringify(result.newSong));

              if (!downloadedSong) {
                try {
                  await axios.post(`${process.env.BACKEND_URL}/`, { hostId: streamId, url });
                } catch (err: any) {
                  console.error("⚠️ Failed to trigger download job:", err.message);
                  socket.emit("message", { error: "Failed to trigger download job" });
                }
              }

              socket.emit("message", { action: "song_added", data: result });
              broadcastToStream(streamId, { action: "song_added_broadcast", data: result });
            } catch (error) {
              console.error("❌ Error creating song:", error);
              socket.emit("message", { error: "Failed to create song" });
            }
            break;
          }

          case "vote_song":
            await voteSongHandler(socket, payload, prisma, (msg) => broadcastToStream(joinedStreamId!, msg));
            break;

          case "remove_song":
            await removeSongHandler(socket, payload, prisma, (msg) => broadcastToStream(joinedStreamId!, msg));
            break;

          case "skip_song":
            await skipSongHandler(socket, payload, prisma, (msg) => broadcastToStream(joinedStreamId!, msg));
            break;

          default:
            socket.emit("message", { error: "❌ Unknown action" });
=======
            const { position } = payload || {};
            const time = Number(position);
            if (isNaN(time) || time < 0) {
              socket.emit("message", {
                error: "⚠️ Invalid seek position",
              });
              return;
            }
            const state =
              (await getPlaybackState(joinedStreamId)) || {
                isPlaying: false,
                currentTime: 0,
              };
            state.currentTime = time;
            await setPlaybackState(joinedStreamId, state);
            broadcastToStream(io, joinedStreamId, {
              action: "seek",
              payload: { currentTime: time },
            });
            break;
          }

          // other cases like add_song, vote_song, remove_song, skip_song omitted for brevity

          default: {
            socket.emit("message", { error: "🚫 Unknown action" });
            break;
          }
>>>>>>> e579cbc
        }
      } catch (err) {
        console.error("Socket error:", err);
        socket.emit("message", { error: "❌ Internal server error" });
      }
    });

    socket.on("disconnect", () => {
      const { role, streamId } = (socket as any).data || {};
<<<<<<< HEAD
      if (role === "host" && streamId) io.to(streamId).emit("host-disconnected", { streamId });

      if (joinedStreamId) {
        const clients = streamClients.get(joinedStreamId);
        if (clients) {
          clients.delete(socket.id);
          broadcastToStream(joinedStreamId, { action: "viewer_count", payload: { count: clients.size } });
          if (clients.size === 0) streamClients.delete(joinedStreamId);
=======
      if (streamId && streamClients.has(streamId)) {
        const clientsSet = streamClients.get(streamId)!;
        clientsSet.delete(socket.id);
        broadcastToStream(io, streamId, {
          action: "viewer_count",
          payload: { count: clientsSet.size },
        });
        if (clientsSet.size === 0) {
          streamClients.delete(streamId);
>>>>>>> e579cbc
        }
      }
      console.log("🔌 Client disconnected:", socket.id);
    });
  });

  // === Periodic sync of currentTime to viewers ===
  setInterval(async () => {
    for (const [streamId] of streamClients) {
      let state = await getPlaybackState(streamId);
      if (!state) continue;

      let currentTime = state.currentTime;
      if (state.isPlaying) {
        const elapsed = (Date.now() - state.lastUpdate) / 1000;
        currentTime += elapsed;
      }

      io.to(streamId).emit("message", {
        action: "sync",
        payload: { currentTime, isPlaying: state.isPlaying },
      });
    }
  }, 5000);

  return io;
}
