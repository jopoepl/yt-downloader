// app/api/download/route.js
import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");
  const format = searchParams.get("format");

  if (!videoId) {
    return NextResponse.json(
      { error: "Video ID is required" },
      { status: 400 }
    );
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    // Use yt-dlp to get the video title for filename
    const titleCmd = `yt-dlp --get-title "${videoUrl}"`;
    const { stdout: titleOutput } = await execAsync(titleCmd);
    const title = titleOutput.trim().replace(/[\\/:*?"<>|]/g, "_");

    // Instead of redirecting or streaming, generate a download command
    // that the user can run directly

    let downloadCommand = "";
    let filename = "";

    if (format.includes("+")) {
      // For merged streams, show the correct command
      downloadCommand = `yt-dlp -f "${format}" -o "%(title)s.%(ext)s" "${videoUrl}"`;
      filename = `${title}.mp4`;
    } else {
      // For single stream formats
      downloadCommand = `yt-dlp -f "${format}" -o "%(title)s.%(ext)s" "${videoUrl}"`;

      // Determine file extension
      if (format === "bestaudio[ext=m4a]") {
        filename = `${title}.m4a`;
      } else {
        filename = `${title}.mp4`;
      }
    }

    // Return JSON with download information
    return NextResponse.json({
      videoId,
      title,
      downloadCommand,
      downloadUrl: `/api/direct-download?videoId=${videoId}&format=${format}&filename=${encodeURIComponent(
        filename
      )}`,
      success: true,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to get download information", details: error.message },
      { status: 500 }
    );
  }
}
