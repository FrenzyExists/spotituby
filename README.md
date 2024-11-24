# Spotituby

**Spotituby** is a Node.js-based application that simplifies downloading music from Spotify playlists and YouTube. Designed for command-line enthusiasts, it provides a clean interface to download tracks and playlists in MP3 format.

## Features

- **Spotify Integration:**
  - Fetches user playlists and tracks directly from Spotify.
  - Requires authentication using Spotify API.
  - Allows selection of individual tracks or entire playlists for download.

- **YouTube Integration:**
  - Downloads tracks or playlists using YouTube links.
  - Converts videos to MP3 format with customizable output.

### Prerequisites

Ensure the following dependencies are installed:

1. **Node.js and npm:** Required for running the application.
   ```bash
   # Check if npm is installed
   npm -v
   ```
   Install Node.js from [Node.js official site](https://nodejs.org) if necessary.

2. **Python 3:** Used for creating a virtual environment and downloading YouTube content.
   ```bash
   python3 --version
   ```

3. **yt-dlp:** Installable through your system package manager or pip.
   ```bash
   # macOS / Linux
   sudo apt install yt-dlp

   # Windows (via Chocolatey)
   choco install yt-dlp
   ```

4. **mandb:** For manual page installation.
   ```bash
   sudo apt install man-db
   ```

  ## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Spotituby
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the installation script to set up the environment and application dependencies:
   ```bash
   sudo ./install.sh
   ```

> NOTE: This script has only been tested on Mac, beware

4. Set up Spotify API credentials:
   - Visit [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications).
   - Create a new app and note the `Client ID` and `Client Secret`.
   - Add the redirect URI: `http://localhost:3000/callback`.
   - Save your credentials in a `.env` file in the root directory of this app:
     ```env
     SPOTIFY_CLIENT_ID=<your-client-id>
     SPOTIFY_CLIENT_SECRET=<your-client-secret>
     ```
---

## Usage

### 1. Running the Application

```bash
node index.js --mode cli --url <spotify-or-youtube-url>
```

> NOTE: This app has two modes, cli and server. Server mode is still not fully implemented. Use cli only for now

### 2. Examples

- Download a Spotify playlist:
  ```bash
  node index.js --mode cli --url https://open.spotify.com/playlist/4nT7b2XU4sVWp8Rt7A6WqI
  ```

- Download a YouTube playlist:
  ```bash
  node index.js --mode cli --url https://www.youtube.com/playlist?list=PLv9ZK9k7ZDjW5mDlMQm4eMjR4kxY9e8Ji
  ```

---

## Troubleshooting

- **Invalid Spotify Token:**
  - Ensure your `.env` file contains valid Spotify API credentials.
  - Clear the token file (`TOKENFILE`) and reauthenticate.

- **YouTube Download Issues:**
  - Verify `yt-dlp` is installed and accessible.


## Disclaimer

Spotituby is intended for personal use only. It's a hobby project lmao 😂