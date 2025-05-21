import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Edit2, Trash } from "react-feather";

import Button from "Components/Button/Button";
import InputControl from "Components/InputControl/InputControl";
import Spinner from "Components/Spinner/Spinner";
import AddSongModal from "./AddSongModal/AddSongModal";
import UpdateSongModal from "./UpdateSongModal/UpdateSongModal";

import { getAdminAccess } from "apis/user";
import { getAllSongs } from "apis/song";

import styles from "./AdminPage.module.scss";
import DeleteSongModal from "./DeleteSongModal/DeleteSongModal";

function AdminPage() {
  const [showPasswordBox, setShowPasswordBox] = useState(true);
  const [fetchingSongs, setFetchingSongs] = useState(true);
  const [password, setPassword] = useState("");
  const [disabledButtons, setDisabledButtons] = useState({
    password: false,
  });
  const [errors, setErrors] = useState({
    password: "",
  });
  const [songs, setSongs] = useState([]);
  const [openModals, setOpenModals] = useState({
    add: false,
    update: false,
    delete: false,
  });
  const [selectedSong, setSelectedSong] = useState({});

  const handlePasswordSubmission = async () => {
    setErrors((prev) => ({ ...prev, password: "" }));
    if (!password) {
      setErrors((prev) => ({ ...prev, password: "Enter password" }));
      return;
    }

    setDisabledButtons((prev) => ({ ...prev, password: true }));
    const res = await getAdminAccess({
      password,
    });
    setDisabledButtons((prev) => ({
      ...prev,
      password: false,
    }));
    if (!res) return;

    toast.success("Password matched");
    setShowPasswordBox(false);
  };

  const fetchAllSongs = async () => {
    const res = await getAllSongs();
    setFetchingSongs(false);
    if (!res) return;

    setSongs(res.data);
  };

  useEffect(() => {
    fetchAllSongs();
  }, []);

  const passwordBox = (
    <div className={styles.passContainer}>
      <form className={styles.passBox} onSubmit={(e) => e.preventDefault()}>
        <InputControl
          label="Enter password to get admin access"
          placeholder="Enter password"
          password
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
        />

        <Button
          disabled={disabledButtons.password}
          useSpinnerWhenDisabled
          onClick={handlePasswordSubmission}
          type="submit"
        >
          Submit
        </Button>
      </form>
    </div>
  );

  return showPasswordBox ? (
    passwordBox
  ) : fetchingSongs ? (
    <div className="spinner-container">
      <Spinner />
    </div>
  ) : (
    <div className={styles.container}>
      {openModals.add && (
        <AddSongModal
          onClose={() => setOpenModals((prev) => ({ ...prev, add: false }))}
          onSuccess={fetchAllSongs}
        />
      )}
      {openModals.update && (
        <UpdateSongModal
          details={selectedSong}
          onClose={() => setOpenModals((prev) => ({ ...prev, update: false }))}
          onSuccess={fetchAllSongs}
        />
      )}
      {openModals.delete && (
        <DeleteSongModal
          details={selectedSong}
          onClose={() => setOpenModals((prev) => ({ ...prev, delete: false }))}
          onSuccess={fetchAllSongs}
        />
      )}

      <p className={styles.heading}>Welcome back Admin!</p>

      {songs.length ? (
        <div className={styles.songs}>
          <div className={styles.head}>
            <Button
              onClick={() => setOpenModals((prev) => ({ ...prev, add: true }))}
            >
              +Add new
            </Button>
          </div>

          {songs.map((item) => (
            <div className={styles.song} key={item._id}>
              <p className={styles.title}>{item.title}</p>

              <div className={styles.right}>
                <div
                  className="icon"
                  onClick={() => {
                    setSelectedSong(item);
                    setOpenModals((prev) => ({ ...prev, update: true }));
                  }}
                >
                  <Edit2 />
                </div>
                <div
                  className="icon"
                  onClick={() => {
                    setSelectedSong(item);
                    setOpenModals((prev) => ({ ...prev, delete: true }));
                  }}
                >
                  <Trash />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="spinner-container" style={{ minHeight: "300px" }}>
          <p>No songs present for now</p>

          <Button
            onClick={() => setOpenModals((prev) => ({ ...prev, add: true }))}
          >
            +Add new
          </Button>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
