import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  BellOff,
  Filter,
  Headphones,
  Mic,
  MicOff,
  Send,
  Share2,
  Shuffle,
  Volume2,
  VolumeX,
  X,
} from "react-feather";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { toast } from "react-hot-toast";

import Modal from "Components/Modal/Modal";
import InputSelect from "Components/InputControl/InputSelect/InputSelect";
import Button from "Components/Button/Button";
import Spinner from "Components/Spinner/Spinner";
import InputControl from "Components/InputControl/InputControl";
import UserRoomsModal from "./UserRoomsModal/UserRoomsModal";

import {
  alphabeticalIcon,
  dragIcon,
  pauseIcon,
  playIcon,
  playlistMusicIcon,
} from "utils/svgs";
import {
  copyToClipboard,
  getTimeFormatted,
  isEmojiPresentInString,
} from "utils/util";
import { roomUserTypeEnum } from "utils/constants";
import {
  demoteAdmin,
  demoteController,
  promoteToAdmin,
  promoteToController,
} from "apis/room";
import { searchSong } from "apis/song";

import styles from "./PlayerDetailsModal.module.scss";

let debounceTimeout;
function PlayerDetailsModal({
  onClose,
  notifications = [],
  allSongs = [],
  onToggleCurrentSong,
  onPlayNewSong,
  onDeleteSong,
  onAddNewSong,
  onReorderPlaylist,
  onShufflePlaylist,
  onMessageSent,
  chatUnreadCount = 0,
  updateChatUnreadCount,
  chatNotificationMuted,
  toggleChatNotificationMute,
  onClearChatCLick,
  micOn = false,
  onMicToggle,
  chatSoundEnabled,
  toggleChatSound,
  userRooms = [],
  updateUserRooms,
}) {
  const headerRef = useRef();
  const messagesOuterRef = useRef();
  const chatInputRef = useRef();
  const tabsEnum = {
    playlist: "playlist",
    users: "users",
    chat: "chat",
    activity: "activity",
  };
  const userDetails = useSelector((state) => state.root.user);
  const roomDetails = useSelector((state) => state.root.room);
  const isMobileView = useSelector((state) => state.root.mobileView);

  const [activeTab, setActiveTab] = useState(tabsEnum.playlist);
  const [playlist, setPlaylist] = useState(roomDetails.playlist || []);
  const [inputMessage, setInputMessage] = useState("");
  const [inputKeyword, setInputKeyword] = useState("");
  const [updatingAccessForUser, setUpdatingAccessForUser] = useState("");
  const [selectedSongForUserRooms, setSelectedSongForUserRooms] = useState("");
  const [onlyHighlight, setOnlyHighlight] = useState(false);

  const validUserRooms = userRooms.filter(
    (item) => item._id !== roomDetails?._id
  );
  const userRole = Array.isArray(roomDetails.users)
    ? roomDetails.users.find((item) => item._id == userDetails._id)?.role ||
      roomUserTypeEnum.member
    : roomUserTypeEnum.member;
  const defaultSongs = allSongs
    .filter((item) => !roomDetails.playlist.some((s) => s._id == item._id))
    .map((item) => ({
      ...item,
      value: item._id,
      label: item.title,
      artist: item.artist,
    }));
  const playlistSongs = Array.isArray(playlist)
    ? onlyHighlight
      ? playlist
      : playlist.filter((item) =>
          inputKeyword && item?.title && item.artist
            ? item.title.toLowerCase().includes(inputKeyword.toLowerCase()) ||
              item.artist.toLowerCase().includes(inputKeyword.toLowerCase())
            : true
        )
    : [];

  const debounce = (func, args, timer = 300) => {
    clearTimeout(debounceTimeout);

    return new Promise((resolve, reject) => {
      debounceTimeout = setTimeout(() => resolve(func(...args)), timer);
    });
  };

  const handleDragEnd = (dragObj) => {
    const si = dragObj.source?.index;
    const di = dragObj.destination?.index;
    if (isNaN(di) || isNaN(si)) return;

    const tempPlaylist = [...playlist];
    const sElement = tempPlaylist[si];
    tempPlaylist.splice(si, 1);
    tempPlaylist.splice(di, 0, sElement);

    setPlaylist(tempPlaylist);
    if (onReorderPlaylist)
      onReorderPlaylist(tempPlaylist.map((item) => item._id));
  };

  const handleChatSubmission = () => {
    if (!inputMessage || !inputMessage.trim()) return;

    const msg = inputMessage;
    setInputMessage("");
    chatInputRef.current.focus();

    if (onMessageSent) onMessageSent(msg);
  };

  const handlePromoteClick = async (uid, role) => {
    if (role == roomUserTypeEnum.owner || role == roomUserTypeEnum.admin)
      return;

    setUpdatingAccessForUser(uid);
    let res =
      role == roomUserTypeEnum.member
        ? await promoteToController(roomDetails._id, uid)
        : await promoteToAdmin(roomDetails._id, uid);
    setUpdatingAccessForUser("");

    if (!res) return;

    toast.success(res?.data?.message || "Access updated");
  };

  const handleDemoteClick = async (uid, role) => {
    if (role == roomUserTypeEnum.owner || role == roomUserTypeEnum.member)
      return;

    setUpdatingAccessForUser(uid);
    let res =
      role == roomUserTypeEnum.admin
        ? await demoteAdmin(roomDetails._id, uid)
        : await demoteController(roomDetails._id, uid);
    setUpdatingAccessForUser("");

    if (!res) return;

    toast.success(res?.data?.message || "Access updated");
  };

  const handleLoadOptions = (query) => {
    if (!query || !query.trim()) {
      return defaultSongs;
    }

    return new Promise(async (resolve) => {
      const songsRes = await searchSong(query);
      if (!songsRes || !songsRes?.data?.length) {
        resolve([]);
        return;
      }

      const songs = songsRes.data
        .filter((item) => !roomDetails.playlist.some((s) => s._id == item._id))
        .map((item) => ({
          ...item,
          value: item._id,
          label: item.title,
          artist: item.artist,
        }));
      resolve(songs);
    });
  };

  const returnPTagHighlighted = (text, className, keyword = "") => {
    if (!keyword) return <p className={className}>{text}</p>;

    const arr = text.split(new RegExp(keyword, "i"));

    return (
      <p
        className={className}
        dangerouslySetInnerHTML={{
          __html: arr
            .map((item) => item)
            .join(`<span class=${styles.highlight}>${keyword}</span>`),
        }}
      ></p>
    );
  };

  const handleShareRoom = () => {
    const url = `${window.location.origin}?j_room=${roomDetails._id}`;
    copyToClipboard(url, "", "Url copied");

    navigator.share({
      url,
      text: `${roomDetails.name} by ${roomDetails.owner?.name}`,
      // text: "Join this room on sleeping-owl and enjoy parallel listening with your friends",
    });
  };

  useEffect(() => {
    if (chatUnreadCount > 0) setActiveTab(tabsEnum.chat);

    if (activeTab == tabsEnum.chat) {
      if (messagesOuterRef.current) {
        messagesOuterRef.current.scrollTo({
          top: messagesOuterRef.current.scrollHeight,
        });
        if (updateChatUnreadCount) updateChatUnreadCount(0);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    if (messagesOuterRef.current) {
      messagesOuterRef.current.scrollTo({
        top: messagesOuterRef.current.scrollHeight,
        behavior: "smooth",
      });
      if (updateChatUnreadCount) updateChatUnreadCount(0);
    }
  }, [roomDetails.chats?.length]);

  useEffect(() => {
    setPlaylist(roomDetails.playlist);
  }, [roomDetails.playlist]);

  useEffect(() => {
    if (
      micOn &&
      ![roomUserTypeEnum.admin, roomUserTypeEnum.owner].includes(userRole)
    ) {
      onMicToggle();
    }
  }, [userRole]);

  const musicBar = (playing = true) => (
    <div className={`${styles.musicBar} ${playing ? styles.playingBars : ""}`}>
      <span />
      <span />
      <span />
    </div>
  );

  const playlistDiv = useMemo(
    () => (
      <DragDropContext
        onDragEnd={handleDragEnd}
        // autoScrollerOptions={{ startFromPercentage: 0.1 }}
      >
        <Droppable droppableId="playlist-droppable">
          {(provided) => (
            <div
              className={styles.playlist}
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              <div className={styles.controls}>
                <div className={styles.top}>
                  <InputSelect
                    async
                    loadOptions={(...args) => debounce(handleLoadOptions, args)}
                    label="Add new song in room"
                    placeholder="Search a song"
                    value=""
                    defaultOptions={defaultSongs}
                    onChange={(song) =>
                      onAddNewSong ? onAddNewSong(song) : ""
                    }
                  />

                  <div className={styles.buttons}>
                    <Button
                      className={styles.btn}
                      onClick={() =>
                        onShufflePlaylist ? onShufflePlaylist(true) : ""
                      }
                    >
                      {alphabeticalIcon}
                      Alphabetical
                    </Button>

                    <Button
                      className={styles.btn}
                      onClick={() =>
                        onShufflePlaylist ? onShufflePlaylist() : ""
                      }
                    >
                      <Shuffle />
                      Shuffle
                    </Button>
                  </div>
                </div>

                <div className={styles.bottom}>
                  <InputControl
                    label="Find song in room"
                    placeholder="Type here..."
                    className={styles.inputContainer}
                    defaultValue={inputKeyword}
                    onChange={(event) => setInputKeyword(event.target.value)}
                    maxLength={30}
                  />

                  <Button
                    className={styles.btn}
                    outlineButton={onlyHighlight}
                    onClick={() => setOnlyHighlight((prev) => !prev)}
                  >
                    <Filter />
                  </Button>
                </div>
              </div>

              {playlistSongs.length ? (
                playlistSongs.map((item, i) => (
                  <Draggable key={item._id} index={i} draggableId={item._id}>
                    {(provided) => (
                      <div
                        className={`${styles.song} ${
                          roomDetails.currentSong == item._id
                            ? styles.playing
                            : ""
                        }`}
                        key={item._id}
                        {...provided.draggableProps}
                        ref={provided.innerRef}
                      >
                        <div className={styles.left}>
                          {!onlyHighlight && inputKeyword ? (
                            ""
                          ) : (
                            <div
                              className={styles.drag}
                              {...provided.dragHandleProps}
                            >
                              {dragIcon}
                            </div>
                          )}

                          <div
                            className={styles.play}
                            onClick={() =>
                              onToggleCurrentSong && onPlayNewSong
                                ? roomDetails.currentSong == item._id
                                  ? onToggleCurrentSong()
                                  : onPlayNewSong(item._id)
                                : ""
                            }
                          >
                            {roomDetails.currentSong == item._id
                              ? roomDetails.paused
                                ? playIcon
                                : pauseIcon
                              : playIcon}
                          </div>

                          <div className={styles.details}>
                            <div className={styles.top}>
                              <span className={styles.fit}>
                                {roomDetails.currentSong == item._id ? (
                                  musicBar(!roomDetails.paused)
                                ) : (
                                  <Headphones />
                                )}
                              </span>

                              {returnPTagHighlighted(
                                item.title,
                                styles.title,
                                inputKeyword
                              )}
                            </div>

                            {returnPTagHighlighted(
                              item.artist,
                              styles.desc,
                              inputKeyword
                            )}
                          </div>
                        </div>

                        <div className={styles.right}>
                          {validUserRooms?.length ? (
                            <div
                              title="Add song to other room"
                              className={`icon ${styles.deleteIcon}`}
                              onClick={() => setSelectedSongForUserRooms(item)}
                            >
                              {playlistMusicIcon}
                            </div>
                          ) : (
                            ""
                          )}
                          <div
                            title={"remove song"}
                            className={`icon ${styles.deleteIcon}`}
                            onClick={() =>
                              onDeleteSong ? onDeleteSong(item._id) : ""
                            }
                          >
                            <X />
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))
              ) : (
                <div className={styles.noSongs}>
                  <p className={styles.msg}>
                    {inputKeyword
                      ? `No songs found with keyword: ${inputKeyword}`
                      : "No songs present"}
                  </p>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    ),
    [
      playlist,
      onlyHighlight,
      inputKeyword,
      roomDetails.currentSong,
      roomDetails.paused,
    ]
  );

  const usersDiv = (
    <div className={styles.users}>
      {roomDetails.users?.length ? (
        roomDetails.users?.map((item, i) => (
          <div className={styles.user} key={item._id}>
            <div className={styles.left}>
              <div className={styles.image}>
                <img
                  src={item.profileImage}
                  alt={item.name}
                  rel="no-referrer"
                />
              </div>
              <p className={styles.name}>{item.name}</p>
            </div>

            <div className={styles.right}>
              {item.role == roomUserTypeEnum.owner ||
              item._id == userDetails._id ? (
                ""
              ) : (
                <>
                  {item.role == roomUserTypeEnum.admin ||
                  item.role == userRole ||
                  userRole == roomUserTypeEnum.member ||
                  userRole == roomUserTypeEnum.controller ? (
                    ""
                  ) : (
                    <Button
                      title={`Prompt to Admin`}
                      className={styles.green}
                      onClick={() => handlePromoteClick(item._id, item.role)}
                      disabled={updatingAccessForUser == item._id}
                    >
                      {isMobileView ? "" : "Promote "}
                      {updatingAccessForUser == item._id ? (
                        <Spinner small white />
                      ) : (
                        <ArrowUp />
                      )}
                    </Button>
                  )}

                  {item.role == roomUserTypeEnum.member ||
                  item.role == userRole ||
                  userRole == roomUserTypeEnum.member ||
                  userRole == roomUserTypeEnum.controller ? (
                    ""
                  ) : (
                    <Button
                      title={`Demote to Member`}
                      className={styles.red}
                      onClick={() => handleDemoteClick(item._id, item.role)}
                      disabled={updatingAccessForUser == item._id}
                    >
                      {isMobileView ? "" : "Demote "}
                      {updatingAccessForUser == item._id ? (
                        <Spinner small white />
                      ) : (
                        <ArrowDown />
                      )}
                    </Button>
                  )}
                </>
              )}
              <p className={styles.role}>{item.role}</p>
            </div>
          </div>
        ))
      ) : (
        <p>No activity for now!</p>
      )}
    </div>
  );

  const getMessageDiv = (
    chat = {},
    isRight = false,
    isConcurrent = false,
    index
  ) => {
    const message = chat.message;
    const biggerMessage = message.length < 9 && isEmojiPresentInString(message);

    return (
      <div
        key={chat.user.name + "" + index}
        className={`${styles.message} ${isRight ? styles.rightMessage : ""} ${
          isConcurrent ? styles.concurrent : ""
        }`}
        style={{ marginTop: isConcurrent ? "" : "10px" }}
      >
        {!isConcurrent ? (
          <div className={styles.image}>
            <img
              src={chat.user?.profileImage}
              alt={chat.user?.name}
              rel="no-referrer"
            />
          </div>
        ) : (
          <div className={styles.image}>
            <div className={styles.imagePlaceholder} />
          </div>
        )}

        <div className={`${styles.inner}`}>
          {!isConcurrent && <p className={styles.name}>{chat.user?.name}</p>}
          <p
            className={`${styles.text} ${biggerMessage ? styles.bigText : ""}`}
          >
            {message}
          </p>
          <p className={styles.timestamp}>{getTimeFormatted(chat.timestamp)}</p>
        </div>
      </div>
    );
  };

  const chatDiv = useMemo(
    () => (
      <div className={styles.chatBox}>
        <div className={styles.messagesOuter} ref={messagesOuterRef}>
          {roomDetails.chats?.length ? (
            <div className={styles.chatToolbar}>
              {userRole == roomUserTypeEnum.admin ||
              userRole == roomUserTypeEnum.owner ? (
                <>
                  <Button
                    onClick={() => (toggleChatSound ? toggleChatSound() : "")}
                    outlineButton={!chatSoundEnabled}
                  >
                    {chatSoundEnabled ? <Volume2 /> : <VolumeX />}
                    {isMobileView ? "" : chatSoundEnabled ? "Sound" : "Muted"}
                  </Button>

                  {chatSoundEnabled && (
                    <Button
                      onClick={() => (onMicToggle ? onMicToggle() : "")}
                      outlineButton={!micOn}
                    >
                      {micOn ? <Mic /> : <MicOff />}
                      {isMobileView ? "" : micOn ? "ON" : "OFF"}
                    </Button>
                  )}
                </>
              ) : (
                ""
              )}

              <Button
                onClick={() =>
                  toggleChatNotificationMute ? toggleChatNotificationMute() : ""
                }
                outlineButton={chatNotificationMuted}
              >
                {chatNotificationMuted ? <BellOff /> : <Bell />}
              </Button>

              {userRole == roomUserTypeEnum.owner ||
              userRole == roomUserTypeEnum.admin ? (
                <Button onClick={onClearChatCLick} redButton>
                  <X />
                  Clear chats
                </Button>
              ) : (
                ""
              )}
            </div>
          ) : (
            ""
          )}

          <div className={styles.messages}>
            {Array.isArray(roomDetails.chats) && roomDetails.chats.length ? (
              roomDetails.chats.map((item, index) =>
                getMessageDiv(
                  item,
                  item.user?._id == userDetails._id,
                  index > 0 &&
                    roomDetails.chats[index - 1].user?._id == item.user?._id,
                  index
                )
              )
            ) : (
              <p className={styles.empty}>No chats present for now!</p>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <input
            ref={chatInputRef}
            type="text"
            placeholder="Type something..."
            value={inputMessage}
            onChange={(event) => setInputMessage(event.target.value)}
            onKeyUp={(event) =>
              event.key == "Enter" && !event.shiftKey
                ? handleChatSubmission()
                : ""
            }
          />
          <Button onClick={handleChatSubmission}>
            <Send />
          </Button>
        </div>
      </div>
    ),
    [
      roomDetails.chats,
      inputMessage,
      chatNotificationMuted,
      micOn,
      chatSoundEnabled,
      userRole,
    ]
  );

  const activityDiv = (
    <div className={styles.activityDiv}>
      {notifications.length ? (
        [...notifications].reverse().map((item, i) => (
          <div className={styles.activity} key={item.title + i}>
            <div className={styles.top}>
              <p className={styles.title}>{item.title}</p>
              <p className={styles.time}>
                {getTimeFormatted(item.timestamp, true)}
              </p>
            </div>
            <p className={styles.desc}>{item.description}</p>
          </div>
        ))
      ) : (
        <p>No activity for now!</p>
      )}
    </div>
  );

  return (
    <Modal onClose={onClose} fullScreenInMobile hideCloseButton>
      {selectedSongForUserRooms ? (
        <UserRoomsModal
          onClose={() => {
            setSelectedSongForUserRooms("");

            if (updateUserRooms) updateUserRooms();
          }}
          userRooms={validUserRooms}
          song={selectedSongForUserRooms}
        />
      ) : (
        ""
      )}
      <div
        className={styles.container}
        style={{
          "--header-height": `${headerRef.current?.clientHeight}px`,
        }}
      >
        <div className={styles.head} ref={headerRef}>
          <div className={styles.top}>
            <div className={styles.roomInfo}>
              <p className={styles.label}>You are listening in:</p>

              <p className={styles.room}>
                <span>
                  {"“"}
                  {roomDetails.name}
                  {"”"}
                </span>{" "}
                by <span>{roomDetails.owner?.name}</span>
              </p>
            </div>

            <div className={styles.right}>
              <div
                className={`icon ${styles.share}`}
                title="share"
                onClick={handleShareRoom}
              >
                <Share2 />
              </div>
            </div>
          </div>

          <div className={styles.tabs}>
            {Object.values(tabsEnum).map((item) => (
              <div
                key={item}
                className={`${styles.tab} ${
                  activeTab == item ? styles.active : ""
                }`}
                onClick={() => setActiveTab(item)}
              >
                {item}

                {item == tabsEnum.chat && chatUnreadCount > 0 ? (
                  <span className={styles.count}>{chatUnreadCount}</span>
                ) : (
                  ""
                )}
              </div>
            ))}
          </div>
        </div>

        {activeTab == tabsEnum.playlist
          ? playlistDiv
          : activeTab == tabsEnum.users
          ? usersDiv
          : activeTab == tabsEnum.chat
          ? chatDiv
          : activeTab == tabsEnum.activity
          ? activityDiv
          : ""}
      </div>
    </Modal>
  );
}

export default PlayerDetailsModal;
