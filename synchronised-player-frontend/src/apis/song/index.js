import { errorToastLogger, fetchWrapper } from "utils/util";

export const searchSong = async (query) => {
  const reqPath = `/song?search=${query}`;
  let response;

  try {
    response = await fetchWrapper(reqPath);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "searchSong",
        data?.message || "Failed to search song",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("searchSong", "Failed to search song", err);
    return false;
  }
};

export const getAllSongs = async () => {
  const reqPath = `/song/all`;
  let response;

  try {
    response = await fetchWrapper(reqPath);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "getAllSongs",
        data?.message || "Failed to get songs",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("getAllSongs", "Failed to get songs", err);
    return false;
  }
};

export const checkSongAvailability = async (values) => {
  const reqPath = `/song/available`;
  let response;

  try {
    response = await fetchWrapper(reqPath, values);
    const data = await response.json();

    return data;
  } catch (err) {
    errorToastLogger(
      "checkSongAvailability",
      "Failed req to check song availability",
      err
    );
    return false;
  }
};

export const addNewSong = async (values) => {
  const reqPath = `/song`;
  let response;

  try {
    response = await fetchWrapper(reqPath, values);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "addNewSong",
        data?.message || "Failed to add song",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("addNewSong", "Failed to add song", err);
    return false;
  }
};

export const updateSong = async (sid, values) => {
  const reqPath = `/song/${sid}`;
  let response;

  try {
    response = await fetchWrapper(reqPath, values, "", "PUT");
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "updateSong",
        data?.message || "Failed to update song",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("updateSong", "Failed to update song", err);
    return false;
  }
};

export const deleteSong = async (sid) => {
  const reqPath = `/song/${sid}`;
  let response;

  try {
    response = await fetchWrapper(reqPath, "", "", "DELETE");
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "deleteSong",
        data?.message || "Failed to delete song",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("deleteSong", "Failed to delete song", err);
    return false;
  }
};
