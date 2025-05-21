import React, { useRef, useState } from "react";

import Modal from "Components/Modal/Modal";
import Button from "Components/Button/Button";

import styles from "./DeleteRoomModal.module.scss";

function DeleteRoomModal({ details, onClose, onDelete }) {
  return (
    <Modal onClose={onClose}>
      <div className={styles.container}>
        <p className={styles.title}>
          Are you sure you want to delete {details.name} ?
        </p>

        <p className={styles.desc}>
          It will be permanently deleted and can not be recovered. All of your
          effort to add songs in this room will go in vain. Are you sure ?
        </p>

        <div className={styles.form}>
          <div className={styles.footer}>
            <Button cancelButton onClick={onClose}>
              Close
            </Button>

            <Button
              redButton
              onClick={() => {
                if (onDelete) onDelete();
                if (onClose) onClose();
              }}
            >
              DELETE
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default DeleteRoomModal;
