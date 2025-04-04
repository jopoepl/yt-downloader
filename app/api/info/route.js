import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    // Use yt-dlp to get video info in JSON format
    const command = `yt-dlp --dump-json "${url}"`;
    const { stdout } = await execAsync(command);

    // Parse the JSON output
    const videoInfo = JSON.parse(stdout);

    // Extract available formats
    const formats = [];

    // Add video+audio formats (typically lower quality but one file)
    const combinedFormats = videoInfo.formats.filter(
      (f) => f.resolution !== "audio only" && f.acodec !== "none"
    );

    combinedFormats.forEach((f) => {
      if (formats.some((existing) => existing.quality === f.resolution)) return;

      formats.push({
        format_id: f.format_id,
        quality: f.resolution,
        ext: f.ext,
        note: "video+audio",
        filename: `${sanitizeFilename(videoInfo.title)}.${f.ext}`,
      });
    });

    // Add video-only formats (higher quality, needs separate audio)
    const videoOnlyFormats = videoInfo.formats.filter(
      (f) => f.resolution !== "audio only" && f.acodec === "none"
    );

    videoOnlyFormats.forEach((f) => {
      if (formats.some((existing) => existing.quality === f.resolution)) return;

      formats.push({
        format_id: `${f.format_id}+bestaudio`, // Using proper + syntax
        quality: f.resolution,
        ext: "mp4",
        note: "best quality",
        filename: `${sanitizeFilename(videoInfo.title)}.mp4`,
      });
    });

    // Add audio-only option
    formats.push({
      format_id: "bestaudio[ext=m4a]",
      quality: "Audio only",
      ext: "m4a",
      note: "audio only",
      filename: `${sanitizeFilename(videoInfo.title)}.m4a`,
    });

    // Sort formats by resolution (highest first)
    formats.sort((a, b) => {
      if (a.quality === "Audio only") return 1;
      if (b.quality === "Audio only") return -1;

      const getHeight = (res) => {
        const match = res.match(/(\d+)x(\d+)/);
        return match ? parseInt(match[2]) : 0;
      };

      return getHeight(b.quality) - getHeight(a.quality);
    });

    // Return filtered video information
    return NextResponse.json({
      id: videoInfo.id,
      title: videoInfo.title,
      uploader: videoInfo.uploader,
      duration: secondsToHMS(videoInfo.duration),
      thumbnail: videoInfo.thumbnail,
      formats: formats,
      original_url: videoInfo.original_url,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch video info", details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to convert seconds to HH:MM:SS format
function secondsToHMS(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  return [
    h > 0 ? h : null,
    h > 0 ? m.toString().padStart(2, "0") : m,
    s.toString().padStart(2, "0"),
  ]
    .filter(Boolean)
    .join(":");
}

// Function to sanitize filenames
function sanitizeFilename(filename) {
  return filename
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/[\u{1F600}-\u{1F6FF}]/gu, "")
    .replace(/\s+/g, "_")
    .slice(0, 100)
    .trim();
}
