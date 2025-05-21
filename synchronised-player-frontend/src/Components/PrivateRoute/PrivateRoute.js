import React from "react";
import { useSelector } from "react-redux";

import Spinner from "Components/Spinner/Spinner";

function ProtectedRoute({ children }) {
  const userDetails = useSelector((state) => state.root.user);

  if (!userDetails._id) {
    const href = window.location.href;
    const queryParams = href.split("?")[1] || "";
    window.location.replace(`/auth?${queryParams}`);

    return (
      <div className="spinner-container">
        <Spinner />
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
