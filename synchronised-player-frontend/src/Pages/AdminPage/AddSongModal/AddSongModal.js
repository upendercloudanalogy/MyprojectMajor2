import React, { useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { X } from "react-feather";

import Modal from "Components/Modal/Modal";
import Button from "Components/Button/Button";
import InputControl from "Components/InputControl/InputControl";

import { uploadAudio } from "utils/firebase";
import { getFileHashSha256 } from "utils/util";
import { addNewSong, checkSongAvailability } from "apis/song";

import styles from "./AddSongModal.module.scss";

let abortUpload = () => console.log("func not attached"),
  defaultUploadText = "Click to uplaod";
function AddSongModal({ onClose, onSuccess }) {
  const fileInputRef = useRef();
  const audioElemRef = useRef({});

  const [values, setValues] = useState({
    title: "",
    artist: "",
    length: 0,
    url: "",
    file: "",
    fileType: "",
  });
  const [errors, setErrors] = useState({
    file: "",
  });
  const [uploadDetails, setUploadDetails] = useState({
    uploading: false,
    progress: 0,
    name: "",
    fileType: "",
    length: "",
    url: "",
    uploadedFile: "",
    file: "",
  });
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);
  const [uploadButtonText, setUploadButtonText] = useState(defaultUploadText);

  const validateAudioFile = (file, maxFileSizeAllowed = 16) => {
    const { type, size } = file;

    if (!type.includes("audio"))
      return {
        success: false,
        message: "Not a audio file",
      };
    if (size / 1024 / 1024 > maxFileSizeAllowed)
      return {
        success: false,
        message: `Due to constraints of free servers, right now we only accept files smaller than ${maxFileSizeAllowed}MB, found: ${parseFloat(
          size / 1024 / 1024
        ).toFixed(2)}MB`,
      };

    return {
      success: true,
      message: "Valid audio file",
    };
  };

  const getAudioLength = async (file) => {
    let timeout;
    const reader = new FileReader();

    return new Promise((res) => {
      timeout = setTimeout(() => res(null), 3000);
      reader.onload = function (e) {
        audioElemRef.current.src = e.target.result;
        audioElemRef.current.addEventListener(
          "loadedmetadata",
          function () {
            const duration = parseInt(audioElemRef.current.duration);

            clearTimeout(timeout);
            res(duration);
          },
          false
        );
      };

      reader.readAsDataURL(file);
    });
  };

  const readAudio = (file) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      audioElemRef.current.src = e.target.result;
      audioElemRef.current.addEventListener(
        "loadedmetadata",
        function () {
          const duration = parseInt(audioElemRef.current.duration);

          setValues((prev) => ({ ...prev, length: duration }));
        },
        false
      );
    };

    reader.readAsDataURL(file);
  };

  const uploadAudioSync = (file) => {
    let lastLoggedProgress = 0;

    return new Promise((res) => {
      uploadAudio(
        file,
        (p) => {
          if (p - lastLoggedProgress >= 10) {
            console.log(`${parseInt(p)}% done`);
            lastLoggedProgress = p;
          }
        },
        (url) => res(url),
        (_err) => res(null)
      );
    });
  };

  const handleBulkFileUpload = async (event) => {
    const files = event.target.files;
    console.log(`🔵Total files selected: ${files.length}`);

    const validFiles = Array.from(files).filter(
      (item) => validateAudioFile(item, 16).success
    );
    console.log(`🟡files validated: ${validFiles.length}`);

    const fileWithHashes = [];
    for (let i = 0; i < validFiles.length; ++i) {
      console.log(`🟡getting hash for file`);

      const file = validFiles[i];
      const hash = await getFileHashSha256(file);

      const fileName = file.name;
      const fileNameArr = fileName.split("_-_");

      const title = fileNameArr[0].trim();
      const artist = fileNameArr[1] ? fileNameArr[1].trim() : "";

      fileWithHashes.push({
        file,
        title,
        artist: artist ? artist.replace(".mp3", "") : "",
        hash,
      });
      // fileWithHashes.push({
      //   file,
      //   title,
      //   artist: artist || "unknown",
      //   hash,
      // });
    }

    let filesWithTitleAndArtist = fileWithHashes.filter(
      (item) => item.title && item.artist
    );
    console.log(
      `🟡files filtered by title and artists : ${filesWithTitleAndArtist.length}`
    );

    for (let i = 0; i < filesWithTitleAndArtist.length; ++i) {
      console.log(
        `🟡validating file:${i + 1}/${
          filesWithTitleAndArtist.length
        } for duplicates`
      );

      const file = filesWithTitleAndArtist[i];
      const res = await checkSongAvailability({
        title: file.title,
        hash: file.hash,
      });

      if (!res || !res?.success) filesWithTitleAndArtist[i] = null;
    }
    filesWithTitleAndArtist = filesWithTitleAndArtist.filter((item) => item);

    console.log(
      `🟡files after duplicate validation: ${filesWithTitleAndArtist.length}`
    );

    for (let i = 0; i < filesWithTitleAndArtist.length; ++i) {
      console.log(`🟡getting length for audio file`);

      const fileObj = filesWithTitleAndArtist[i];
      const length = await getAudioLength(fileObj.file);

      filesWithTitleAndArtist[i].length = length;
    }

    const finalFiles = filesWithTitleAndArtist.filter((item) => item.length);
    console.log(`🟡final files with all valid data: ${finalFiles.length}`);

    for (let i = 0; i < finalFiles.length; ++i) {
      console.log(
        `🟡uploading file:${i + 1}/${finalFiles.length} (${
          finalFiles[i].title
        }) to firebase storage`
      );

      const fileObj = finalFiles[i];
      const url = await uploadAudioSync(fileObj.file);

      finalFiles[i].url = url;
    }

    console.log("FINAL FILES:", finalFiles);

    for (let i = 0; i < finalFiles.length; ++i) {
      console.log(`🟡adding file:${i + 1}/${finalFiles.length} to database`);

      const file = finalFiles[i];
      await addNewSong({
        ...file,
        fileType: file.file.type,
      });
    }

    console.log(`🟢Bulk song addition completed`);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (uploadDetails.uploading) {
      fileInputRef.current.value = "";
      return;
    }

    setErrors((prev) => ({ ...prev, file: "" }));
    const fileValidation = validateAudioFile(file);
    if (!fileValidation.success) {
      setErrors((prev) => ({ ...prev, file: fileValidation.message }));
      return;
    }

    setValues((prev) => ({ ...prev, title: file.name.split(".")[0] }));

    setUploadButtonText("Checking...");
    const hash = await getFileHashSha256(file);
    const res = await checkSongAvailability({
      hash,
      title: file.name,
    });
    setUploadButtonText(defaultUploadText);

    if (!res || !res?.success) {
      setErrors((prev) => ({
        ...prev,
        file: res?.message || "Similar song already exists",
      }));
      return;
    }

    setUploadDetails({
      uploading: true,
      progress: 0,
      file: file,
      fileType: file.type,
      name: file.name,
    });

    const cancelUpload = uploadAudio(
      file,
      (progress) => {
        setUploadDetails((prev) => ({
          ...prev,
          progress: progress.toFixed(2),
        }));
      },
      (url) => {
        setUploadDetails((prev) => ({
          ...prev,
          uploading: false,
          progress: 0,
          url,
          uploadedFile: file.name,
        }));
        setValues((prev) => ({
          ...prev,
          file,
          url,
          fileType: file.type,
        }));
        readAudio(file);
        setErrors((prev) => ({ ...prev, file: "" }));
      },
      (err) => {
        setUploadDetails((prev) => ({
          ...prev,
          uploading: false,
          progress: 0,
        }));

        if (!err.includes("canceled"))
          setErrors((prev) => ({ ...prev, file: `Error: ${err}` }));
      }
    );

    abortUpload = () => {
      cancelUpload();
    };

    fileInputRef.current.value = "";
  };

  const validateForm = () => {
    let errors = {};

    if (!values.title || !values.title.trim()) errors.title = "Title required";
    if (!values.artist || !values.artist.trim())
      errors.artist = "Artist required";
    if (!values.url) errors.file = "Song required";

    if (Object.keys(errors).length) {
      setErrors(errors);
      return false;
    } else {
      setErrors({});
      return true;
    }
  };

  const handleSubmission = async () => {
    if (!validateForm() || uploadDetails.uploading) return;

    const hash = await getFileHashSha256(values.file);

    const body = {
      hash,
      length: values.length,
      title: values.title.trim(),
      artist: values.artist.trim(),
      fileType: values.fileType,
      url: values.url,
    };

    setSubmitButtonDisabled(true);
    const res = await addNewSong(body);
    setSubmitButtonDisabled(false);
    if (!res) return;

    toast.success("Song added successfully");
    if (onClose) onClose();
    if (onSuccess) onSuccess();
  };

  return (
    <Modal onClose={onClose} closeOnBlur={false}>
      <div className={styles.container}>
        <input
          type="file"
          style={{ display: "none" }}
          ref={fileInputRef}
          accept=".mp3,.wav"
          multiple
          onChange={handleFileChange}
          // onChange={handleBulkFileUpload}
        />

        <p className={styles.title}>Upload new song</p>

        <div className={styles.form}>
          <div className={styles.item}>
            <label>Upload a song</label>

            <div className={styles.uploadBox}>
              {uploadDetails.uploading ? (
                <div className={styles.uploading}>
                  <p className={styles.title}>{uploadDetails.name}</p>
                  <div className={styles.progress}>
                    UPLOADING...
                    <span>{uploadDetails.progress}%</span>
                    <div className={styles.icon} onClick={abortUpload}>
                      <X />
                    </div>
                  </div>
                </div>
              ) : (
                <p
                  className={styles.upload}
                  onClick={() => fileInputRef.current.click()}
                >
                  {uploadDetails.uploadedFile || uploadButtonText}
                </p>
              )}
            </div>
            {errors.file && <p className="error-msg">{errors.file}</p>}

            <audio
              className={styles.audioElem}
              ref={audioElemRef}
              controls
              style={{
                display: values.file && !uploadDetails.uploading ? "" : "none",
              }}
            />
          </div>

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

export default AddSongModal;
