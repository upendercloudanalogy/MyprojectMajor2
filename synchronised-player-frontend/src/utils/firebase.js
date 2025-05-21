import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAaqYGES4Fd9dx2PlS-GFN14t6sPsu85qA",
  authDomain: "sleeping-owl-storage-5.firebaseapp.com",
  projectId: "sleeping-owl-storage-5",
  storageBucket: "sleeping-owl-storage-5.appspot.com",
  messagingSenderId: "491922593758",
  appId: "1:491922593758:web:a986d9e398350edd04af4f",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth();

const storage = getStorage(app);

const googleAuthProvider = new GoogleAuthProvider();

const uploadAudio = (file, progressCallback, urlCallback, errorCallback) => {
  if (!file) {
    errorCallback("File not found");
    return;
  }

  const storageRef = ref(storage, `songs/${file.name}`);

  const task = uploadBytesResumable(storageRef, file);

  task.on(
    "state_changed",
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      progressCallback(progress);
    },
    (error) => {
      errorCallback(error.message);
    },
    () => {
      getDownloadURL(storageRef).then((url) => {
        urlCallback(url);
      });
    }
  );

  const cancelUpload = () => task.cancel();

  return cancelUpload;
};

export { app as default, auth, googleAuthProvider, uploadAudio };
