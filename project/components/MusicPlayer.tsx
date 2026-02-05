"use client";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipForward } from "lucide-react";
import Image from "next/image";

interface Props {
  stream: any;
<<<<<<< HEAD
  isPlaying?: boolean;
  currentTime?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onSkip?: () => Promise<any> | any;
  onSeek?: (time: number) => void;
  host: any;
=======
  isPlaying: boolean;
  currentTime: number;
  host: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  onSeek: (time: number) => void;
>>>>>>> e579cbc
}

export default function MusicPlayer({
  stream,
  isPlaying,
  currentTime,
  host,
  onPlay,
  onPause,
  onSkip,
  onSeek,
<<<<<<< HEAD
  host,
}: MusicPlayerProps) {
  const currentSong = stream?.currentSong || null;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [id, setId] = useState<string | null>(null);

  const lastSeekEmit = useRef<number>(0);
  const seekTimeout = useRef<NodeJS.Timeout | null>(null);

  // reset when song changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setIsLoading(true);
    setIsReady(false);
    setId(null);
    setDuration(0);
  }, [stream]);

  // poll until backend marks song ready
  useEffect(() => {
    if (!currentSong) return;

    let active = true;
    let pollTimeout: NodeJS.Timeout;

    const poll = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/v1/play/ready/${currentSong.id}`
        );
        if (!active) return;

        if (res.data.ready) {
          setIsReady(true);
          setIsLoading(false);
          setId(res.data.id);
        } else {
          pollTimeout = setTimeout(poll, 2000);
        }
      } catch (err) {
        console.error("Polling error:", err);
        if (active) {
          pollTimeout = setTimeout(poll, 4000);
        }
      }
    };

    poll();

    return () => {
      active = false;
      clearTimeout(pollTimeout);
    };
  }, [currentSong]);

  const audioUrl =
    isReady && currentSong
      ? `http://localhost:5000/api/v1/play/${id}/playlist.m3u8`
      : null;

  // setup HLS
=======
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [duration, setDuration] = useState(0);
  const [sliderPos, setSliderPos] = useState(0);

  const song = stream?.currentSong;
  const audioUrl = stream?.playlistUrl; // ensure this is passed in stream object

>>>>>>> e579cbc
  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;

    const audio = audioRef.current;
<<<<<<< HEAD
    let hls: Hls | null = null;

    const handleLoadedMetadata = () => {
      const dur = audio.duration;
      setDuration(isFinite(dur) && dur > 0 ? dur : currentSong?.duration || 0);
    };

    const handleEnded = async () => {
      if (onSkip) await onSkip();
    };

    const handleTimeUpdate = () => {
      const now = Date.now();
      if (now - lastSeekEmit.current >= 3000) {
        lastSeekEmit.current = now;
        onSeek?.(audio.currentTime);
      }
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);

=======
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
>>>>>>> e579cbc
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(audioUrl);
      hls.attachMedia(audio);
      hlsRef.current = hls;
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setDuration(audio.duration || 0);
      });
<<<<<<< HEAD

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error("[HLS Error]", data);
      });
    } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      audio.src = audioUrl;
    }

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      if (hls) hls.destroy();
=======
    } else {
      audio.src = audioUrl;
    }

    const update = () => {
      setSliderPos(audio.currentTime);
>>>>>>> e579cbc
    };
    audio.addEventListener("timeupdate", update);
    return () => {
      audio.removeEventListener("timeupdate", update);
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [audioUrl]);

<<<<<<< HEAD
  // sync play/pause
=======
  // Reflect play/pause server state
>>>>>>> e579cbc
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
<<<<<<< HEAD
      audioRef.current
        .play()
        .catch((err) => console.warn("[Autoplay blocked]", err));
=======
      audio.play().catch(() => {});
>>>>>>> e579cbc
    } else {
      audio.pause();
    }
  }, [isPlaying]);

<<<<<<< HEAD
  // sync seek
  useEffect(() => {
    if (!audioRef.current) return;
    if (Math.abs(audioRef.current.currentTime - currentTime) > 1) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // handle manual slider seek with debounce
  const handleSeek = (value: number[]) => {
    const time = value[0];
    if (audioRef.current) audioRef.current.currentTime = time;

    if (seekTimeout.current) clearTimeout(seekTimeout.current);
    seekTimeout.current = setTimeout(() => {
      onSeek?.(time);
    }, 500);
  };

  const handlePlay = () => {
    if (audioRef.current) audioRef.current.play().catch(console.error);
    onPlay?.();
  };

  if (isLoading) return <div>Loading player...</div>;
  if (!currentSong) return <div>No song selected</div>;

=======
  // Sync to server position
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const diff = Math.abs(audio.currentTime - currentTime);
    if (diff > 1.0) {
      audio.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleSeek = (value: number[]) => {
    const time = value[0];
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setSliderPos(time);
    if (host) {
      onSeek(time);
    }
  };

>>>>>>> e579cbc
  return (
    <div className="flex items-center gap-4 p-4 border rounded-xl bg-card shadow-sm">
      {song?.thumbnail && (
        <Image
          src={song.thumbnail}
          alt={song.title}
          width={64}
          height={64}
          className="rounded-xl object-cover"
          unoptimized
        />
      )}
      <div className="flex-1">
        <h4 className="font-semibold truncate">{song?.title || "No song"}</h4>
        <Slider
<<<<<<< HEAD
          value={[currentTime]}
          max={duration}
=======
          value={[sliderPos]}
          max={Math.floor(duration)}
>>>>>>> e579cbc
          step={1}
          onValueChange={handleSeek}
          className="mt-2"
        />
        <div className="flex items-center gap-2 mt-2">
          <Button size="icon" variant="outline" onClick={isPlaying ? onPause : onPlay}>
            {isPlaying ? <Pause /> : <Play />}
          </Button>
          <Button size="icon" variant="outline" onClick={onSkip}>
            <SkipForward />
          </Button>
          <span className="text-xs text-muted-foreground">
<<<<<<< HEAD
            {Math.floor(currentTime)}s / {Math.floor(duration)}s
=======
            {Math.floor(sliderPos)}s / {Math.floor(duration)}s
>>>>>>> e579cbc
          </span>
        </div>
      </div>
      <audio ref={audioRef} preload="metadata" />
    </div>
  );
}
