## Personal Notes

About 


## Modules

<dl>
<dt><a href="#module_fetchMe">fetchMe</a> ⇒ <code>Promise.&lt;SpotifyApi.UserObjectFull&gt;</code></dt>
<dd><p>Fetches the user object from the Spotify API using the given access token.</p>
</dd>
<dt><a href="#module_fetchLikedTracks">fetchLikedTracks</a> ⇒ <code>Promise.&lt;Array&gt;</code></dt>
<dd><p>Asynchronous function to fetch liked tracks from Spotify.</p>
<p>This function retrieves the user&#39;s liked tracks from Spotify using pagination.
It continues fetching tracks until all are retrieved or the specified page size is reached.</p>
</dd>
<dt><a href="#module_killPort">killPort</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Kills any process running on the specified port.</p>
</dd>
</dl>

## Members

<dl>
<dt><a href="#utils">utils</a> ⇒ <code>string</code> | <code>null</code></dt>
<dd><p>Identifies the type of a given URL.</p>
</dd>
</dl>

<a name="module_fetchMe"></a>

## fetchMe ⇒ <code>Promise.&lt;SpotifyApi.UserObjectFull&gt;</code>
Fetches the user object from the Spotify API using the given access token.

**Returns**: <code>Promise.&lt;SpotifyApi.UserObjectFull&gt;</code> - The user object  

| Param | Type | Description |
| --- | --- | --- |
| accessToken | <code>string</code> | The Spotify access token to use for the request |

<a name="module_fetchLikedTracks"></a>

## fetchLikedTracks ⇒ <code>Promise.&lt;Array&gt;</code>
Asynchronous function to fetch liked tracks from Spotify.

This function retrieves the user's liked tracks from Spotify using pagination.
It continues fetching tracks until all are retrieved or the specified page size is reached.

**Returns**: <code>Promise.&lt;Array&gt;</code> - - A promise that resolves to an array of liked tracks.  
**Throws**:

- <code>Error</code> - Throws an error if the request to fetch tracks fails.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| accessToken | <code>string</code> |  | The access token for Spotify API authentication. |
| [pageSize] | <code>number</code> | <code>-1</code> | The total number of tracks to fetch. If set to -1, fetches all tracks. |

<a name="module_killPort"></a>

## killPort ⇒ <code>Promise.&lt;void&gt;</code>
Kills any process running on the specified port.


| Param | Type | Description |
| --- | --- | --- |
| port | <code>number</code> | The port number to check. |

<a name="utils"></a>

## utils ⇒ <code>string</code> \| <code>null</code>
Identifies the type of a given URL.

**Kind**: global variable  
**Returns**: <code>string</code> \| <code>null</code> - Type of the URL, or null if the type could not be determined.
The type can be one of the following:
- 'yt-track' if the URL is a YouTube track URL
- 'yt-playlist' if the URL is a YouTube playlist URL
- 'sy-track' if the URL is a Spotify track URL
- 'sy-playlist' if the URL is a Spotify playlist URL  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | URL to identify |

