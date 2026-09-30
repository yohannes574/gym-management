import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import StaffLogin from "./pages/StaffLogin";
import Dashboard from "./pages/Dashboard";
import RoleRoute from "./components/RoleRoute";
import DashboardRedirect from "./components/DashboardRedirect";
import Members from "./pages/Members";
import Memberships from "./pages/Memberships";
import MemberMemberships from "./pages/MemberMemberships";
import Payments from "./pages/Payments";
import Attendance from "./pages/Attendance";
import MemberDashboard from "./pages/MemberDashboard";
import MyProfile from "./pages/MyProfile";
import MemberMembership from "./pages/MemberMembership";
import MemberPayments from "./pages/MemberPayments";
import PaymentReceipt from "./pages/PaymentReceipt";
import MemberSchedule from "./pages/MemberSchedule";
import MemberWorkouts from "./pages/MemberWorkouts";
import MemberProgress from "./pages/MemberProgress";
import TrainerDashboard from "./pages/TrainerDashboard";
import TrainerApprovals from "./pages/TrainerApprovals";
import TrainerMembers from "./pages/TrainerMembers";
import MemberProfile from "./pages/MemberProfile";
import TrainerPlans from "./pages/TrainerPlans";
import Assignments from "./pages/Assignments";
import Announcements from "./pages/Announcements";
import MemberAnnouncements from "./pages/MemberAnnouncements";
import Reviews from "./pages/Reviews";
import MemberReviews from "./pages/MemberReviews";
import MemberNotifications from "./pages/MemberNotifications";
import AuditLogs from "./pages/AuditLogs";
import OwnerReports from "./pages/OwnerReports";

function App() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* SECRET STAFF PORTAL (not linked in the public UI) */}
      <Route path="/staff/login" element={<StaffLogin />} />

      {/* SENDS EACH ROLE TO ITS OWN DASHBOARD */}
      <Route path="/dashboard" element={<DashboardRedirect />} />

      {/* OWNER / RECEPTIONIST */}
      <Route
        path="/dashboard/owner"
        element={
          <RoleRoute allow={["owner", "receptionist"]}>
            <Dashboard />
          </RoleRoute>
        }
      />
      <Route
        path="/dashboard/owner/approvals"
        element={
          <RoleRoute allow={["owner"]}>
            <TrainerApprovals />
          </RoleRoute>
        }
      />
      <Route
        path="/owner/audit"
        element={
          <RoleRoute allow={["owner"]}>
            <AuditLogs />
          </RoleRoute>
        }
      />
      <Route
        path="/owner/reports"
        element={
          <RoleRoute allow={["owner"]}>
            <OwnerReports />
          </RoleRoute>
        }
      />
      <Route
        path="/members"
        element={
          <RoleRoute allow={["owner", "receptionist"]}>
            <Members />
          </RoleRoute>
        }
      />
      <Route
        path="/memberships"
        element={
          <RoleRoute allow={["owner", "receptionist"]}>
            <Memberships />
          </RoleRoute>
        }
      />
      <Route
        path="/member-memberships"
        element={
          <RoleRoute allow={["owner", "receptionist"]}>
            <MemberMemberships />
          </RoleRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <RoleRoute allow={["owner", "receptionist"]}>
            <Payments />
          </RoleRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <RoleRoute allow={["owner", "receptionist"]}>
            <Attendance />
          </RoleRoute>
        }
      />

      {/* TRAINER */}
      <Route
        path="/dashboard/trainer"
        element={
          <RoleRoute allow={["trainer"]}>
            <TrainerDashboard />
          </RoleRoute>
        }
      />
      <Route
        path="/dashboard/trainer/members"
        element={
          <RoleRoute allow={["trainer"]}>
            <TrainerMembers />
          </RoleRoute>
        }
      />
      <Route
        path="/dashboard/trainer/members/:memberId"
        element={
          <RoleRoute allow={["trainer"]}>
            <MemberProfile />
          </RoleRoute>
        }
      />
      <Route
        path="/dashboard/trainer/plans"
        element={
          <RoleRoute allow={["trainer"]}>
            <TrainerPlans />
          </RoleRoute>
        }
      />

      {/* STAFF ASSIGNMENTS */}
      <Route
        path="/assignments"
        element={
          <RoleRoute allow={["owner", "receptionist"]}>
            <Assignments />
          </RoleRoute>
        }
      />
      <Route
        path="/announcements"
        element={
          <RoleRoute allow={["owner", "receptionist"]}>
            <Announcements />
          </RoleRoute>
        }
      />
      <Route
        path="/reviews"
        element={
          <RoleRoute allow={["owner", "receptionist"]}>
            <Reviews />
          </RoleRoute>
        }
      />

      {/* MEMBER */}
      <Route
        path="/dashboard/member"
        element={
          <RoleRoute allow={["member"]}>
            <MemberDashboard />
          </RoleRoute>
        }
      />
      <Route
        path="/dashboard/member/profile"
        element={
          <RoleRoute allow={["member"]}>
            <MyProfile />
          </RoleRoute>
        }
      />
      <Route
        path="/dashboard/member/membership"
        element={
          <RoleRoute allow={["member"]}>
            <MemberMembership />
          </RoleRoute>
        }
      />
      <Route
        path="/dashboard/member/payments"
        element={
          <RoleRoute allow={["member"]}>
            <MemberPayments />
          </RoleRoute>
        }
      />
      <Route
        path="/dashboard/member/payments/:id/receipt"
        element={
          <RoleRoute allow={["member"]}>
            <PaymentReceipt />
          </RoleRoute>
        }
      />
      <Route
        path="/dashboard/member/schedule"
        element={
          <RoleRoute allow={["member"]}>
            <MemberSchedule />
          </RoleRoute>
        }
      />
      <Route
        path="/dashboard/member/workouts"
        element={
          <RoleRoute allow={["member"]}>
            <MemberWorkouts />
          </RoleRoute>
        }
      />
      <Route
        path="/dashboard/member/progress"
        element={
          <RoleRoute allow={["member"]}>
            <MemberProgress />
          </RoleRoute>
        }
      />
      <Route
        path="/dashboard/member/announcements"
        element={
          <RoleRoute allow={["member"]}>
            <MemberAnnouncements />
          </RoleRoute>
        }
      />
      <Route
        path="/dashboard/member/reviews"
        element={
          <RoleRoute allow={["member"]}>
            <MemberReviews />
          </RoleRoute>
        }
      />
      <Route
        path="/dashboard/member/notifications"
        element={
          <RoleRoute allow={["member"]}>
            <MemberNotifications />
          </RoleRoute>
        }
      />
    </Routes>
  );
}

export default App;