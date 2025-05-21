import { errorToastLogger, fetchWrapper } from "utils/util";

export const uploadFileWithProgress = (
  url,
  body,
  headers = {
    "content-type": "application/octet-stream",
  },
  reqType = "PUT",
  removeHeaders = false
) => {
  if (removeHeaders) headers = {};
  const xhr = new XMLHttpRequest();
  const response = (onProgress) =>
    new Promise((resolve, reject) => {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress)
          onProgress((event.loaded / event.total) * 100);
      });

      xhr.onerror = (e) => reject(e);
      xhr.onabort = (e) => reject(e);
      xhr.addEventListener("loadend", () => {
        resolve(xhr.readyState === 4 ? xhr.responseText : false);
      });
      xhr.open(reqType, url, true);
      for (let key in headers) {
        xhr.setRequestHeader(key, headers[key]);
      }
      xhr.send(body);
    });

  return { xhr, response };
};
