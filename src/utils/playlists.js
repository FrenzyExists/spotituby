

const Playlists = class {
    constructor(url = null, download_path = null) {
        this.download_path = download_path;
        this.url = url;
        
      }
    
      downloadYTSong = async (url = this.url, download_path = this.download_path) => {
    
      }
    
      downloadSPSong = async (url = this.url, download_path = this.download_path) => {
    
      }
    
      downloadYTPlaylist = async (url = this.url, download_path = this.download_path, playlist = null,) => {
    
      }
    
      downloadSPPlaylist = async (url = this.url, download_path = this.download_path, playlist = null,) => {
    
      }
    
      download = async (url = this.url, download_path = this.download_path, playlist = null) => {
        const mode = Url.identifyUrlType(url);
    
        // Mapping of URL types to their respective download functions
        const downloadFunctions = {
          [Url.type.YT_TRACK]: downloadYTSong,
          [Url.type.YT_PLAYLIST]: downloadYTPlaylist,
          [Url.type.SY_TRACK]: downloadSPSong,
          [Url.type.SY_PLAYLIST]: downloadSPPlaylist,
        };
    
        // Check if the URL type has a corresponding download function
        const downloadFunction = downloadFunctions[mode];
    
        if (downloadFunction) {
          return downloadFunction(url, download_path); // Call the appropriate download function
        } else {
          throw new Error("Unsupported URL type for download.");
        }
      }

      createM3U8
}

export default Playlists;