import React from "react";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import AsyncCreatableSelect from "react-select/async-creatable";
import { useSelector } from "react-redux";

import { themeEnum } from "utils/constants";

import styles from "../InputControl.module.scss";

function InputSelect({
  label,
  subLabel,
  error,
  async,
  asyncCreatable,
  components = {},
  ...rest
}) {
  const currentTheme = useSelector((state) => state.root.theme);
  const isDarkTheme = currentTheme === themeEnum.dark;

  const colors = {
    black: "#040406",
    primary: "#f327a5",
    primary2: "#ec74be",
    red: "#ff5050",
    gray: "#73646f",
    gray2: "#3f393e",
    white2: "#f3f0f3",
    pinkishWhite: "#f7d5ea",
  };

  const customSelectStyle = {
    control: (provided, { selectProps: { error }, isFocused }) => ({
      ...provided,
      height: 37,
      backgroundColor: isDarkTheme ? "#f0f0f0" : "#fefefe",
      borderColor: colors.white2,
      boxShadow: error
        ? `0 0 0 1px ${colors.red}`
        : isFocused
        ? `0 0 0 1px ${colors.primary}`
        : "",
      "&:hover": {
        borderColor: isFocused || error ? "" : colors.gray,
      },
    }),
    option: (provided, { isDisabled, isSelected, isFocused }) => ({
      ...provided,
      color: isSelected || isFocused ? "#fff" : colors.black,
      backgroundColor: isSelected
        ? colors.primary
        : isFocused
        ? colors.primary2
        : "#fff",
      cursor: isDisabled ? "not-allowed" : "default",
      "&:hover": {
        backgroundColor: isSelected
          ? colors.primary
          : isFocused
          ? colors.primary2
          : colors.pinkishWhite,
        color: isSelected || isFocused ? "#fff" : colors.black,
      },
    }),
    input: (provided) => ({
      ...provided,
      maxWidth: "150px !important",
    }),
    placeholder: (provided) => ({
      ...provided,
      textAlign: "left",
      fontSize: "1rem",
      color: colors.gray,
      fontWeight: 400,
    }),
    menuList: (provided) => ({
      ...provided,
      textAlign: "left",
      fontSize: "1rem",
      color: colors.black,
      fontWeight: 400,
    }),
    singleValue: (provided) => ({
      ...provided,
      textAlign: "left",
      fontSize: "1rem",
      color: colors.gray2,
      fontWeight: 400,
    }),
  };

  return (
    <div className={styles.container}>
      {label && (
        <label className={styles.label}>
          {label}
          <span> {subLabel}</span>
        </label>
      )}

      <div className={styles.selectContainer}>
        {async ? (
          <AsyncSelect
            {...rest}
            components={{
              DropdownIndicator: () => null,
              IndicatorSeparator: () => null,
              ...components,
            }}
            styles={customSelectStyle}
            error={error ? true : false}
          />
        ) : asyncCreatable ? (
          <AsyncCreatableSelect
            {...rest}
            components={{
              DropdownIndicator: () => null,
              IndicatorSeparator: () => null,
              ...components,
            }}
            styles={customSelectStyle}
            error={error ? true : false}
          />
        ) : (
          <Select
            {...rest}
            components={{
              DropdownIndicator: () => null,
              IndicatorSeparator: () => null,
              ...components,
            }}
            styles={customSelectStyle}
            error={error ? true : false}
          />
        )}
      </div>
      {error ? <p className={styles.errorMsg}>{error}</p> : ""}
    </div>
  );
}

export default InputSelect;
