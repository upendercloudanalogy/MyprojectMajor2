import React, { useEffect, useState } from "react";
import { X } from "react-feather";
import { toast } from "react-hot-toast";

import Button from "Components/Button/Button";
import Modal from "Components/Modal/Modal";
import InputControl from "Components/InputControl/InputControl";
import InputSelect from "Components/InputControl/InputSelect/InputSelect";

import { getAllSongs, searchSong } from "apis/song";
import { createRoom, createRoomWithRandomSongs } from "apis/room";

import styles from "./CreateRoomModal.module.scss";
import Toggle from "Components/Toggle/Toggle";

let debounceTimeout;
function CreateRoomModal({ onClose, onSuccess }) {
  const [values, setValues] = useState({
    name: "",
    totalSongs: "",
  });
  const [errors, setErrors] = useState({
    name: "",
    totalSongs: "",
  });
  const [allSongs, setAllSongs] = useState([]);
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);
  const [isRoomWithRandomSongs, setIsRoomWithRandomSongs] = useState(true);

  const defaultSongs = allSongs
    .filter((item) => !selectedSongs.some((s) => s.value == item._id))
    .map((item) => ({
      value: item._id,
      label: item.title,
    }));

  const debounce = (func, args, timer = 300) => {
    clearTimeout(debounceTimeout);

    return new Promise((resolve, reject) => {
      debounceTimeout = setTimeout(() => resolve(func(...args)), timer);
    });
  };

  const fetchAllSongs = async () => {
    const res = await getAllSongs();
    if (!res) return;

    setAllSongs(res.data);
  };

  const validateForm = () => {
    let errors = {};

    if (!values.name || !values.name.trim()) errors.name = "Name required";
    if (!selectedSongs.length && !isRoomWithRandomSongs)
      errors.songs = "select some songs to continue";
    if (!values.totalSongs && isRoomWithRandomSongs)
      errors.totalSongs = "enter number of songs";

    if (Object.keys(errors).length) {
      setErrors(errors);
      return false;
    } else {
      setErrors({});
      return true;
    }
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
        .filter((item) => !selectedSongs.some((s) => s.value == item._id))
        .map((item) => ({
          value: item._id,
          label: item.title,
          artist: item.artist,
        }));
      resolve(songs);
    });
  };

  const handleSubmission = async () => {
    if (!validateForm()) return;

    const body = {
      ...values,
      playlist: selectedSongs.map((item) => item.value),
    };

    setSubmitButtonDisabled(true);
    const res = isRoomWithRandomSongs
      ? await createRoomWithRandomSongs(body)
      : await createRoom(body);
    setSubmitButtonDisabled(false);
    if (!res) return;

    toast.success("Room created successfully!");

    if (onSuccess) onSuccess();
    if (onClose) onClose();
  };

  useEffect(() => {
    fetchAllSongs();
  }, []);

  return (
    <Modal onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.form}>
          <InputControl
            label="Room name"
            placeholder="Enter room name"
            maxLength={50}
            value={values.name}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, name: event.target.value }))
            }
            error={errors.name}
          />

          <Toggle
            className={styles.toggle}
            options={[
              {
                label: "Custom songs",
                value: "custom",
              },
              {
                label: "Random songs",
                value: "random",
              },
            ]}
            selected={isRoomWithRandomSongs ? "random" : "custom"}
            onChange={(obj) => setIsRoomWithRandomSongs(obj.value == "random")}
          />

          {isRoomWithRandomSongs ? (
            <InputControl
              label="No of songs in room"
              placeholder="Enter number"
              numericInput
              max={200}
              value={values.totalSongs}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  totalSongs: parseInt(event.target.value),
                }))
              }
              error={errors.totalSongs}
            />
          ) : (
            <InputSelect
              async
              loadOptions={(...args) => debounce(handleLoadOptions, args)}
              label="Playlist"
              placeholder="Search a song"
              value=""
              defaultOptions={defaultSongs}
              onChange={(song) => setSelectedSongs((prev) => [...prev, song])}
            />
          )}

          {!isRoomWithRandomSongs && (
            <div className={styles.songs}>
              {selectedSongs.map((item) => (
                <div key={item.value} className={styles.song}>
                  <p>{item.label}</p>

                  <div
                    className={"icon"}
                    onClick={() =>
                      setSelectedSongs((prev) =>
                        prev.filter((s) => s.value !== item.value)
                      )
                    }
                  >
                    <X />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <Button cancelButton onClick={onClose}>
            Close
          </Button>

          <Button
            onClick={handleSubmission}
            disabled={submitButtonDisabled}
            useSpinnerWhenDisabled
          >
            Submit
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default CreateRoomModal;
