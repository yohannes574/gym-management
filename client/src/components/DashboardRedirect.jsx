import { Navigate } from "react-router-dom";
import { getToken, getUser } from "../api/api";

// Sends the user to the dashboard that matches their role
function DashboardRedirect() {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "owner" || user.role === "receptionist") {
    return <Navigate to="/dashboard/owner" replace />;
  }

  if (user.role === "trainer") {
    return <Navigate to="/dashboard/trainer" replace />;
  }

  if (user.role === "member") {
    return <Navigate to="/dashboard/member" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default DashboardRedirect;