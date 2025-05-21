const getFileDownloadLinksFromSpotifyDown = async (
  playlistId,
  maxFiles = 500
) => {
  if (!playlistId) {
    console.log(`🔴Playlist Id required`);
    return;
  }

  const startTime = Date.now();

  console.log(`🟡Getting all the track list`);
  const allSongsData = [];

  for (let i = 0; i < maxFiles; i += 100) {
    const tempRes = await (
      await fetch(
        `https://api.spotifydown.com/trackList/playlist/${playlistId}?offset=${i}`
      )
    ).json();
    if (!tempRes.success) {
      console.log(`🔴Error getting trackLists`, tempRes);
      continue;
    }

    const trackList = Array.isArray(tempRes?.trackList)
      ? tempRes.trackList
      : [];
    if (trackList?.length < 50) i = maxFiles;

    allSongsData.push(...trackList);
  }

  const filesWithLinks = [];

  for (let i = 0; i < allSongsData.length; ++i) {
    console.log(`🟡Getting link for file:${i + 1}/${allSongsData.length}`);

    if (filesWithLinks.length && filesWithLinks.length % 50 == 0)
      console.log(`🟡 Files collected till now`, filesWithLinks);

    const file = allSongsData[i];
    let res;
    try {
      res = await (
        await fetch(`https://api.spotifydown.com/download/${file.id}`)
      ).json();
    } catch (err) {
      console.log("Error making request", err);
    }

    if (res?.link)
      filesWithLinks.push({
        // link: "https://corsproxy.io/?" + res.link,
        link: res.link,
        ...res.metadata,
      });
  }

  const endTime = Date.now();

  console.log(
    `🟢 got all files with links and meta in ${
      (endTime - startTime) / 1000
    }sec`,
    filesWithLinks
  );
  return filesWithLinks;
};

const getFileDownloadLinksFromSpotifyDownParallelly = async (
  playlistId,
  simultaneouslyUpdateOnServer = false,
  maxFiles = 500
) => {
  if (!playlistId) {
    console.log(`🔴Playlist Id required`);
    return;
  }
  const startTime = Date.now();

  console.log(`🟡Getting all the track list`);
  const allSongsData = [];

  for (let i = 0; i < maxFiles; i += 100) {
    const tempRes = await (
      await fetch(
        `https://api.spotifydown.com/trackList/playlist/${playlistId}?offset=${i}`
      )
    ).json();
    if (!tempRes.success) {
      console.log(`🔴Error getting trackLists`, tempRes);
      continue;
    }

    const trackList = Array.isArray(tempRes?.trackList)
      ? tempRes.trackList
      : [];
    if (trackList?.length < 50) i = maxFiles;

    allSongsData.push(...trackList);
  }

  function chunkArray(inputArray, chunkSize) {
    const outputArray = [];

    for (let i = 0; i < inputArray.length; i += chunkSize) {
      const chunk = inputArray.slice(i, i + chunkSize);
      outputArray.push(chunk);
    }

    return outputArray;
  }

  const filesWithLinks = [];

  const chunkSize = 5;
  const segregatedSongs = chunkArray(allSongsData, chunkSize);
  const jsonResponses = [];

  for (let i = 0; i < segregatedSongs.length; ++i) {
    console.log(
      `🟡Getting link for files [${i * chunkSize} - ${
        i * chunkSize + chunkSize
      }]`
    );

    const chunk = segregatedSongs[i];

    const responses = await Promise.all(
      chunk.map((item) =>
        fetch(`https://api.spotifydown.com/download/${item.id}`).catch((err) =>
          console.error("fetch error: ", err)
        )
      )
    );

    const currResponses = [];
    for (let i = 0; i < responses.length; ++i) {
      const item = responses[i];

      let json;
      try {
        json = await item.json();
      } catch (err) {
        json = null;
      }

      if (json && json?.link) {
        const songData = { link: json.link, ...json.metadata };
        jsonResponses.push(songData);
        currResponses.push(songData);
      }
    }

    if (simultaneouslyUpdateOnServer)
      await fetch(`https://sleeping-owl.onrender.com/song/bulk/d-u`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracks: currResponses,
        }),
      }).catch((err) => console.log("Error on server", err));
  }

  console.log(`Got the responses for ${jsonResponses.length} files`);

  jsonResponses.forEach((item) => {
    filesWithLinks.push(item);
  });

  const endTime = Date.now();

  console.log(
    `🟢 got all files with links and meta in ${
      (endTime - startTime) / 1000
    }sec`,
    filesWithLinks
  );
  return filesWithLinks;
};

const separateFilesByDomains = (files) => {
  const domains = files.map((item) =>
    item.link.split("?")[0].split("/").slice(0, -1).join("/")
  );

  const uniqueDomains = domains.filter(
    (item, index, self) => self.indexOf(item) == index
  );

  const filesByDomains = {};

  uniqueDomains.forEach((d) => {
    const filesWithD = files.filter((item) => item.link.startsWith(d));

    filesByDomains[d] = [...filesWithD];
  });

  return filesByDomains;
};

const downloadFilesFromLinks = async (files) => {
  if (!files.length) {
    console.log(`🔴Files required`);
    return;
  }

  function downloadFile(url, fileName) {
    console.log(`Downloading  file:${fileName}`);

    fetch(url)
      .then((response) => {
        const totalSize = response.headers.get("Content-Length");
        let downloadedSize = 0;
        let lastLoggedProgress = 0;
        const chunks = [];

        const reader = response.body.getReader();

        const pump = () => {
          return reader.read().then(({ value, done }) => {
            if (done) {
              console.log("🟢Download completed");
              const blob = new Blob(chunks);
              var link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = fileName;
              link.style.display = "none";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              return;
            }

            downloadedSize += value.length;
            const progress = Math.floor((downloadedSize / totalSize) * 100);

            if (progress - lastLoggedProgress >= 10) {
              console.log(`${progress}% done`);
              lastLoggedProgress = progress;
            }

            chunks.push(value);
            return pump();
          });
        };

        pump();
      })
      .catch((err) => console.log("Error downloading song", err));
  }

  for (let i = 0; i < files.length; ++i) {
    const file = files[i];
    const filename = file.title + "_-_" + file.artists + ".mp3";
    downloadFile(file.link, filename);

    // request after an interval
    await new Promise((res) => setTimeout(res, 4 * 1000));
  }
};
