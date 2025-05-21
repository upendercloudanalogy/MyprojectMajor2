import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Toaster, toast } from "react-hot-toast";
import { io } from "socket.io-client";

import ProtectedRoute from "Components/PrivateRoute/PrivateRoute";
import PageNotFound from "Pages/PageNotFound/PageNotFound";
import AdminPage from "Pages/AdminPage/AdminPage";
import AppLayout from "Components/AppLayout/AppLayout";
import AuthPage from "Pages/AuthPage/AuthPage";
import HomePage from "Pages/HomePage/HomePage";
import Spinner from "Components/Spinner/Spinner";
import Player from "Components/Player/Player";

import actionTypes from "store/actionTypes";
import { getCurrentUser, sayHiToBackend } from "apis/user";
import { themeEnum } from "utils/constants";

import "styles/global.scss";

const backendUrl = process.env.REACT_APP_BACKEND_URL;
let socket;
let globalRoomId;
function App() {
  const userDetails = useSelector((state) => state.root.user);
  const roomDetails = useSelector((state) => state.root.room);
  const currentTheme = useSelector((state) => state.root.theme);
  const dispatch = useDispatch();

  const [_dummyState, setDummyState] = useState(0);
  const [isMobileView, setIsMobileView] = useState("");
  const [appLoaded, setAppLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showTakingLongerMsg, setShowTakingLongerMsg] = useState(false);

  const greetBackend = async () => {
    await sayHiToBackend();
  };

  const handleUserDetection = async () => {
    const sleepingToken = await localStorage.getItem("sleeping-token");
    if (!sleepingToken) {
      setAppLoaded(true);
      setIsAuthenticated(false);
      return;
    }

    let res = await getCurrentUser();
    setAppLoaded(true);
    if (!res) {
      // localStorage.removeItem("sleeping-token");
      return;
    }
    setIsAuthenticated(true);

    const user = res?.data;
    if (user) dispatch({ type: actionTypes.USER_LOGIN, user });
  };

  const handleResize = (event) => {
    const width = event.target.innerWidth;
    if (width < 768) setIsMobileView(true);
    else setIsMobileView(false);
  };

  const handleSocketEvents = () => {
    socket.on("connect", () => {
      dispatch({
        type: actionTypes.UPDATE_BANNER,
        banner: {
          green: true,
          text: "🟢 Connection established successfully!",
        },
      });

      setTimeout(() => {
        dispatch({
          type: actionTypes.DELETE_BANNER,
        });
      }, 3000);

      console.log("🔵 Socket connected");

      if (globalRoomId) {
        console.log("🟡re-joining room after re-connect");

        socket.emit("join-room", {
          roomId: globalRoomId,
          userId: userDetails._id,
          ...userDetails,
        });
      }
    });

    socket.on("disconnect", () => {
      dispatch({
        type: actionTypes.UPDATE_BANNER,
        banner: {
          red: true,
          blinking: true,
          text: "🟡 Socket disconnected, trying to reconnect",
        },
      });

      console.log("🔴 Socket disconnected");
    });

    socket.on("error", (msg) => {
      console.log("⚠️ Socket Error", msg);
      toast.error(msg);
    });
  };

  const computeTheme = () => {
    const theme = localStorage.getItem("theme");

    dispatch({ type: actionTypes.SET_THEME, theme: theme || "light" });
  };

  useEffect(() => {
    if (currentTheme === themeEnum.dark)
      document.body.className = "dark-theme-app dark";
    else document.body.className = "light-theme-app light";
  }, [currentTheme]);

  useEffect(() => {
    if (typeof isMobileView !== "boolean") {
      setIsMobileView(window.outerWidth < 768);
      dispatch({
        type: actionTypes.SET_MOBILE_VIEW,
        isMobileView: window.outerWidth < 768,
      });
    } else
      dispatch({
        type: actionTypes.SET_MOBILE_VIEW,
        isMobileView,
      });
  }, [isMobileView]);

  useEffect(() => {
    if (!userDetails?._id) return;

    socket = io(backendUrl);
    handleSocketEvents();
    setDummyState((prev) => prev + 1);

    return () => {
      if (socket?.disconnect) socket.disconnect();
    };
  }, [userDetails._id]);

  useEffect(() => {
    globalRoomId = roomDetails?._id;
  }, [roomDetails?._id]);

  useEffect(() => {
    handleUserDetection();
    greetBackend();
    computeTheme();
    setTimeout(() => {
      handleResize({ target: window });

      if (
        window.location.href.includes("?modal") &&
        window.location.pathname === "/"
      )
        window.location.replace("/");
    }, 300);
    setTimeout(() => setShowTakingLongerMsg(true), 8000);

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return appLoaded ? (
    <div className={`main-app`}>
      <BrowserRouter>
        <Toaster
          position={isMobileView ? "top-right" : "bottom"}
          toastOptions={{
            duration: 3000,
          }}
        />

        {userDetails._id && socket ? <Player socket={socket} /> : ""}

        <Routes>
          <Route path="/auth" element={<AuthPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/" element={<HomePage socket={socket} />} />
          </Route>

          <Route path="/*" element={<PageNotFound />} />
        </Routes>
      </BrowserRouter>
    </div>
  ) : (
    <div className={"app-loading"}>
      <div>
        <Spinner />
      </div>

      {showTakingLongerMsg ? (
        <div className="detail">
          <p className="title">Just a few mins</p>
          <p className="desc">
            It's taking longer than expected. Please wait <span>2-3mins. </span>
            We will restart the servers for you {":)"}
          </p>
        </div>
      ) : (
        ""
      )}
    </div>
  );
}

export default App;
