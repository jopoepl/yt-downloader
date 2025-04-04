import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { createReadStream } from "fs";
import { unlink } from "fs/promises";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");
  const format = searchParams.get("format");
  const suggestedFilename =
    searchParams.get("filename") || `video-${videoId}.mp4`;

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

    // Make sure the format string has a proper + sign if it needs one
    let cleanFormat = format;

    // Clean the format string - ensure it has proper syntax
    // First, handle the space issue between format ID and bestaudio
    cleanFormat = cleanFormat.replace(/(\d+)\s+bestaudio/, "$1+bestaudio");

    // Log format debugging info
    console.log(`Format requested: "${format}"`);
    console.log(`Clean format: "${cleanFormat}"`);

    // Use yt-dlp with merged output format explicitly set for combined formats
    let mergeOption = "";
    if (cleanFormat.includes("+")) {
      mergeOption = " --merge-output-format mp4";
    }

    const command = `yt-dlp -f "${cleanFormat}"${mergeOption} -o "${tempFilePath}" "${videoUrl}"`;
    console.log(`Executing: ${command}`);

    // Execute the command
    const { stdout, stderr } = await execAsync(command);
    console.log(`Command stdout: ${stdout}`);
    if (stderr) console.log(`Command stderr: ${stderr}`);

    console.log(`Downloaded file saved to: ${tempFilePath}`);

    // Create a ReadStream for the file
    const fileStream = createReadStream(tempFilePath);

    // Determine content type based on format
    let contentType = "video/mp4";
    if (format.includes("audio only") || suggestedFilename.endsWith(".m4a")) {
      contentType = "audio/mp4";
    }

    // Return the file as a downloadable response with proper headers
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
    // Clean up the temp file if it exists (with a delay to ensure streaming completes)
    if (tempFilePath) {
      setTimeout(async () => {
        try {
          await unlink(tempFilePath);
          console.log(`Deleted temp file: ${tempFilePath}`);
        } catch (err) {
          console.error(`Failed to delete temp file: ${err.message}`);
        }
      }, 10000); // 10 second delay
    }
  }
}
