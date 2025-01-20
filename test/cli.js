import CLIMode from "../src/mode/cli";
import Songs from "../src/utils/songs.js";

const songs = [
    {
        name: "Song 1",
        artists: [{ name: "Artist 1" }],
        album: {
            name: "Album 1",
            images: [{ url: "image1.jpg" }],
            href: "https://example.com/album1",
            release_date: "2020-01-01"
        },
        duration_ms: 180000,
        external_urls: { spotify: "https://example.com/song1" },
        popularity: 80,
        disc_number: 1,
        track_number: 1,
        type: "track",
        explicit: false,
        external_ids: { isrc: "ISRC123" }
    },
    {
        name: "Song 2",
        artists: [{ name: "Artist 2" }],
        album: {
            name: "Album 2",
            images: [{ url: "image2.jpg" }],
            href: "https://example.com/album2",
            release_date: "2020-02-01"
        },
        duration_ms: 210000,
        external_urls: { spotify: "https://example.com/song2" },
        popularity: 70,
        disc_number: 1,
        track_number: 2,
        type: "track",
        explicit: true,
        external_ids: { isrc: "ISRC456" }
    },
    {
        name: "Song 3",
        artists: [{ name: "Artist 3" }],
        album: {
            name: "Album 3",
            images: [{ url: "image3.jpg" }],
            href: "https://example.com/album3",
            release_date: "2020-03-01"
        },
        duration_ms: 240000,
        external_urls: { spotify: "https://example.com/song3" },
        popularity: 90,
        disc_number: 1,
        track_number: 3,
        type: "track",
        explicit: false,
        external_ids: { isrc: "ISRC789" }
    },
    {
        name: "Song 4",
        artists: [{ name: "Artist 4" }],
        album: {
            name: "Album 4",
            images: [{ url: "image4.jpg" }],
            href: "https://example.com/album4",
            release_date: "2020-04-01"
        },
        duration_ms: 270000,
        external_urls: { spotify: "https://example.com/song4" },
        popularity: 60,
        disc_number: 1,
        track_number: 4,
        type: "track",
        explicit: true,
        external_ids: { isrc: "ISRC101" }
    },
    {
        name: "Song 5",
        artists: [{ name: "Artist 5" }],
        album: {
            name: "Album 5",
            images: [{ url: "image5.jpg" }],
            href: "https://example.com/album5",
            release_date: "2020-05-01"
        },
        duration_ms: 300000,
        external_urls: { spotify: "https://example.com/song5" },
        popularity: 50,
        disc_number: 1,
        track_number: 5,
        type: "track",
        explicit: false,
        external_ids: { isrc: "ISRC202" }
    }
];

const playlists = [
    {
      name: '1',
      id: '1',
      description: 'M O RO ON',
      tracks: [{
        name:'name',
        artist: 'artist'
      }]
    },
    {
      name: '2',
      tracks: [{
        name:'name',
        artist: 'artist'
      }],
      id: '2',
      description: 'M Oddd RO ON'
    }
  ]

const S = new Songs();
const CLI = new CLIMode();
CLI.listSongs(songs);