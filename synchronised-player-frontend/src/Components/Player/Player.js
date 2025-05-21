import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronUp,
  Headphones,
  LogOut,
  Volume,
  Volume1,
  Volume2,
  VolumeX,
} from "react-feather";
import { toast } from "react-hot-toast";
import Dexie from "dexie";

import Button from "Components/Button/Button";
import PlayerDetailsModal from "./PlayerDetailsModal/PlayerDetailsModal";

import notificationSound from "assets/notification.mp3";
import enterNotificationSound from "assets/enter_notification.wav";
import leaveNotificationSound from "assets/leave_notification.wav";
import actionTypes from "store/actionTypes";
import {
  formatSecondsToMinutesSeconds,
  getFileHashSha256,
  getSongUrlFromBackupStorage,
  shuffleArray,
} from "utils/util";
import {
  nextPlayIcon,
  pauseIcon,
  playIcon,
  previousPlayIcon,
  repeatIcon,
  repeatOneIcon,
} from "utils/svgs";
import { getAllSongs } from "apis/song";
import { sayHiToBackend } from "apis/user";
import { getCurrentRoom, getUserRooms } from "apis/room";
import { roomUserTypeEnum } from "utils/constants";

import styles from "./Player.module.scss";

const socketEventEnum = {
  playPause: "play-pause",
  updatePlaylist: "update-playlist",
  seek: "seek",
  prev: "prev",
  next: "next",
  playSong: "play-song",
  addSong: "add-song",
  deleteSong: "delete-song",
  notification: "notification",
  chat: "chat",
  clearChat: "clear-chat",
  voice: "voice",
  usersChange: "users-change",
  joinedRoom: "joined-room",
  getRoom: "get-room",
};
let DB = new Dexie("sleeping-owl-music");
DB.version(1).stores({
  audios: "++id,file,hash,url,name,createdAt",
});

let stream,
  mediaRecorder,
  audioChunks = [],
  chatSoundEnabled = false,
  lastVoiceReceivedAt,
  userRole;

let debounceTimeout,
  bufferCheckingInterval,
  heartbeatInterval,
  globalBufferingVariable = false,
  globalCurrentRoomId = "",
  globalCurrentRoomUsersLength = 0;
let progressDetails = {
  mouseDown: false,
  progress: NaN,
  song: {},
  roomId: "",
};
let downloadingFiles = [];
const enterNotificationElem = new Audio(enterNotificationSound);
const leaveNotificationElem = new Audio(leaveNotificationSound);
const notificationElem = new Audio(notificationSound);
let chatNotificationMuted = false;

