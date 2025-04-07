import { exec } from "child_process";
import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { promisify } from "util";
import { unlink } from "fs/promises";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

// Function to sanitize filename
function sanitizeFilename(filename) {
  return filename
    .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII characters
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace any other special chars with underscore
    .replace(/_+/g, "_"); // Replace multiple underscores with single one
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");
  const format = searchParams.get("format");
  const suggestedFilename = sanitizeFilename(
    searchParams.get("filename") || `video-${videoId}.mp4`
  );
  const convertToH264 = searchParams.get("h264") === "true";

  if (!videoId || !format) {
    return NextResponse.json(
      { error: "Video ID and format are required" },
      { status: 400 }
    );
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let tempFilePath = null;

  try {
    // Create a temp file path for the output
    const tempDir = os.tmpdir();
    const outputFileName = `yt-dlp-${videoId}-${Date.now()}.mp4`;
    tempFilePath = path.join(tempDir, outputFileName);

    // Clean the format string
    let cleanFormat = format.replace(/(\d+)\s+bestaudio/, "$1+bestaudio");

    // Build yt-dlp command with optimizations
    let ytDlpOptions = [
      "-f",
      cleanFormat,
      "--no-playlist",
      "--progress",
      "--newline",
    ];

    if (cleanFormat.includes("+")) {
      ytDlpOptions.push("--merge-output-format", "mp4");
    }

    // If H.264 conversion is needed, use yt-dlp's post-processing
    if (convertToH264) {
      ytDlpOptions = ytDlpOptions.concat([
        "--postprocessor-args",
        "ffmpeg:-vcodec libx264 -preset medium -crf 23 -acodec aac -b:a 192k -movflags +faststart",
        "--recode-video",
        "mp4",
      ]);
    }

    // Properly escape the options for shell execution
    const escapedOptions = ytDlpOptions.map((opt) =>
      opt.includes(" ") ? `"${opt}"` : opt
    );

    const command = `yt-dlp ${escapedOptions.join(
      " "
    )} -o "${tempFilePath}" "${videoUrl}"`;
    console.log(`Executing: ${command}`);

    // Execute the command
    const { stdout, stderr } = await execAsync(command);
    console.log(`Command stdout: ${stdout}`);
    if (stderr) console.log(`Command stderr: ${stderr}`);

    // Create a ReadStream for the file
    const fileStream = createReadStream(tempFilePath);

    // Determine content type
    const contentType =
      format.includes("audio only") || suggestedFilename.endsWith(".m4a")
        ? "audio/mp4"
        : "video/mp4";

    // Return the file
    return new Response(fileStream, {
      headers: {
        "Content-Disposition": `attachment; filename="${suggestedFilename}"`,
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to download video", details: error.message },
      { status: 500 }
    );
  } finally {
    // Clean up temp file after streaming (with delay)
    if (tempFilePath) {
      setTimeout(async () => {
        try {
          await unlink(tempFilePath);
          console.log(`Deleted temp file: ${tempFilePath}`);
        } catch (err) {
          console.error(`Failed to delete temp file: ${err.message}`);
        }
      }, 10000);
    }
  }
}
