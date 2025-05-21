import React, { useRef, useState } from "react";
import { toast } from "react-hot-toast";

import Modal from "Components/Modal/Modal";
import Button from "Components/Button/Button";
import InputControl from "Components/InputControl/InputControl";

import { updateSong } from "apis/song";

import styles from "./UpdateSongModal.module.scss";

function UpdateSongModal({ details, onClose, onSuccess }) {
  const [values, setValues] = useState({
    title: details.title || "",
    artist: details.artist || "",
  });
  const [errors, setErrors] = useState({
    title: "",
    artist: "",
  });
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);

  const validateForm = () => {
    let errors = {};

    if (!values.title || !values.title.trim()) errors.title = "Title required";
    if (!values.artist || !values.artist.trim())
      errors.artist = "Artist required";

    if (Object.keys(errors).length) {
      setErrors(errors);
      return false;
    } else {
      setErrors({});
      return true;
    }
  };

  const handleSubmission = async () => {
    if (!validateForm()) return;

    setSubmitButtonDisabled(true);
    const res = await updateSong(details._id, values);
    setSubmitButtonDisabled(false);
    if (!res) return;

    toast.success("Song updated successfully");
    if (onClose) onClose();
    if (onSuccess) onSuccess();
  };

  return (
    <Modal onClose={onClose}>
      <div className={styles.container}>
        <p className={styles.title}>Edit song</p>

        <div className={styles.form}>
          <InputControl
            label="Song title"
            placeholder="Enter title"
            error={errors.title}
            value={values.title}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, title: event.target.value }))
            }
          />

          <InputControl
            label="Song artist"
            placeholder="Enter artist"
            error={errors.artist}
            value={values.artist}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, artist: event.target.value }))
            }
          />

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
      </div>
    </Modal>
  );
}

export default UpdateSongModal;
