import { errorToastLogger, fetchWrapper } from "utils/util";

export const loginUser = async (values) => {
  const reqPath = `/user/google-login`;
  let response;

  try {
    response = await fetchWrapper(reqPath, values, "", "", true);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "loginUser",
        data?.message || "Failed to login user",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("loginUser", "Failed to login user", err);
    return false;
  }
};

export const getCurrentUser = async () => {
  const reqPath = `/user/me`;
  let response;

  try {
    response = await fetchWrapper(reqPath);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "getCurrentUser",
        data?.message || "Failed to get user",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("getCurrentUser", "Failed to get user", err);
    return false;
  }
};

export const getAdminAccess = async (values) => {
  const reqPath = `/user/admin/access`;
  let response;

  try {
    response = await fetchWrapper(reqPath, values);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "getAdminAccess",
        data?.message || "Failed to get admin access",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("getAdminAccess", "Failed to get admin access", err);
    return false;
  }
};

export const sayHiToBackend = async () => {
  const reqPath = "/hi";
  let response;

  try {
    response = await fetchWrapper(reqPath);
    const data = await response.text();

    return data;
  } catch (err) {
    return false;
  }
};

export const loginWithCredentials = async (values) => {
  const reqPath = `/user/login`;
  try {
    const response = await fetchWrapper(reqPath, values, "", "", true);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "loginWithCredentials",
        data?.message || "Failed to login",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("loginWithCredentials", "Failed to login", err);
    return false;
  }
};

export const registerUser = async (values) => {
  const reqPath = `/user/register`;
  try {
    const response = await fetchWrapper(reqPath, values, "", "", true);
    const data = await response.json();
    if (!data?.success) {
      errorToastLogger(
        "registerUser",
        data?.message || "Failed to register",
        data?.error
      );
      return false;
    }
    return data;
  } catch (err) {
    errorToastLogger("registerUser", "Failed to register", err);
    return false;
  }
};
