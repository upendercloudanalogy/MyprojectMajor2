import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, X } from "react-feather";

import { generateUniqueString } from "utils/util";

import styles from "./Modal.module.scss";

function Modal({
  className,
  title,
  onClose,
  doNotAnimate,
  noTopPadding,
  styleToInner,
  hideCloseButton = false,
  closeOnBlur = true,
  fullScreenInMobile = false,
  preventUrlChange = false,
  preventPortal = false,
  ...props
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const touchDetails = useRef({
    moving: false,
    startX: 0,
    startY: 0,
    endX: 0,
  });

  const containerRef = useRef();
  const isMobileView = useSelector((state) => state.root.mobileView);

  const [lastLocation, setLastLocation] = useState("");
  // const [touchDetails, setTouchDetails] = useState({
  //   isMoving: false,
  // });

  const uniqueId = useMemo(() => generateUniqueString(), []);

  const handleCloseModal = () => {
    if (!onClose) return;
    onClose();

    if (!location.search?.includes("modal") || preventUrlChange) return;

    navigate(-1);
  };

  const handleURLParamsOnMount = () => {
    const location = window.location;
    const params = new URLSearchParams(location.search);

    if (location.search?.includes("modal") || preventUrlChange) return;
    params.append("modal", "true");

    navigate({
      pathname: location.pathname,
      search: params.toString(),
    });
  };

  const handleLocationChange = () => {
    const currLocation = location.pathname + location.search;

    if (!lastLocation || lastLocation == currLocation) {
      setLastLocation(currLocation);
      return;
    }
    setLastLocation(currLocation);

    const params = new URLSearchParams(location.search);
    if (!params.get("modal") && onClose) handleCloseModal();
  };

  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    if (touch && touch.clientX) {
      touchDetails.current.startX = touch.clientX;
      touchDetails.current.startY = touch.clientY;
    }
  };

  const handleTouchMove = (event) => {
    const touch = event.touches[0];
    if (touch && touch.clientX) touchDetails.current.moving = true;
  };

  const handleTouchEnd = (event) => {
    const touch = event.changedTouches[0];
    if (touch && touch.clientX) {
      const clientX = touch.clientX;
      const clientY = touch.clientY;
      touchDetails.current.endX = clientX;
      touchDetails.current.moving = false;

      const minimumDistance = 70,
        maxStartX = 95,
        maxDy = 80;
      const distance = clientX - touchDetails.current.startX;
      const distanceY = Math.abs(clientY - touchDetails.current.startY);

      if (
        !distance ||
        distance < 0 ||
        !touchDetails.current.startX ||
        !clientX ||
        touchDetails.current.startX > maxStartX ||
        distance < minimumDistance ||
        distanceY > maxDy
      )
        return;

      // swipe done from left to right with minimum distance of 60px
      handleCloseModal();
    }
  };

  useEffect(() => {
    handleLocationChange();
  }, [location]);

  useEffect(() => {
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    if (isMobileView) {
      document.body.style.overflowY = "hidden";
    }
    handleURLParamsOnMount();

    const isHidden = document.body.style.overflowY === "hidden";
    if (!isHidden) document.body.style.overflowY = "hidden";

    return () => {
      document.body.style.overflowY = "auto";

      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  const modal = isMobileView ? (
    <div
      id={"id:" + uniqueId}
      ref={containerRef}
      className={`${styles.mobileContainer} ${
        title || noTopPadding ? styles.modalWithTitle : ""
      } ${fullScreenInMobile ? styles.fullScreenMobile : ""} ${
        className || ""
      }`}
      onClick={(event) => {
        if (event.target?.id == `id:${uniqueId}` && onClose) handleCloseModal();

        event.stopPropagation();
      }}
      style={{ zIndex: +props.zIndex || "" }}
    >
      <div className={`${styles.inner} custom-scroll`} style={styleToInner}>
        {title && (
          <div className={styles.modalTitle}>
            <div className={styles.heading}>{title}</div>
            {onClose && <X onClick={handleCloseModal} />}
          </div>
        )}
        {props.children}

        {/* {fullScreenInMobile && (
          <div className={styles.controls}>
            <div
              className={`icon ${styles.icon}`}
              onClick={() => (onClose ? handleCloseModal() : "")}
            >
              <ArrowLeft />
            </div>
          </div>
        )} */}
      </div>
    </div>
  ) : (
    <div
      id={"id:" + uniqueId}
      ref={containerRef}
      className={`${styles.container} ${className || ""}`}
      onClick={(event) => {
        if (event.target?.id == `id:${uniqueId}` && onClose && closeOnBlur)
          handleCloseModal();

        event.stopPropagation();
      }}
    >
      <div
        className={`${styles.inner} ${
          doNotAnimate ? styles.preventAnimation : ""
        }`}
        style={styleToInner}
      >
        {onClose && !hideCloseButton ? (
          <div
            className={`icon ${styles.close}`}
            onClick={() => (onClose ? handleCloseModal() : "")}
          >
            <X />
          </div>
        ) : (
          ""
        )}
        {props.children}
      </div>
    </div>
  );

  return preventPortal ? modal : ReactDOM.createPortal(modal, document.body);
}

export default Modal;
