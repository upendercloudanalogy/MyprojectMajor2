import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

import Button from "Components/Button/Button";
import Spinner from "Components/Spinner/Spinner";
import CreateRoomModal from "./CreateRoomModal/CreateRoomModal";
import AddSongModal from "Pages/AdminPage/AddSongModal/AddSongModal";
import DeleteRoomModal from "./DeleteRoomModal/DeleteRoomModal";

import { deleteRoom, getAllRooms } from "apis/room";
import { getRandomInteger, getTimeDurationFromSeconds } from "utils/util";
import actionTypes from "store/actionTypes";
import { themeEnum } from "utils/constants";

import styles from "./HomePage.module.scss";

const lightColors = [
  "#fff",
  "#fff4fb",
  "#F9F5F6",
  "#FBFFDC",
  "#F9FBE7",
  "#E6FFFD",
  "#ECF2FF",
  "#ECF9FF",
  "#FAF8F1",
  "#EFFFFD",
  "#ffffff",
];

const darkColors = [
  "#121212",
  "#1E1E1E",
  "#2C2C2C",
  "#303030",
  "#230e02",
  "#616161",
  "#31343b",
  "#4e4e4e",
  "#01101f",
  "#3a0325",
  "#3a2903",
  "#292001",
  "#000000",
];

