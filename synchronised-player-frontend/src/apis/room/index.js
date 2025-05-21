import { errorToastLogger, fetchWrapper } from "utils/util";

export const getAllRooms = async () => {
  const reqPath = `/room/all`;
  let response;

  try {
    response = await fetchWrapper(reqPath);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "getAllRooms",
        data?.message || "Failed to get rooms",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("getAllRooms", "Failed to get rooms", err);
    return false;
  }
};

export const createRoom = async (values) => {
  const reqPath = `/room`;
  let response;

  try {
    response = await fetchWrapper(reqPath, values);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "createRoom",
        data?.message || "Failed to create new room",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("createRoom", "Failed to create new room", err);
    return false;
  }
};

export const createRoomWithRandomSongs = async (values) => {
  const reqPath = `/room/random`;
  let response;

  try {
    response = await fetchWrapper(reqPath, values);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "createRoomWithRandomSongs",
        data?.message || "Failed to create new room",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger(
      "createRoomWithRandomSongs",
      "Failed to create new room",
      err
    );
    return false;
  }
};

export const updateRoom = async (rid, values) => {
  const reqPath = `/room/${rid}`;
  let response;

  try {
    response = await fetchWrapper(reqPath, values, "", "PUT");
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "updateRoom",
        data?.message || "Failed to update room",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("updateRoom", "Failed to update room", err);
    return false;
  }
};

export const deleteRoom = async (rid) => {
  const reqPath = `/room/${rid}`;
  let response;

  try {
    response = await fetchWrapper(reqPath, "", "", "DELETE");
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "deleteRoom",
        data?.message || "Failed to delete room",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("deleteRoom", "Failed to delete room", err);
    return false;
  }
};

export const promoteToAdmin = async (rid, uid) => {
  const reqPath = `/room/${rid}/promote/admin/${uid}`;
  let response;

  try {
    response = await fetchWrapper(reqPath);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "promoteToAdmin",
        data?.message || "Failed to promote to admin",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("promoteToAdmin", "Failed to promote to admin", err);
    return false;
  }
};

export const promoteToController = async (rid, uid) => {
  const reqPath = `/room/${rid}/promote/controller/${uid}`;
  let response;

  try {
    response = await fetchWrapper(reqPath);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "promoteToController",
        data?.message || "Failed to promote to controller",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger(
      "promoteToController",
      "Failed to promote to controller",
      err
    );
    return false;
  }
};

export const demoteAdmin = async (rid, uid) => {
  const reqPath = `/room/${rid}/demote/admin/${uid}`;
  let response;

  try {
    response = await fetchWrapper(reqPath);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "demoteAdmin",
        data?.message || "Failed to demote admin",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("demoteAdmin", "Failed to demote admin", err);
    return false;
  }
};

export const demoteController = async (rid, uid) => {
  const reqPath = `/room/${rid}/demote/controller/${uid}`;
  let response;

  try {
    response = await fetchWrapper(reqPath);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "demoteController",
        data?.message || "Failed to demote controller",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("demoteController", "Failed to demote controller", err);
    return false;
  }
};

export const getCurrentRoom = async () => {
  const reqPath = `/room/current`;
  let response;

  try {
    response = await fetchWrapper(reqPath);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "getCurrentRoom",
        data?.message || "Failed to get user's room",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("getCurrentRoom", "Failed to get user's room", err);
    return false;
  }
};

export const getUserRooms = async () => {
  const reqPath = `/room/user`;
  let response;

  try {
    response = await fetchWrapper(reqPath);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "getUserRooms",
        data?.message || "Failed to get user's rooms",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("getUserRooms", "Failed to get user's rooms", err);
    return false;
  }
};

export const addSongToRoom = async (rid, sid) => {
  const reqPath = `/room/song/${rid}/${sid}`;
  let response;

  try {
    response = await fetchWrapper(reqPath, "", "", "POST");
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "addSongToRoom",
        data?.message || "Failed to add song",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("addSongToRoom", "Failed to add song", err);
    return false;
  }
};
