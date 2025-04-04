import axios from "axios";
import { parseStringPromise } from "xml2js";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId");

  if (!channelId) {
    return NextResponse.json(
      { error: "Channel ID is required" },
      { status: 400 }
    );
  }

  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  try {
    const response = await axios.get(rssUrl);
    const xml = response.data;
    const result = await parseStringPromise(xml);

    const videos = result.feed.entry.map((entry) => {
      // Extract video ID
      const videoId = entry["yt:videoId"][0];

      // Extract thumbnail URL from media:group
      let thumbnailUrl = "";
      if (entry["media:group"] && entry["media:group"][0]["media:thumbnail"]) {
        thumbnailUrl = entry["media:group"][0]["media:thumbnail"][0].$.url;
      } else {
        // Fallback to standard YouTube thumbnail URL
        thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      }

      return {
        title: entry.title[0],
        description: entry["media:group"][0]["media:description"][0],
        videoId: videoId,
        link: `https://www.youtube.com/watch?v=${videoId}`,
        published: entry.published[0],
        thumbnail: thumbnailUrl,
        channelName: result.feed.title
          ? result.feed.title[0]
          : "YouTube Channel",
      };
    });

    return NextResponse.json(videos);
  } catch (error) {
    console.error("Error fetching RSS feed:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch videos", details: error.message },
      { status: 500 }
    );
  }
}
