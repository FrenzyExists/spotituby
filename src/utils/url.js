

const Url = class { };

const sanitizeFileName = name => {
  return name.replace(/[<>:"/\\|?*]+/g, "");
};

const sanitizeArrays = arr => {
  return arr.filter(item => item !== null);
};

/**
 * Identifies the type of a given URL.
 *
 * @param {string} url URL to identify
 * @returns {string|null} Type of the URL, or null if the type could not be determined.
 * The type can be one of the following:
 * - 'yt-track' if the URL is a YouTube track URL
 * - 'yt-playlist' if the URL is a YouTube playlist URL
 * - 'sy-track' if the URL is a Spotify track URL
 * - 'sy-playlist' if the URL is a Spotify playlist URL
 * @exports identifyUrlType                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
 */
const identifyUrlType = url => {
  if (!url) return null;

  // Validate URL format
  if (!validUrl.isUri(url)) {
    throw new Error("Invalid URL provided.");
  }

  try {
    // Parse the URL
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const searchParams = parsedUrl.searchParams;

    // YouTube URLs
    if (hostname === "www.youtube.com" || hostname === "youtube.com") {
      if (searchParams.has("list")) return Url.type.YT_PLAYLIST; // Playlist
      if (searchParams.has("v")) return Url.type.YT_TRACK; // Video
    }

    if (hostname === "youtu.be") {
      return Url.type.YT_TRACK; // YouTube video link
    }

    // Spotify URLs
    if (hostname === "open.spotify.com") {
      const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
      if (pathSegments[0] === "playlist") return Url.type.SY_PLAYLIST; // Playlist
      if (pathSegments[0] === "track") return Url.type.SY_TRACK; // Track
    }

    return null; // Unrecognized URL type
  } catch (error) {
    throw new Error("Error parsing URL: " + error.message);
  }
};

const UrlType = Object.freeze({
  YT_TRACK: 'yt-track',
  YT_PLAYLIST: 'yt-playlist',
  SY_TRACK: 'sy-track',
  SY_PLAYLIST: 'sy-playlist',
});

Url.type = UrlType;
Url.sanitizeArrays = sanitizeArrays;
Url.sanitizeFileName = sanitizeFileName;
Url.identifyUrlType = identifyUrlType;

export default Url;