let refreshInterval;
function HomePage({ socket }) {
  const pageRefreshRetries = useRef(0);
  const dispatch = useDispatch();
  const userDetails = useSelector((state) => state.root.user);
  const roomDetails = useSelector((state) => state.root.room);
  const joiningRoom = useSelector((state) => state.root.joiningRoom);
  const currentTheme = useSelector((state) => state.root.theme);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loadingPage, setLoadingPage] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [openModals, setOpenModals] = useState({
    create: false,
    addSong: false,
    deleteRoom: false,
  });
  const [selectedRoom, setSelectedRoom] = useState({});
  const [deletingRoom, setDeletingRoom] = useState("");

  const bgColors = currentTheme === themeEnum.dark ? darkColors : lightColors;

  const handleDeleteRoom = async (rid) => {
    if (deletingRoom) return;

    setDeletingRoom(rid);
    const res = await deleteRoom(rid);
    setDeletingRoom("");
    if (!res) return;

    toast.success("Room deleted!");
    setRooms((prev) => prev.filter((item) => item._id !== rid));
  };

  const handleJoinRoom = async (rid) => {
    if (!socket) {
      toast.error("Socket connection not available!");
      return;
    }

    dispatch({ type: actionTypes.JOINING_ROOM, roomId: rid });
    socket.emit("join-room", {
      roomId: rid,
      userId: userDetails._id,
      ...userDetails,
    });
  };

  const handleLeaveRoom = async (rid) => {
    if (!socket) {
      toast.error("Socket connection not available!");
      return;
    }

    socket.emit("leave-room", {
      roomId: rid,
      userId: userDetails._id,
      ...userDetails,
    });
  };

  const fetchAllRooms = async (doNotChangeColors = false) => {
    const res = await getAllRooms();
    setLoadingPage(false);
    if (!res?.data) {
      if (pageRefreshRetries.current < 5) {
        ++pageRefreshRetries.current;
        fetchAllRooms();
      }

      return;
    }

    setRooms((prev) =>
      res.data.map((item) => {
        const prevRoom = prev.find((r) => r._id === item._id);

        return {
          ...item,
          color:
            prevRoom?.color && doNotChangeColors
              ? prevRoom.color
              : bgColors[getRandomInteger(0, bgColors.length - 1)],
        };
      })
    );

    // do not try re-fetching after getting one success response because server is now awake
    pageRefreshRetries.current = 5;
    if (!doNotChangeColors) {
      joinRoomFromUrlIfPresent(res.data);
    }
  };

  const handleSongUploaded = () => {
    dispatch({ type: actionTypes.NEW_SONG_UPLOADED });
  };

  function joinRoomFromUrlIfPresent(rooms) {
    const joinRoom = searchParams.get("j_room");
    if (!Array.isArray(rooms) || !joinRoom) return;

    const room = rooms.find((r) => r._id === joinRoom);

    navigate("/", { replace: true });
    if (roomDetails._id === room._id)
      // already in that room
      return;

    handleJoinRoom(room._id);
  }

  useEffect(() => {
    setRooms((prev) =>
      prev.map((item) => ({
        ...item,
        color: bgColors[getRandomInteger(0, bgColors.length - 1)],
      }))
    );
  }, [currentTheme]);

  useEffect(() => {
    fetchAllRooms();
  }, [roomDetails._id]);

  useEffect(() => {
    clearInterval(refreshInterval);

    refreshInterval = setInterval(() => {
      // re fetch all rooms just to show nearly correct info regarding songs and current users
      fetchAllRooms(true);
    }, 100 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  return loadingPage ? (
    <div className="spinner-container">
      <Spinner />
    </div>
  ) : (
    <div className={styles.container}>
      {openModals.create && (
        <CreateRoomModal
          onClose={() => setOpenModals((prev) => ({ ...prev, create: false }))}
          onSuccess={() => fetchAllRooms()}
        />
      )}
      {openModals.addSong && (
        <AddSongModal
          onClose={() => setOpenModals((prev) => ({ ...prev, addSong: false }))}
          onSuccess={handleSongUploaded}
        />
      )}
      {openModals.deleteRoom && (
        <DeleteRoomModal
          details={selectedRoom}
          onClose={() =>
            setOpenModals((prev) => ({ ...prev, deleteRoom: false }))
          }
          onDelete={() => {
            handleDeleteRoom(selectedRoom._id);
          }}
        />
      )}

      <div className={styles.header}>
        <p className={styles.title}>Available Rooms</p>

        <div className={styles.buttons}>
          <Button
            onClick={() =>
              setOpenModals((prev) => ({ ...prev, addSong: true }))
            }
            outlineButton
          >
            + Upload song
          </Button>

          <Button
            onClick={() => setOpenModals((prev) => ({ ...prev, create: true }))}
          >
            + Create room
          </Button>
        </div>
      </div>

      <div className={styles.rooms}>
        {rooms.length ? (
          rooms.map((item) => (
            <div
              className={styles.room}
              key={item._id}
              style={{ backgroundColor: item.color }}
            >
              <p className={styles.title}>{item.name}</p>

              <div className={styles.playlist}>
                <label>Few songs from this room</label>

                {Array.isArray(item.playlist) && item.playlist.length ? (
                  <div className={styles.songs}>
                    {item.playlist.length ? (
                      item.playlist.slice(0, 5).map((s) => (
                        <div className={styles.song} key={s._id}>
                          {s.title}
                        </div>
                      ))
                    ) : (
                      <p>No songs for now!</p>
                    )}
                  </div>
                ) : (
                  ""
                )}
              </div>

              <div className={styles.footer}>
                {Array.isArray(item.playlist) && item.playlist.length ? (
                  <div className={styles.duration}>
                    <label>Total songs:</label>
                    <p className={styles.value}>
                      {item.playlist.length}

                      <span>
                        {" "}
                        {"["}
                        {getTimeDurationFromSeconds(
                          item.playlist.reduce(
                            (acc, curr) => acc + (curr.length || 0),
                            0
                          )
                        )}
                        {"]"}
                      </span>
                    </p>
                  </div>
                ) : (
                  ""
                )}

                <div className={styles.user}>
                  <div className={styles.image}>
                    <img
                      src={item.owner.profileImage}
                      rel="no-referrer"
                      alt={item.owner.name}
                    />
                  </div>

                  <p className={styles.name}>{item.owner.name}</p>
                </div>

                <div className={styles.bottom}>
                  <div className={styles.profiles}>
                    {item.users?.length && Array.isArray(item.users)
                      ? item.users.slice(0, 5).map((item, i) => (
                          <div
                            key={item._id || item.name}
                            className={styles.profile}
                            style={{
                              left: `${i * 25}px`,
                              width: "30px",
                              height: "30px",
                            }}
                          >
                            <img
                              src={item.profileImage}
                              rel="no-referrer"
                              alt={item.name}
                            />
                          </div>
                        ))
                      : ""}
                  </div>

                  <div className={styles.buttons}>
                    {userDetails._id == item.owner?._id && (
                      <Button
                        redButton
                        onClick={() => {
                          setSelectedRoom(item);
                          setOpenModals((prev) => ({
                            ...prev,
                            deleteRoom: true,
                          }));
                        }}
                        disabled={deletingRoom == item._id}
                        useSpinnerWhenDisabled
                      >
                        Delete room
                      </Button>
                    )}

                    {roomDetails._id == item._id ? (
                      <Button
                        // className={styles.greenBtn}
                        redButton
                        onClick={() => handleLeaveRoom(item._id)}
                      >
                        Leave room ?
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleJoinRoom(item._id)}
                        disabled={joiningRoom == item._id}
                        useSpinnerWhenDisabled
                      >
                        Join room
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>No rooms found!</p>
        )}
      </div>
    </div>
  );
}

export default HomePage;
