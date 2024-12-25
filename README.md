<div align="center">

# 🎵 Spotituby

*Download your favorite music, anywhere, anytime* 

[![GitHub package.json version](https://img.shields.io/github/package-json/v/FrenzyExists/spotituby?style=for-the-badge&logo=github&color=F4A4B5)](https://github.com/FrenzyExists/spotituby)
[![npm](https://img.shields.io/npm/dt/spotituby?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/spotituby)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge&color=98C379)](LICENSE)
<a href="https://github.com/FrenzyExists/spotituby/stargazers"><img src="https://img.shields.io/github/stars/FrenzyExists/spotituby?style=for-the-badge&logo=starship style=flat-square"></a>
<a href="https://github.com/FrenzyExists/spotituby/issues"><img src="https://img.shields.io/github/issues/FrenzyExists/spotituby?style=for-the-badge&logo=bugatti"></a>
</div>

## ✨ Features

🎵 **Spotify Integration**
- Download tracks from your favorite playlists
- Access your liked songs
- Smart track selection with metadata preservation

🎬 **YouTube Support**
- Download from YouTube playlists or single videos
- High-quality audio conversion
- Automatic metadata tagging

🚀 **Easy to Use**
- Simple CLI interface
- Cross-platform support (Windows, macOS, Linux)
- Fast and efficient downloads

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

<details>
<summary>📦 Required Dependencies</summary>

- **Node.js & npm** - [Download](https://nodejs.org)
  ```bash
  node --version  # Should be >= 14
  ```

- **Python 3** - [Download](https://python.org)
  ```bash
  python3 --version  # Should be >= 3.12
  ```

- **yt-dlp** - For YouTube downloads
  ```bash
  # Linux/macOS
  sudo apt install yt-dlp  # Debian/Ubuntu
  brew install yt-dlp      # macOS

  # Windows
  choco install yt-dlp
  ```

</details>

### 🔧 Installation

1. **Install from npm**
   ```bash
   npm install -g spotituby
   ```

   Or clone and build:
   ```bash
   git clone https://github.com/FrenzyExists/spotituby.git
   cd spotituby
   ./install.sh
   ```

2. **Configure Spotify API**
   
   Create a `.env` file:
   ```env
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   ```
   
   <details>
   <summary>🔑 How to get Spotify credentials</summary>
   
   1. Visit [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   2. Create a new app
   3. Add `http://localhost:3000/callback` to Redirect URIs
   4. Copy Client ID and Client Secret
   </details>

## 🎮 Usage

### Basic Commands

```bash
# Download from Spotify playlist
spotituby cli --url https://open.spotify.com/playlist/37i9dQZF1DX5Ejj0EkURtP

# Download from YouTube playlist
spotituby cli --url https://www.youtube.com/playlist?list=PLv9ZK9k7ZDjW5mDlMQm4eMjR4kxY9e8Ji

# Reset credentials
spotituby --reset
```

### 🎨 Features in Action

<details>
<summary>📥 Downloading Playlists</summary>

```bash
spotituby cli
# Follow the interactive prompts to:
# 1. Select a playlist
# 2. Choose tracks
# 3. Download and convert
```
</details>

<details>
<summary>🔄 Managing Authentication</summary>

```bash
# Reset stored credentials
spotituby --reset

# Start on CLI Mode
spotituby cli
```
</details>

## 🤝 Contributing

Contributions are what make the open source community amazing! Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🌟 Show your support

Give a ⭐️ if this project helped you!

## 📧 Contact

Detective Pikachu - [@Not__Pikachu](https://twitter.com/Not__Pikachu)

---

<div align="center">
Made with ❤️ by <a href="https://github.com/FrenzyExists">FrenzyExists</a>
</div>
