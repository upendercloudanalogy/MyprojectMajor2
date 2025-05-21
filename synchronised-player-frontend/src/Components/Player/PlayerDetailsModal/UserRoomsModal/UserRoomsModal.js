import React, { useState } from "react";
import { toast } from "react-hot-toast";

import Modal from "Components/Modal/Modal";
import Button from "Components/Button/Button";

import { addSongToRoom } from "apis/room";

import styles from "./UserRoomsModal.module.scss";

function UserRoomsModal({ onClose, userRooms = [], song = {} }) {
  userRooms = userRooms.map((item) => ({
    ...item,
    alreadyPresent:
      Array.isArray(item.playlist) && item.playlist.includes(song?._id),
  }));

  const [recentlyAdded, setRecentlyAdded] = useState([]);
  const [addingIn, setAddingIn] = useState([]);

  const handleAdd = async (rid) => {
    setAddingIn((prev) => [...prev, rid]);
    const res = await addSongToRoom(rid, song?._id);
    setAddingIn((prev) => prev.filter((item) => item !== rid));
    if (!res) return;

    setRecentlyAdded((prev) => [...prev, rid]);
    toast.success("song added");
  };

  return (
    <Modal onClose={onClose} preventUrlChange>
      <div className={styles.container}>
        <div className={styles.detail}>
          <p className={styles.title}>Select room to add song</p>
          <p className={styles.desc}>{song.title}</p>
        </div>

        <div className={styles.rooms}>
          {userRooms.map((item) => (
            <div className={styles.room} key={item._id}>
              <p className={styles.title}>{item.name}</p>

              {item.alreadyPresent || recentlyAdded.includes(item._id) ? (
                <p className={styles.info}>Already present</p>
              ) : (
                <Button
                  disabled={addingIn.includes(item._id)}
                  useSpinnerWhenDisabled
                  onClick={() => handleAdd(item._id)}
                >
                  Add here
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default UserRoomsModal;
