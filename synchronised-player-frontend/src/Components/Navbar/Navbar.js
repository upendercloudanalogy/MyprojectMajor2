import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "react-feather";
import { useDispatch, useSelector } from "react-redux";

import owlLogo from "assets/logos/logo.svg";
import { handleLogout } from "utils/util";
import { moonIcon, sunIcon } from "utils/svgs";
import actionTypes from "store/actionTypes";
import { themeEnum } from "utils/constants";

import styles from "./Navbar.module.scss";

function Navbar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentTheme = useSelector((state) => state.root.theme);

  const changeTheme = (newTheme) => {
    dispatch({ type: actionTypes.SET_THEME, theme: newTheme });
    localStorage.setItem("theme", newTheme);
  };

  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <img src={owlLogo} alt="sleeping owl" />

          <p className={styles.text} onClick={() => navigate("/")}>
            Sleeping owl
          </p>
        </div>

        <div className={styles.toggle}>
          <span
            className={styles.cover}
            style={{
              left: currentTheme === themeEnum.dark ? `2px` : "43px",
            }}
          />
          <div
            className={`${styles.item} ${styles.moon} ${
              currentTheme === themeEnum.dark ? styles.white : ""
            }`}
            onClick={() => changeTheme(themeEnum.dark)}
            title="dark"
          >
            {moonIcon}
          </div>
          <div
            className={`${styles.item} ${styles.sun} ${
              currentTheme === themeEnum.light ? styles.white : ""
            }`}
            onClick={() => changeTheme(themeEnum.light)}
            title="light"
          >
            {sunIcon}
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.logout} onClick={() => handleLogout()}>
          <LogOut />
        </div>
      </div>
    </div>
  );
}

export default Navbar;
