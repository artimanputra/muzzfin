// src/download.js
import fs from "fs";
import os from "os";
import path from "path";
import { Worker, Queue } from "bullmq";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import axios from "axios";
import pLimit from "p-limit";
import IORedis from "ioredis";
import { YtDlp } from "ytdlp-nodejs";
import { spawn } from "child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

dotenv.config();

// ✅ Use cross-platform ffmpeg path
const ffmpegPath = ffmpegInstaller.path;

// 🔌 Redis connection
console.log("🔌 Connecting to Redis...");
const redisConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
redisConnection.on("connect", () => console.log("✅ Redis connected"));
redisConnection.on("error", (err) => console.error("❌ Redis error:", err));

// ☁️ S3 Client
console.log("☁️ Setting up S3 client...");
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ⬆️ Upload helper
async function uploadWithRetry(params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`⬆️ Uploading ${params.Key}, attempt ${i + 1}...`);
      await s3.send(new PutObjectCommand(params));
      console.log(`☁️ Uploaded: ${params.Key}`);
      return;
    } catch (err) {
      console.error(`⚠️ Upload failed (attempt ${i + 1}):`, err);
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// 🎧 YtDlp instance
const ytDlp = new YtDlp({
  binaryPath: process.env.YTDLP_BINARY_PATH,
  ffmpegPath: ffmpegPath, // ✅ ensure ffmpeg path is passed
});

// ⚙️ Worker setup
console.log("⚙️ Starting worker...");
const worker = new Worker(
  "song-downloads",
  async (job) => {
    const { url } = job.data;
    console.log(`🎶 Downloading: ${url}`);

    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url))
      throw new Error(`Invalid YouTube URL: ${url}`);

    // 🧠 Check API cache
    try {
      const resp = await axios.get(process.env.API_URL, { params: { url } });
      if (resp.data?.path) return { url: resp.data.songId };
    } catch (err) {
      console.warn("⚠️ API check failed:", err.message);
    }

    // 📂 Temp folder
    const uuid = uuidv4();
    const basePath = path.join(os.tmpdir(), uuid);
    fs.mkdirSync(basePath, { recursive: true });
    const tempFile = path.join(basePath, "audio.webm");

    // ▶️ Download audio
    await ytDlp.downloadAsync(url, {
      format: "bestaudio/best",
      output: tempFile,
      noPlaylist: true,
      addHeader: [
        "referer: https://www.youtube.com/",
        "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      ],
      preferIpv4: true,
      onProgress: (p) => console.log("⬇️ Download progress:", p),
    });

    // 🔄 Convert to HLS
    console.log("▶️ Starting HLS conversion...");
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn(
        ffmpegPath, // ✅ Use correct binary path
        [
          "-y",
          "-i",
          tempFile,
          "-vn",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-ar",
          "44100",
          "-ac",
          "2",
          "-af",
          "loudnorm",
          "-hls_time",
          "6",
          "-hls_playlist_type",
          "vod",
          "-hls_list_size",
          "0",
          "-hls_flags",
          "independent_segments",
          "-hls_segment_filename",
          path.join(basePath, "segment_%03d.ts"),
          "-f",
          "hls",
          path.join(basePath, "playlist.m3u8"),
        ],
        { stdio: "inherit" }
      );

      ffmpeg.on("error", reject);
      ffmpeg.on("close", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`ffmpeg exited with code ${code}`))
      );
    });

    // 📤 Upload all files
    const files = fs.readdirSync(basePath);
    const limit = pLimit(5);
    await Promise.all(
      files.map((file) =>
        limit(async () => {
          const data = await fs.promises.readFile(path.join(basePath, file));
          const type = file.endsWith(".m3u8")
            ? "application/vnd.apple.mpegurl"
            : "video/mp2t";
          await uploadWithRetry({
            Bucket: process.env.S3_BUCKET,
            Key: `${uuid}/${file}`,
            Body: data,
            ContentType: type,
          });
        })
      )
    );

    // 🧹 Cleanup
    fs.rmSync(basePath, { recursive: true, force: true });

    // 🔗 Save metadata
    const playlistUrl = `${process.env.S3_BASE_URL}/${uuid}/playlist.m3u8`;
    await axios.put(process.env.API_URL, { id: uuid, url, playlistUrl });

    return { url: playlistUrl };
  },
  {
    connection: redisConnection,
    lockDuration: 600_000,
    stalledInterval: 300_000,
  }
);

worker.on("completed", (job, res) =>
  console.log(`🎉 Job ${job.id} completed -> ${JSON.stringify(res)}`)
);
worker.on("failed", (job, err) =>
  console.error(`❌ Job ${job.id} failed:`, err)
);

// 📦 Queue
export const songQueue = new Queue("song-downloads", {
  connection: redisConnection,
});

export async function addSongDownloadJob(url) {
  console.log(`📥 Adding job for: ${url}`);
  await songQueue.add("download-song", { url }, { removeOnComplete: true });
  console.log(`✅ Job queued for: ${url}`);
}