function Player({ socket }) {
  const audioElemRef = useRef();

  const dispatch = useDispatch();
  const roomDetails = useSelector((state) => state.root.room);
  const userDetails = useSelector((state) => state.root.user);
  const isMobileView = useSelector((state) => state.root.mobileView);
  const lastSongUploadedTime = useSelector(
    (state) => state.root.songUploadedTimestamp
  );

  const [_dummyState, setDummyState] = useState(0);
  const [availableSongs, setAvailableSongs] = useState([]);
  const [inputElemProgress, setInputElemProgress] = useState(0);
  const [audioElemCurrTime, setAudioElemCurrTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [showMoreDetailsModal, setShowMoreDetailsModal] = useState(false);
  const [roomNotifications, setRoomNotifications] = useState([]);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [volumeDropdownOpen, setVolumeDropdownOpen] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(
    parseFloat(localStorage.getItem("song-volume")) || 0.8
  );
  const [repeatCurrentSong, setRepeatCurrentSong] = useState(false);
  const [userRooms, setUserRooms] = useState([]);

  const isPlayerActive = roomDetails?._id ? true : false;
  const currentSong =
    isPlayerActive && roomDetails?.playlist?.length
      ? roomDetails.playlist.find(
          (item) => item._id == roomDetails.currentSong
        ) || {}
      : {};
  const secondsPlayed = progressDetails.mouseDown
    ? (inputElemProgress / 100) * currentSong.length || 0
    : audioElemCurrTime;
  const progressPercent = progressDetails.mouseDown
    ? inputElemProgress
    : parseInt((audioElemCurrTime / currentSong?.length) * 100) || 0;

  const debounce = (func, time = 200) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(func, time);
  };

  const handleProgressChange = (prog) => {
    const length = progressDetails.song?.length;
    const seekedTo = parseInt((prog / 100) * length);

    const audio = audioElemRef.current;
    if (audio) {
      pauseAudio(audio);
      audio.currentTime = seekedTo;
    }

    console.log("🟡seek event emitted");
    socket.emit(socketEventEnum.seek, {
      seekSeconds: seekedTo,
      roomId: progressDetails.roomId,
      userId: userDetails._id,
    });
  };

  const handlePlayPauseToggle = () => {
    if (isBuffering) return;

    console.log("🟡play-pause event emitted");
    socket.emit(socketEventEnum.playPause, {
      roomId: roomDetails._id,
      userId: userDetails._id,
    });
  };

  const handlePlayNewSong = (songId) => {
    if (!songId) return;

    console.log("🟡play-song event emitted");
    socket.emit(socketEventEnum.playSong, {
      roomId: roomDetails._id,
      userId: userDetails._id,
      songId,
    });
    setIsBuffering(true);
  };

  const handleAddSong = (song) => {
    if (!song?._id || !song?.url) return;

    console.log("🟡add-song event emitted");
    socket.emit(socketEventEnum.addSong, {
      roomId: roomDetails._id,
      userId: userDetails._id,
      song,
    });
  };

  const handleDeleteSong = (songId) => {
    if (!songId) return;

    if (songId == currentSong._id) {
      // pauseAudio(audioElemRef.current);
      audioElemRef.current.src = "";
    }

    console.log(`🟡${socketEventEnum.deleteSong} event emitted`);
    socket.emit(socketEventEnum.deleteSong, {
      roomId: roomDetails._id,
      userId: userDetails._id,
      songId,
    });
  };

  const handleReorderPlaylist = (songIds) => {
    if (!Array.isArray(songIds) || typeof songIds[0] !== "string") return;

    console.log("🟡update-playlist event emitted for reordering");
    socket.emit(socketEventEnum.updatePlaylist, {
      roomId: roomDetails._id,
      userId: userDetails._id,
      songIds: songIds,
    });
  };

  const handlePreviousClick = () => {
    console.log("🟡prev event emitted");
    socket.emit(socketEventEnum.prev, {
      roomId: roomDetails._id,
      userId: userDetails._id,
      currentSongId: roomDetails.currentSong,
    });
  };

  const handleNextClick = (autoPlay = false) => {
    if (autoPlay && repeatCurrentSong) {
      const audio = audioElemRef.current;
      if (!audio) return;

      if (audio.paused) playAudio(audio);
      audio.currentTime = 0;
      setAudioElemCurrTime(0);

      return;
    }

    console.log("🟡next event emitted");
    socket.emit(socketEventEnum.next, {
      roomId: roomDetails._id,
      userId: userDetails._id,
      currentSongId: roomDetails.currentSong,
      autoPlay: autoPlay == true ? true : false,
    });
  };

  const handleSendMessage = (msg) => {
    setChatUnreadCount(0);

    console.log(`🟡${socketEventEnum.chat} event emitted`);
    socket.emit(socketEventEnum.chat, {
      roomId: roomDetails._id,
      userId: userDetails._id,
      message: msg,
      timestamp: Date.now(),
    });
  };

  const handleClearChats = () => {
    console.log(`🟡${socketEventEnum.clearChat} event emitted`);
    socket.emit(socketEventEnum.clearChat, {
      roomId: roomDetails._id,
      userId: userDetails._id,
    });
  };

  const handleShufflePlaylist = (alphabeticalOrder = false) => {
    const newSongIds = alphabeticalOrder
      ? [...roomDetails.playlist]
          .sort((a, b) =>
            a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1
          )
          .map((item) => item._id)
      : shuffleArray(roomDetails.playlist).map((item) => item._id);

    console.log(`🟡${socketEventEnum.updatePlaylist} event emitted to shuffle`);
    socket.emit(socketEventEnum.updatePlaylist, {
      roomId: roomDetails._id,
      userId: userDetails._id,
      songIds: newSongIds,
    });
  };

  const handleLeaveRoomClick = () => {
    if (chatSoundEnabled && stream) handleMicToggle();

    socket.emit("leave-room", {
      roomId: roomDetails._id,
      userId: userDetails._id,
    });
  };

  // const handleRefreshRoom = () => {
  //   setChatUnreadCount(0);

  //   console.log(`🟡${socketEventEnum.getRoom} event emitted`);
  //   socket.emit(socketEventEnum.getRoom, {
  //     roomId: roomDetails._id,
  //     userId: userDetails._id,
  //   });
  // };

  const handleSocketEvents = () => {
    socket.on(socketEventEnum.seek, (data) => {
      if (isNaN(data?.secondsPlayed)) return;

      dispatch({ type: actionTypes.UPDATE_ROOM, room: data });
    });

    socket.on(socketEventEnum.playPause, (data) => {
      if (!data) return;

      dispatch({ type: actionTypes.UPDATE_ROOM, room: data });
    });

    socket.on(socketEventEnum.prev, (data) => {
      dispatch({ type: actionTypes.UPDATE_ROOM, room: data });
    });

    socket.on(socketEventEnum.next, (data) => {
      if (audioElemRef.current) audioElemRef.current.currentTime = 0;

      dispatch({ type: actionTypes.UPDATE_ROOM, room: data });
    });

    socket.on(socketEventEnum.playSong, (data) => {
      if (!data.currentSong) return;

      dispatch({ type: actionTypes.UPDATE_ROOM, room: data });
    });

    socket.on(socketEventEnum.addSong, (data) => {
      if (!data.playlist?.length) return;

      dispatch({ type: actionTypes.UPDATE_ROOM, room: data });
      toast.success(`New song added`);
    });

    socket.on(socketEventEnum.updatePlaylist, (data) => {
      if (!data.playlist?.length) return;

      dispatch({ type: actionTypes.UPDATE_ROOM, room: data });
      toast.success(`Playlist updated`);
    });

    socket.on(socketEventEnum.notification, (msg) => {
      setRoomNotifications((prev) => [
        ...prev,
        typeof msg == "object" ? { ...msg, timestamp: Date.now() } : {},
      ]);
    });

    socket.on(socketEventEnum.voice, (data) => {
      if (!data?.audio || !data?.userId) return;

      const { audio, userId, timestamp } = data;

      if (
        !audio ||
        !chatSoundEnabled ||
        (lastVoiceReceivedAt && timestamp < lastVoiceReceivedAt) ||
        ![roomUserTypeEnum.admin, roomUserTypeEnum.owner].includes(userRole)
      )
        return;

      lastVoiceReceivedAt = timestamp;
      const audioElem = new Audio(audio);

      audioElem.play();
    });

    socket.on(socketEventEnum.chat, (data) => {
      if (!Array.isArray(data?.chats)) return;

      dispatch({ type: actionTypes.UPDATE_ROOM, room: data });

      if (!data?.chats?.length) {
        setChatUnreadCount(0);
        return;
      }

      setChatUnreadCount((prev) => prev + 1);

      const lastChat = Array.isArray(data.chats)
        ? data.chats[data.chats.length - 1]
        : {};
      if (!chatNotificationMuted && lastChat?.user?._id !== userDetails._id)
        playNotification();
    });

    socket.on(socketEventEnum.usersChange, (data) => {
      if (!data?.users?.length) return;
      dispatch({
        type: actionTypes.UPDATE_ROOM,
        room: { users: data.users },
      });

      const newUsersLength = data?.users?.length;
      if (newUsersLength !== globalCurrentRoomUsersLength) {
        if (
          newUsersLength > globalCurrentRoomUsersLength &&
          enterNotificationElem
        )
          enterNotificationElem.play();

        if (
          newUsersLength < globalCurrentRoomUsersLength &&
          leaveNotificationElem
        )
          leaveNotificationElem.play();
      }
    });

    socket.on(socketEventEnum.getRoom, (data) => {
      if (!Object.keys(data?.room)?.length || !data?.room?._id) return;

      dispatch({ type: actionTypes.ADD_ROOM, room: data.room });
    });

    socket.on("left-room", () => {
      if (audioElemRef.current) audioElemRef.current?.pause();

      dispatch({ type: actionTypes.DELETE_ROOM });
    });

    socket.on(socketEventEnum.joinedRoom, (data) => {
      if (!Object.keys(data)?.length) return;

      setRoomNotifications([]);
      dispatch({ type: actionTypes.ADD_ROOM, room: data });
      console.log("🟢 Room joined", data.name);
    });
  };

  const handleInputMousedown = () => {
    progressDetails.mouseDown = true;
    progressDetails.song = currentSong;
    progressDetails.roomId = roomDetails._id;
  };

  const handleMouseUp = () => {
    if (!progressDetails.mouseDown) return;

    const progress = progressDetails.progress;
    progressDetails.mouseDown = false;
    progressDetails.progress = NaN;

    if (isNaN(progress)) return;

    handleProgressChange(progress);
  };

  const handleAudioTimeUpdate = (event) => {
    if (progressDetails.mouseDown) return;

    const currSeconds = event.target.currentTime;

    if (parseInt(currSeconds) >= parseInt(currentSong.length))
      handleNextClick(true);
    setAudioElemCurrTime(currSeconds);
  };

  const playNotification = () => {
    if (notificationElem) notificationElem.play();
  };

  const playAudio = (audio, buffering = isBuffering) => {
    debounce(() => {
      if (!buffering) audio.play();
    }, 200);
  };

  const pauseAudio = (audio, buffering = isBuffering) => {
    debounce(() => {
      if (!buffering) audio.pause();
    }, 200);
  };

  const updateAudioElementWithControls = async (room) => {
    if (!Object.keys(room).length) return;
    if (!currentSong?.url) {
      toast.error("current song url not found!");
      return;
    }

    const audio = audioElemRef.current;

    if (audio.dataset.hash !== currentSong?.hash) {
      const fileRes = await getAudioFromIndexDB(currentSong.hash);
      const fileAsDataUrl =
        fileRes && fileRes?.file ? await readFileAsUrl(fileRes.file) : null;

      if (fileAsDataUrl) {
        audio.src = fileAsDataUrl;
        audio.dataset.hash = fileRes.hash;
        audio.load();
        setIsBuffering(true);
        clearTimeout(debounceTimeout);
        return;
      }

      audio.dataset.hash = currentSong.hash;
      audio.src = currentSong.url;
      audio.load();
      setIsBuffering(true);
      clearTimeout(debounceTimeout);

      if (!downloadingFiles.includes(currentSong.url))
        getAudioFileFromUrlAndStore(currentSong.url, currentSong.title);
    } else {
      if (room.paused) pauseAudio(audio);
      else playAudio(audio);
    }

    audio.currentTime = room.secondsPlayed;
    setAudioElemCurrTime(room.secondsPlayed);
  };

  const handleCanPlayEvent = (event, playNow = false) => {
    setIsBuffering(false);

    if (playNow) playAudio(event.target, false);
  };

  const checkForBuffering = () => {
    const audio = audioElemRef.current;
    if (!audio) return;

    if (globalBufferingVariable && audio.readyState >= 1)
      playAudio(audio, false);
  };

  const fetchAllSongs = async () => {
    const res = await getAllSongs();
    if (!res) return;

    setAvailableSongs(res.data);
  };

  const fetchUserRooms = async () => {
    const res = await getUserRooms();

    if (!res?.data) return;

    setUserRooms(res.data);
  };

  const readFileAsUrl = async (file) => {
    const reader = new FileReader();

    return new Promise((res) => {
      try {
        reader.onload = function (e) {
          res(e.target.result);
        };

        reader.onerror = () => res(null);

        reader.readAsDataURL(file);
      } catch (err) {
        console.log("Error reading file as dataURL", err);

        return null;
      }
    });
  };

  const getAudioFileFromUrlAndStore = async (url, name) => {
    try {
      const res = await fetch(url);
      if (res.status == 402 && !res.ok) {
        const newUrlRes = getSongUrlFromBackupStorage(url);
        if (!newUrlRes.success) {
          console.log("LIMIT REACHED!!");
          return;
        }

        const newUrl = newUrlRes.url;
        if (audioElemRef.current) {
          audioElemRef.current.src = newUrl;
          audioElemRef.current.load();
          setIsBuffering(true);
          clearTimeout(debounceTimeout);
        }
        getAudioFileFromUrlAndStore(newUrl, name);

        return;
      }

      if (res.status !== 200 || !res.ok) return;

      downloadingFiles.push(url);
      const blob = await res.blob();
      const hash = await getFileHashSha256(blob);

      downloadingFiles = downloadingFiles.filter((item) => item !== url);
      if (!blob || !hash) return;

      addAudioToIndexDB(blob, hash, url, name);
    } catch (err) {
      console.log("Error getting file from URL:", url, err);
    }
  };

  const addAudioToIndexDB = async (file, hash, url, name) => {
    try {
      const fileInDbRes = await DB.audios
        .where("hash")
        .equalsIgnoreCase(hash)
        .toArray();

      const fileInDb = fileInDbRes[0];
      if (fileInDb) return;

      await DB.audios.add({
        url: url,
        hash: hash,
        file,
        name,
        createdAt: Date.now(),
      });

      console.log(`🟢ADDED ${name} to db`);
      return true;
    } catch (e) {
      console.log(`🔴Error accessing file: ${e}`);
    }
  };

  const getAudioFromIndexDB = async (hash) => {
    if (!hash) return null;

    try {
      const files = await DB.audios
        .where("hash")
        .equalsIgnoreCase(hash)
        .toArray();

      const file = files[0];

      return file;
    } catch (e) {
      console.log(`🔴Error accessing file: ${e}`);
      return null;
    }
  };

  const cleanIndexDBIfNeeded = async () => {
    try {
      const files = await DB.audios.toArray();

      const oldStringsAsFiles = files.filter(
        (item) => typeof item.file == "string"
      );

      for (let i = 0; i < oldStringsAsFiles.length; ++i) {
        const song = oldStringsAsFiles[i];

        console.log(
          "🗑️ Deleting file stored as string from IndexDB:",
          song.name
        );
        await DB.audios.delete(song.id);
      }

      const maxSongsAllowedInDb = 200;

      if (files.length < maxSongsAllowedInDb) return;

      // sorting files from newest to oldest
      files.sort((a, b) =>
        new Date(a.createdAt) > new Date(b.createdAt) ? -1 : 1
      );
      const oldFilesToDelete = files.slice(maxSongsAllowedInDb);

      for (let i = 0; i < oldFilesToDelete.length; ++i) {
        const song = oldFilesToDelete[i];

        console.log("🗑️ Deleting old file from IndexDB:", song.name);
        await DB.audios.delete(song.id);
      }
    } catch (e) {
      console.log(`🔴Error clearing indexDB: ${e}`);
      return null;
    }
  };

  const getCurrentRoomForUser = async () => {
    const res = await getCurrentRoom();
    if (!res?.data?.roomId) return;

    sendHeartbeat();
    socket.emit("join-room", {
      roomId: res.data.roomId,
      userId: userDetails._id,
      ...userDetails,
    });
  };

  const turnMicOn = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      startRecording();
      setDummyState((prev) => prev + 1);
      return true;
    } catch (err) {
      toast.error("Microphone permission needed");
      console.log("🔴 Error getting permission", err);

      return false;
    }
  };

  const turnMicOff = async () => {
    if (stream && stream.getTracks) {
      stream.getTracks().forEach((track) => track.stop());

      toast("Mic turned OFF");
      stream = undefined;

      stopRecording();
      setDummyState((prev) => prev + 1);
    }
  };

  const handleRecorderDataAvailable = (event) => {
    audioChunks.push(event.data);
  };

  const handleRecorderStop = () => {
    const audioBlob = new Blob(audioChunks);

    audioChunks = [];
    const fileReader = new FileReader();
    fileReader.readAsDataURL(audioBlob);
    fileReader.onloadend = function () {
      const base64String = fileReader.result;

      socket.emit(socketEventEnum.voice, {
        userId: userDetails?._id,
        roomId: roomDetails?._id,
        audio: base64String,
      });
    };

    try {
      if (mediaRecorder && mediaRecorder.start) {
        mediaRecorder.start();

        setTimeout(
          () => (mediaRecorder?.stop ? mediaRecorder.stop() : ""),
          400
        );
      }
    } catch (err) {
      // nothing
    }
  };

  const startRecording = async () => {
    if (!stream) {
      toast.error("Stream not found to start recording!");
      console.log("🔴Stream not present to start recording");
      return;
    }

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();

    mediaRecorder.addEventListener(
      "dataavailable",
      handleRecorderDataAvailable
    );
    mediaRecorder.addEventListener("stop", handleRecorderStop);

    setTimeout(() => mediaRecorder.stop(), 300);
  };

  const stopRecording = () => {
    try {
      if (mediaRecorder && mediaRecorder.stop) mediaRecorder.stop();

      mediaRecorder.removeEventListener(
        "dataavailable",
        handleRecorderDataAvailable
      );
      mediaRecorder.removeEventListener("stop", handleRecorderStop);

      mediaRecorder = undefined;
    } catch (err) {
      console.log("Error stopping recorder");
    }
  };

  const handleMicToggle = () => {
    if (stream) debounce(turnMicOff, 500);
    else debounce(turnMicOn, 500);
  };

  const handleChatSoundToggle = () => {
    if (chatSoundEnabled) {
      turnMicOff();
    }

    chatSoundEnabled = !chatSoundEnabled;
    setDummyState((prev) => prev + 1);
  };

  const sendHeartbeat = () => {
    if (socket) {
      console.log("❤️ heartbeat");
      socket.emit("alive", {
        userId: userDetails._id,
        roomId: globalCurrentRoomId,
      });
    }
  };

  const greetBackend = async () => {
    await sayHiToBackend();
  };

  useEffect(() => {
    if (isFirstRender) return;

    updateAudioElementWithControls(roomDetails);
  }, [roomDetails.currentSong, roomDetails.secondsPlayed, roomDetails.paused]);

  useEffect(() => {
    globalCurrentRoomId = roomDetails._id;

    chatSoundEnabled = true;
  }, [roomDetails._id]);

  useEffect(() => {
    globalCurrentRoomUsersLength = roomDetails?.users?.length || 0;

    userRole = Array.isArray(roomDetails.users)
      ? roomDetails.users.find((item) => item._id == userDetails._id)?.role ||
        roomUserTypeEnum.member
      : roomUserTypeEnum.member;
  }, [roomDetails.users]);

  useEffect(() => {
    globalBufferingVariable = isBuffering;
  }, [isBuffering]);

  // useEffect(() => {
  //   fetchAllSongs();
  // }, [lastSongUploadedTime]);

  useEffect(() => {
    if (audioElemRef.current) audioElemRef.current.volume = currentVolume;

    localStorage.setItem("song-volume", currentVolume);
  }, [currentVolume]);

  useEffect(() => {
    setIsFirstRender(false);
    cleanIndexDBIfNeeded();
    getCurrentRoomForUser();
    fetchUserRooms();
    fetchAllSongs();

    setInterval(greetBackend, 120 * 1000);

    if (bufferCheckingInterval) {
      clearInterval(bufferCheckingInterval);
      bufferCheckingInterval = null;
      bufferCheckingInterval = setInterval(checkForBuffering, 2000);
    } else {
      bufferCheckingInterval = setInterval(checkForBuffering, 2000);
    }

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleMouseUp);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    handleSocketEvents();

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(sendHeartbeat, 60 * 1000);
    } else {
      heartbeatInterval = setInterval(sendHeartbeat, 60 * 1000);
    }

    return () => {
      try {
        Object.values(socketEventEnum).forEach((e) => socket.off(e));
      } catch (err) {
        console.log("error removing socket events", err);
      }
    };
  }, [socket]);

  const dotLoadingDiv = (
    <div className={styles.dotLoading}>
      <div className={styles.dot} />
    </div>
  );

  const volumeButton = (
    <div className={styles.volumeButton}>
      <div
        className={styles.icon}
        onClick={() => {
          if (volumeDropdownOpen) setVolumeDropdownOpen(false);
          else {
            setVolumeDropdownOpen(true);
            debounce(() => setVolumeDropdownOpen(false), 3000);
          }
        }}
      >
        {volumeDropdownOpen ? (
          <p>{parseInt(currentVolume * 100)}</p>
        ) : currentVolume == 0 ? (
          <VolumeX />
        ) : currentVolume < 0.2 ? (
          <Volume />
        ) : currentVolume < 0.6 ? (
          <Volume1 />
        ) : (
          <Volume2 />
        )}
      </div>

      {volumeDropdownOpen && (
        <div className={styles.volumeBox}>
          <input
            type="range"
            value={currentVolume * 100}
            onChange={(event) => {
              setCurrentVolume(event.target.value / 100);

              debounce(() => setVolumeDropdownOpen(false), 1000);
            }}
          />
        </div>
      )}
    </div>
  );

  const repeatButton = (
    <div
      className={`${styles.repeatButton} ${
        repeatCurrentSong ? styles.activeButton : ""
      }`}
    >
      <div
        className={styles.icon}
        onClick={() => setRepeatCurrentSong((prev) => !prev)}
      >
        {repeatCurrentSong ? repeatOneIcon : repeatIcon}
      </div>
    </div>
  );

  return (
    <div
      className={`${styles.container} ${isPlayerActive ? "" : styles.inactive}`}
    >
      {showMoreDetailsModal && (
        <PlayerDetailsModal
          onClose={() => setShowMoreDetailsModal(false)}
          notifications={roomNotifications}
          onToggleCurrentSong={handlePlayPauseToggle}
          onPlayNewSong={handlePlayNewSong}
          onDeleteSong={handleDeleteSong}
          allSongs={availableSongs}
          userRooms={userRooms}
          updateUserRooms={fetchUserRooms}
          onAddNewSong={handleAddSong}
          onReorderPlaylist={handleReorderPlaylist}
          onShufflePlaylist={handleShufflePlaylist}
          onMessageSent={handleSendMessage}
          chatUnreadCount={chatUnreadCount}
          updateChatUnreadCount={(c) => (isNaN(c) ? "" : setChatUnreadCount(c))}
          chatNotificationMuted={chatNotificationMuted}
          toggleChatNotificationMute={() => {
            chatNotificationMuted = !chatNotificationMuted;
            setDummyState((prev) => prev + 1);
          }}
          onClearChatCLick={handleClearChats}
          micOn={stream ? true : false}
          onMicToggle={handleMicToggle}
          chatSoundEnabled={chatSoundEnabled}
          toggleChatSound={handleChatSoundToggle}
        />
      )}
      <div className={styles.inactiveOverlay} />

      {isMobileView && (
        <div className={styles.topBar}>
          <div
            className={styles.expandButton}
            onClick={() => setShowMoreDetailsModal(true)}
          >
            {chatUnreadCount > 0 && (
              <span className={styles.unreadCount}>{chatUnreadCount}</span>
            )}

            <ChevronUp />
          </div>

          <p className={styles.name}>{currentSong.title}</p>

          <div className={styles.logoutButton} onClick={handleLeaveRoomClick}>
            <LogOut />
          </div>
        </div>
      )}

      <audio
        ref={audioElemRef}
        style={{ display: "none" }}
        controls
        onTimeUpdate={handleAudioTimeUpdate}
        onPlaying={() => {
          setIsBuffering(false);
        }}
        onWaiting={() => {
          setIsBuffering(true);
        }}
        onCanPlay={handleCanPlayEvent}
        onCanPlayThrough={handleCanPlayEvent}
        onLoadedMetadata={(e) => handleCanPlayEvent(e, true)}
      />

      <div className={styles.left}>
        <div className={styles.name}>
          <div>
            <Headphones />
          </div>

          <p className={styles.title}>{currentSong.title}</p>
        </div>
        <p className={styles.desc}>{currentSong.artist}</p>
      </div>

      <div className={styles.controller}>
        <div className={styles.buttons}>
          {volumeButton}
          {repeatButton}

          <div
            className={`${styles.button} ${styles.prev}`}
            onClick={() => handlePreviousClick()}
          >
            {previousPlayIcon}
          </div>
          <div
            className={`${styles.button} ${styles.play}`}
            onClick={() => handlePlayPauseToggle()}
          >
            {isBuffering
              ? dotLoadingDiv
              : roomDetails.paused
              ? playIcon
              : pauseIcon}
          </div>
          <div
            className={`${styles.button} ${styles.next}`}
            onClick={() => handleNextClick()}
          >
            {nextPlayIcon}
          </div>
        </div>

        <div className={styles.progressContainer}>
          <p className={styles.time}>
            {formatSecondsToMinutesSeconds(secondsPlayed)}
          </p>

          <div className={styles.progressBar}>
            <div
              className={styles.progress}
              style={{ width: `${progressPercent}%` }}
            />

            <input
              className={styles.progressInput}
              type="range"
              onMouseDown={handleInputMousedown}
              onTouchStart={handleInputMousedown}
              onChange={(event) => {
                const prog = parseInt(event.target.value);
                progressDetails.progress = prog;
                setInputElemProgress(prog);
              }}
            />
          </div>

          <p className={styles.time}>
            {formatSecondsToMinutesSeconds(currentSong.length)}
          </p>
        </div>
      </div>

      <div className={styles.right}>
        <p className={styles.title}>{roomDetails.name}</p>

        <div className={styles.btns}>
          <div className={styles.moreButton}>
            {chatUnreadCount > 0 && (
              <span className={styles.unreadCount}>{chatUnreadCount}</span>
            )}
            <Button
              className={`${styles.moreBtn} ${styles.btn}`}
              outlineButton
              onClick={() => setShowMoreDetailsModal(true)}
            >
              More details
            </Button>
          </div>

          <Button
            className={styles.btn}
            outlineButton
            onClick={handleLeaveRoomClick}
          >
            <LogOut />{" "}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Player;
