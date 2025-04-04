"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";

export default function Home() {
  // Tab state
  const [activeTab, setActiveTab] = useState("feed");

  // RSS Feed state
  const [channelId, setChannelId] = useState(""); // Default channel ID
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);

  // Single URL state
  const [singleUrl, setSingleUrl] = useState("");
  const [singleVideoInfo, setSingleVideoInfo] = useState(null);
  const [singleVideoLoading, setSingleVideoLoading] = useState(false);
  const [singleVideoError, setSingleVideoError] = useState(null);

  // Shared state
  const [activePopupId, setActivePopupId] = useState(null);
  const [currentVideoFormats, setCurrentVideoFormats] = useState([]);

  // Add state for expanded descriptions
  const [expandedDescriptions, setExpandedDescriptions] = useState(new Set());

  // Change loadingFormats to track individual videos
  const [loadingFormatsId, setLoadingFormatsId] = useState(null);
  const [downloadingFormat, setDownloadingFormat] = useState(null);

  // Toggle description expansion
  const toggleDescription = (videoId) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  // Fetch videos from channel ID
  const fetchVideos = async () => {
    if (!channelId) {
      setError("Please enter a Channel ID or RSS feed URL");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Extract the channel ID from the input (either a channel ID or RSS feed URL)
      let extractedChannelId = channelId;
      const rssMatch = channelId.match(/channel_id=([A-Za-z0-9_-]+)/);
      if (rssMatch) {
        extractedChannelId = rssMatch[1]; // Extract the channel ID from the RSS URL
      } else if (!channelId.startsWith("UC")) {
        setError(
          "Invalid Channel ID or RSS feed URL. Please enter a valid Channel ID (e.g., UCxxxxxxxxxxxxxxxxxxxxxx) or RSS feed URL."
        );
        setLoading(false);
        return;
      }

      // Fetch videos from the RSS feed API
      const response = await fetch(
        `/api/videos?channelId=${extractedChannelId}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch videos");
      }

      const data = await response.json();
      setVideos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch single video info
  const fetchSingleVideo = async () => {
    if (!singleUrl) {
      setSingleVideoError("Please enter a YouTube URL");
      return;
    }

    try {
      setSingleVideoLoading(true);
      setSingleVideoError(null);
      setSingleVideoInfo(null);

      // Extract video ID from URL
      const videoIdMatch = singleUrl.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
      );

      if (!videoIdMatch || !videoIdMatch[1]) {
        throw new Error(
          "Invalid YouTube URL. Please enter a valid YouTube video URL."
        );
      }

      const videoId = videoIdMatch[1];

      // Fetch video info
      const response = await fetch(
        `/api/info?url=${encodeURIComponent(singleUrl)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch video info");
      }

      const data = await response.json();
      setSingleVideoInfo(data);
      setCurrentVideoFormats(data.formats);
    } catch (err) {
      setSingleVideoError(err.message);
    } finally {
      setSingleVideoLoading(false);
    }
  };

  // Fetch available formats for a video
  const fetchFormats = async (videoId) => {
    try {
      setLoadingFormatsId(videoId);
      const response = await fetch(
        `/api/info?url=https://www.youtube.com/watch?v=${videoId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch video formats");
      }

      const data = await response.json();
      setCurrentVideoFormats(data.formats);
      setActivePopupId(videoId);
    } catch (err) {
      console.error("Error fetching formats:", err);
      setError(err.message);
    } finally {
      setLoadingFormatsId(null);
    }
  };

  // Handle download for a specific format
  const handleDownload = async (videoId, format) => {
    try {
      setDownloadingFormat(format.format_id);

      // Create clean format string with proper + sign
      const cleanFormat = format.format_id.replace(/\s+/g, "");

      // Use the download API
      window.location.href = `/api/direct-download?videoId=${videoId}&format=${encodeURIComponent(
        cleanFormat
      )}&filename=${encodeURIComponent(format.filename || "video.mp4")}`;

      // Close the popup after starting download
      setTimeout(() => {
        setActivePopupId(null);
        setDownloadingFormat(null);
      }, 1000);
    } catch (err) {
      setError(err.message);
      setDownloadingFormat(null);
    }
  };

  // Copy text to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  // Download thumbnail
  const downloadThumbnail = (thumbnail, title) => {
    // Create a sanitized filename
    const sanitizedTitle = title
      .replace(/[\\/:*?"<>|]/g, "") // Remove invalid characters
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .substring(0, 50); // Limit length

    // Create a temporary anchor and trigger download
    const link = document.createElement("a");
    link.href = thumbnail;
    link.download = `${sanitizedTitle}_thumbnail.jpg`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Close the popup when clicking outside
  const closePopup = (e) => {
    if (e.target.className === styles.downloadPopupOverlay) {
      setActivePopupId(null);
    }
  };

  // Load videos on component mount
  useEffect(() => {
    if (activeTab === "feed") {
      fetchVideos();
    }
  }, [activeTab]);

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>YouTube Downloader</h1>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${
              activeTab === "feed" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("feed")}
          >
            Channel Feed
          </button>
          <button
            className={`${styles.tab} ${
              activeTab === "url" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("url")}
          >
            Single URL
          </button>
        </div>

        {/* RSS Feed Tab */}
        {activeTab === "feed" && (
          <div className={styles.tabContent}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                placeholder="Enter Channel ID or RSS feed URL (e.g., UCxxxxxxxxxxxxxxxxxxxxxx)"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className={styles.input}
              />
              <button
                onClick={fetchVideos}
                disabled={loading}
                className={styles.button}
              >
                {loading ? "Loading..." : "Fetch Videos"}
              </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {loading ? (
              <p className={styles.loading}>Loading videos...</p>
            ) : videos.length === 0 ? (
              <p className={styles.message}>
                No videos loaded yet. Enter a channel ID or RSS feed URL and
                click "Fetch Videos".
              </p>
            ) : (
              <ul className={styles.videoList}>
                {videos.map((video) => (
                  <li key={video.videoId} className={styles.videoItem}>
                    <div className={styles.videoHeader}>
                      <div className={styles.thumbnailContainer}>
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className={styles.thumbnail}
                        />
                        <button
                          onClick={() =>
                            downloadThumbnail(video.thumbnail, video.title)
                          }
                          className={styles.thumbnailDownload}
                          title="Download Thumbnail"
                        >
                          ⬇️
                        </button>
                      </div>
                      <div className={styles.videoInfo}>
                        <h2 className={styles.videoTitle}>{video.title}</h2>
                        <p className={styles.videoMeta}>
                          <strong>Posted:</strong>{" "}
                          {new Date(video.published).toLocaleDateString()}
                        </p>
                        <p className={styles.videoMeta}>
                          <strong>Link:</strong>{" "}
                          <a
                            href={video.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.link}
                          >
                            {video.link}
                          </a>
                        </p>
                        <div className={styles.actions}>
                          <button
                            onClick={() => fetchFormats(video.videoId)}
                            className={styles.downloadButton}
                            disabled={loadingFormatsId === video.videoId}
                          >
                            <div className={styles.buttonText}>
                              {loadingFormatsId === video.videoId && (
                                <div className={styles.spinner} />
                              )}
                              {loadingFormatsId === video.videoId
                                ? "Loading Formats..."
                                : "Download Video"}
                            </div>
                          </button>
                        </div>

                        <div className={styles.descriptionContainer}>
                          <div
                            className={`${styles.description} ${
                              expandedDescriptions.has(video.videoId)
                                ? styles.expanded
                                : ""
                            }`}
                          >
                            <div className={styles.textSection}>
                              <strong>Title:</strong> <span>{video.title}</span>{" "}
                              <button
                                onClick={() => copyToClipboard(video.title)}
                                className={styles.copyButton}
                              >
                                Copy
                              </button>
                            </div>
                            <div className={styles.textSection}>
                              <strong>Description:</strong>{" "}
                              <span>{video.description}</span>
                            </div>
                          </div>
                          <div
                            className={`${styles.fadeOut} ${
                              expandedDescriptions.has(video.videoId)
                                ? styles.hidden
                                : ""
                            }`}
                          />
                          <button
                            className={styles.showMoreButton}
                            onClick={() => toggleDescription(video.videoId)}
                          >
                            {expandedDescriptions.has(video.videoId)
                              ? "Show Less ▲"
                              : "Show More ▼"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Single URL Tab */}
        {activeTab === "url" && (
          <div className={styles.tabContent}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                placeholder="Enter YouTube video URL (e.g., https://www.youtube.com/watch?v=...)"
                value={singleUrl}
                onChange={(e) => setSingleUrl(e.target.value)}
                className={styles.input}
              />
              <button
                onClick={fetchSingleVideo}
                disabled={singleVideoLoading}
                className={styles.button}
              >
                {singleVideoLoading ? "Loading..." : "Get Video Info"}
              </button>
            </div>

            {singleVideoError && (
              <div className={styles.error}>{singleVideoError}</div>
            )}

            {singleVideoLoading ? (
              <p className={styles.loading}>Loading video information...</p>
            ) : singleVideoInfo ? (
              <div className={styles.singleVideoContainer}>
                <div className={styles.videoItem}>
                  <div className={styles.videoHeader}>
                    <div className={styles.thumbnailContainer}>
                      <img
                        src={singleVideoInfo.thumbnail}
                        alt={singleVideoInfo.title}
                        className={styles.thumbnail}
                      />
                      <button
                        onClick={() =>
                          downloadThumbnail(
                            singleVideoInfo.thumbnail,
                            singleVideoInfo.title
                          )
                        }
                        className={styles.thumbnailDownload}
                        title="Download Thumbnail"
                      >
                        ⬇️
                      </button>
                    </div>
                    <div className={styles.videoInfo}>
                      <h2 className={styles.videoTitle}>
                        {singleVideoInfo.title}
                      </h2>
                      <p className={styles.videoMeta}>
                        <strong>Channel:</strong> {singleVideoInfo.uploader}
                      </p>
                      <p className={styles.videoMeta}>
                        <strong>Duration:</strong> {singleVideoInfo.duration}
                      </p>
                      <p className={styles.videoMeta}>
                        <strong>Link:</strong>{" "}
                        <a
                          href={singleVideoInfo.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.link}
                        >
                          {singleVideoInfo.original_url}
                        </a>
                      </p>

                      <div className={styles.textSection}>
                        <strong>Title:</strong>{" "}
                        <span>{singleVideoInfo.title}</span>{" "}
                        <button
                          onClick={() => copyToClipboard(singleVideoInfo.title)}
                          className={styles.copyButton}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <h2 className={styles.downloadHeading}>Download Options</h2>
                <div className={styles.formatGrid}>
                  {singleVideoInfo.formats.map((format, index) => (
                    <button
                      key={index}
                      onClick={() => handleDownload(singleVideoInfo.id, format)}
                      className={styles.formatButton}
                    >
                      {format.quality} ({format.ext})
                      {format.note && (
                        <span className={styles.formatNote}>{format.note}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className={styles.message}>
                Enter a YouTube URL and click "Get Video Info" to see download
                options.
              </p>
            )}
          </div>
        )}

        {/* Download Format Popup for RSS feed */}
        {activePopupId && (
          <div className={styles.downloadPopupOverlay} onClick={closePopup}>
            <div
              className={styles.downloadPopup}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>Select Download Format</h2>
              <div className={styles.formatGrid}>
                {currentVideoFormats.map((format, index) => (
                  <button
                    key={index}
                    onClick={() => handleDownload(activePopupId, format)}
                    className={`${styles.formatButton} ${
                      downloadingFormat === format.format_id
                        ? styles.loading
                        : ""
                    }`}
                    disabled={downloadingFormat === format.format_id}
                  >
                    {downloadingFormat === format.format_id ? (
                      <div className={styles.buttonText}>
                        <div className={styles.spinner} />
                        Downloading...
                      </div>
                    ) : (
                      `${format.quality} (${format.ext})`
                    )}
                  </button>
                ))}
              </div>
              <button
                className={styles.closeButton}
                onClick={() => setActivePopupId(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
