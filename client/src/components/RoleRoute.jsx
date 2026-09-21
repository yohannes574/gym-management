import { Navigate } from "react-router-dom";
import { getToken, getUser } from "../api/api";

// Route guard that checks the logged-in user's role
function RoleRoute({ allow, children }) {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(user.role)) {
    // Send the user to the dashboard for their own role
    const roleHome = {
      owner: "/dashboard/owner",
      receptionist: "/dashboard/owner",
      trainer: "/dashboard/trainer",
      member: "/dashboard/member",
    }[user.role];

    return <Navigate to={roleHome || "/login"} replace />;
  }

  return children;
}

export default RoleRoute;