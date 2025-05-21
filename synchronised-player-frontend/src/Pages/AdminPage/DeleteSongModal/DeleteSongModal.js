import React, { useRef, useState } from "react";
import { toast } from "react-hot-toast";

import Modal from "Components/Modal/Modal";
import Button from "Components/Button/Button";

import { deleteSong } from "apis/song";

import styles from "./DeleteSongModal.module.scss";

function DeleteSongModal({ details, onClose, onSuccess }) {
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);

  const handleSubmission = async () => {
    setSubmitButtonDisabled(true);
    const res = await deleteSong(details._id);
    setSubmitButtonDisabled(false);
    if (!res) return;

    toast.success("Song deleted successfully");
    if (onClose) onClose();
    if (onSuccess) onSuccess();
  };

  return (
    <Modal onClose={onClose}>
      <div className={styles.container}>
        <p className={styles.title}>
          Are you sure you want to delete this song ?
        </p>

        <p className={styles.desc}>
          It will be permanently deleted and can not be recovered
        </p>

        <div className={styles.form}>
          <div className={styles.footer}>
            <Button cancelButton onClick={onClose}>
              Close
            </Button>

            <Button
              redButton
              onClick={handleSubmission}
              disabled={submitButtonDisabled}
              useSpinnerWhenDisabled
            >
              DELETE
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default DeleteSongModal;
