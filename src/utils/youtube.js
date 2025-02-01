
import { executeCommand } from "../utils.js";

const FILTER_QUERY = `--reject-title \"official video|music video\"`;

const YoutubeManager = class {
  fetchSongUrl = async ({
    url = null,
    query = null,
    resultsCount = 5,
  }) => {
    try {
      if (!url && query) {
        const SEARCH_QUERY = `ytsearch${resultsCount}:\"${query.artist} - ${query.name}\"`;
        const SEARCH_COMMAND = `yt-dlp ${SEARCH_QUERY} ${FILTER_QUERY} --print \"%(webpage_url)s\" 2>/dev/null | head -n 1`;

        url = await executeCommand(SEARCH_COMMAND);
        if (!url) {
          throw new Error("No results found for the given metadata.");
        }
      }
      if (!url) {
        throw new Error("No URL or query provided.");
      }
      console.log("URL", url);
      

    } catch (e) {
      console.log(e);
    }
  }

  fetchSongDetails = async (url) => {
    const FETCH_COMMAND = `yt-dlp ${url} --print \"%(track)s|||%(artists)s|||%(release_year)s|||%(album)s\" 2>/dev/null`;
    let e =  await executeCommand(FETCH_COMMAND)
    
    e = e.split("|||");
    if (e[0] === 'NA' && e[1] === 'NA' && e[2] === 'NA') {
      throw new Error("Failed to fetch song details.");
    }
    e[1] = e[1].replace(/'/g, '"').replace(/\[|\]/g, '');
    const regex = /"(.*?)"/g;
    const regexRemoveQuotes = /"(.*?)"$/g;
    e[1] = e[1].match(regex);
    e[1] = e[1].map(item => item.replace(regexRemoveQuotes, '$1'));
    return e;
  }
}

export default YoutubeManager;