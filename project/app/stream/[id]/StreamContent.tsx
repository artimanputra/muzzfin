"use client";

import { useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useStreamPlayback } from "@/hooks/useStreamPlayback";
import MusicPlayer from "@/components/MusicPlayer";
import { SongQueue } from "@/components/SongQueue";
import { AddSongForm } from "@/components/AddSongForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StreamContent() {
  const { id } = useParams<{ id: string }>();
<<<<<<< HEAD
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);
  const isHost = user && id ? true : false;

  const { stream, isPlaying, currentTime, play, pause, seek, skip, addSong, voteSong, removeSong } =
    useStreamPlayback(id, user?.id ?? "", isHost, audioRef);
  console.log(stream)
  if (!stream) return <div>Loading stream...</div>;
=======
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [stream, setStream] = useState<Stream | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const isHost = user && stream ? user.id === stream.hostId : false;
  const socket = useRef<Socket | null>(null);

  // === Fetch Stream ===
  useEffect(() => {
    if (!user) return;

    const fetchStream = async () => {
      setIsLoading(true);
      try {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/streams`,
          {
            params: { mode: "listen", streamId: id, userId: user.id },
          }
        );
        setStream(data);
      } catch (err) {
        console.error("❌ Stream fetch error:", err);
        toast({
          title: "Error",
          description: "Failed to load stream",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStream();
  }, [id, user, toast]);

  // === Socket.IO Connection ===
  useEffect(() => {
    if (!user || !stream) return;
    if (socket.current) return;

    const s = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}`, {
      transports: ["websocket"],
      reconnection: true,
    });
    socket.current = s;

    s.on("connect", () => {
      s.emit("message", {
        action: "join_stream",
        payload: {
          streamId: stream.id,
          userId: user.id,
          role: isHost ? "host" : "viewer",
        },
      });
    });

    s.on("message", (msg: any) => {
      try {
        const packet = Array.isArray(msg) ? msg[0] : msg;
        const { action, data, payload, error } = packet || {};

        if (error) {
          toast({ title: "Error", description: error, variant: "destructive" });
          return;
        }

        switch (action) {
          case "song_added_broadcast":
            setStream((prev) =>
              prev ? { ...prev, queue: data.updatedQueue } : prev
            );
            toast({ title: "Song added", description: "Added to queue" });
            break;
          case "song_skipped":
          case "song_skipped_broadcast":
            setStream((prev) =>
              prev ? { ...prev, currentSong: data.newSong } : prev
            );
            break;
          case "viewer_count":
            setStream((prev) =>
              prev ? { ...prev, listeners: payload.count || 0 } : prev
            );
            break;
          case "play":
            setCurrentTime(payload?.currentTime || 0);
            setIsPlaying(true);
            break;
          case "pause":
            setCurrentTime(payload?.currentTime || 0);
            setIsPlaying(false);
            break;
          case "seek":
          case "sync":
            setCurrentTime(payload?.currentTime || 0);
            setIsPlaying(payload?.isPlaying ?? isPlaying);
            break;
          default:
            break;
        }
      } catch (err) {
        console.error("⚠️ Socket message parse error:", err);
      }
    });

    s.on("host-disconnected", () => {
      toast({
        title: "Stream ended",
        description: "Host disconnected",
        variant: "destructive",
      });
      setStream(null);
    });

    return () => {
      s.disconnect();
    };
  }, [user, stream, toast, isHost]);

  // === Socket Emit Helper ===
  const sendSocketMessage = (action: string, payload: any = {}) => {
    if (!socket.current?.connected) {
      toast({
        title: "Error",
        description: "Socket not connected",
        variant: "destructive",
      });
      return;
    }
    socket.current.emit("message", { action, payload });
  };

  // === Handlers ===
  const handleAddSong = (url: string) => {
    if (!isAuthenticated || !stream) return;
    sendSocketMessage("add_song", {
      url,
      streamId: stream.id,
      userId: user?.id,
    });
  };

  const handleNextSong = () => {
    if (!isHost || !stream) return;
    sendSocketMessage("skip_song", { streamId: stream.id, userId: user?.id });
  };

  const handleVoteSong = (songId: string) => {
    if (!isAuthenticated || !stream) return;
    sendSocketMessage("vote_song", { songId, userId: user?.id });
  };

  const handleRemoveSong = (songId: string) => {
    if (!isAuthenticated || !stream) return;
    sendSocketMessage("remove_song", { streamId: stream.id, songId });
  };

  // === Render ===
  if (isLoading) {
    return (
      <div className="container flex items-center justify-center min-h-[calc(100vh-16rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="container py-10">
        <Card>
          <CardContent className="flex flex-col items-center justify-center text-center py-12">
            <Music className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Stream not found</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              The stream you’re looking for doesn’t exist or has ended.
            </p>
            <Button asChild>
              <Link href="/streams">Browse Streams</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
>>>>>>> e579cbc

  return (
    <div className="container py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT SECTION */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">
                {stream.title || "Untitled Stream"}
              </h1>
              <Badge
                variant="outline"
                className={
                  stream.isActive
                    ? "bg-green-500/20 text-green-500 border-green-500/50"
                    : ""
                }
              >
                {stream.isActive ? "Live" : "Ended"}
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {/* <span className="text-sm text-muted-foreground">
                  {stream.listeners || 0} listening
                </span> */}
              </div>

              {/* <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage
                    src={stream.host?.image || "/default-avatar.png"}
                    alt={stream.host?.name || "Host"}
                  />
                  <AvatarFallback>
                    {stream.host?.name?.[0]?.toUpperCase() || "H"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  Hosted by {isHost ? "you" : stream.host?.name || "Unknown"}
                </span>
              </div> */}
            </div>
          </div>

          {/* Music Player */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Now Playing</CardTitle>
            </CardHeader>
            <CardContent>
              <MusicPlayer
                stream={stream}
                isPlaying={isPlaying}
                currentTime={currentTime}
<<<<<<< HEAD
                onPlay={play}
                onPause={pause}
                onSkip={skip}
                onSeek={seek}
                host={isHost}
=======
                host={isHost}
                onPlay={() =>
                  sendSocketMessage("play", {
                    streamId: stream.id,
                    position: currentTime,
                  })
                }
                onPause={() =>
                  sendSocketMessage("pause", {
                    streamId: stream.id,
                    position: currentTime,
                  })
                }
                onSkip={handleNextSong}
                onSeek={(time) =>
                  sendSocketMessage("seek", {
                    streamId: stream.id,
                    position: time,
                  })
                }
>>>>>>> e579cbc
              />
            </CardContent>
          </Card>

          {/* Add Song Form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Add a Song</CardTitle>
              <CardDescription>
                Paste a YouTube, SoundCloud or Spotify link to add to the queue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AddSongForm onAddSong={addSong} />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SECTION */}
        <div className="lg:col-span-1">
<<<<<<< HEAD
          {/* <SongQueue
            songs={stream.queue}
=======
          <SongQueue
            songs={stream.queue || []}
>>>>>>> e579cbc
            onVote={handleVoteSong}
            onRemove={isAuthenticated ? handleRemoveSong : undefined}
            className="h-full"
          /> */}
          <SongQueue songs={stream.queue} onVote={voteSong} onRemove={isHost ? removeSong : undefined} className="h-full" />
        </div>
      </div>
    </div>
  );
}
