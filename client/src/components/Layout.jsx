import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Dumbbell,
  LayoutDashboard,
  Users,
  CreditCard,
  ClipboardList,
  Wallet,
  CalendarCheck,
  Handshake,
  Megaphone,
  Star,
  BadgeCheck,
  Home,
  User,
  CalendarDays,
  Dumbbell as DumbbellIcon,
  TrendingUp,
  Bell,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { clearAuth, getUser } from "../api/api";

function Layout({ children }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = getUser();
  const role = user?.role;

  const closeSidebar = () => setSidebarOpen(false);

  // Navigation groups per role
  const navGroups = {
    owner: [
      {
        label: "Overview",
        links: [
          { to: "/dashboard/owner", icon: LayoutDashboard, label: "Dashboard" },
        ],
      },
      {
        label: "Management",
        links: [
          { to: "/members", icon: Users, label: "Members" },
          { to: "/memberships", icon: CreditCard, label: "Membership Plans" },
          { to: "/member-memberships", icon: ClipboardList, label: "Member Memberships" },
          { to: "/payments", icon: Wallet, label: "Payments" },
          { to: "/attendance", icon: CalendarCheck, label: "Attendance" },
          { to: "/assignments", icon: Handshake, label: "Assignments" },
        ],
      },
      {
        label: "Engagement",
        links: [
          { to: "/announcements", icon: Megaphone, label: "Announcements" },
          { to: "/reviews", icon: Star, label: "Member Reviews" },
          { to: "/dashboard/owner/approvals", icon: BadgeCheck, label: "Trainer Approvals" },
        ],
      },
    ],
    receptionist: [
      {
        label: "Overview",
        links: [
          { to: "/dashboard/owner", icon: LayoutDashboard, label: "Dashboard" },
        ],
      },
      {
        label: "Management",
        links: [
          { to: "/members", icon: Users, label: "Members" },
          { to: "/memberships", icon: CreditCard, label: "Membership Plans" },
          { to: "/member-memberships", icon: ClipboardList, label: "Member Memberships" },
          { to: "/payments", icon: Wallet, label: "Payments" },
          { to: "/attendance", icon: CalendarCheck, label: "Attendance" },
          { to: "/assignments", icon: Handshake, label: "Assignments" },
        ],
      },
      {
        label: "Engagement",
        links: [
          { to: "/announcements", icon: Megaphone, label: "Announcements" },
          { to: "/reviews", icon: Star, label: "Member Reviews" },
        ],
      },
    ],
    trainer: [
      {
        label: "Overview",
        links: [
          { to: "/dashboard/trainer", icon: LayoutDashboard, label: "My Dashboard" },
        ],
      },
      {
        label: "Work",
        links: [
          { to: "/dashboard/trainer/members", icon: Users, label: "My Members" },
          { to: "/dashboard/trainer/plans", icon: DumbbellIcon, label: "Workout Plans" },
        ],
      },
    ],
    member: [
      {
        label: "Overview",
        links: [
          { to: "/dashboard/member", icon: Home, label: "My Dashboard" },
        ],
      },
      {
        label: "My Account",
        links: [
          { to: "/dashboard/member/profile", icon: User, label: "My Profile" },
          { to: "/dashboard/member/membership", icon: CreditCard, label: "My Membership" },
          { to: "/dashboard/member/payments", icon: Wallet, label: "My Payments" },
        ],
      },
      {
        label: "Fitness",
        links: [
          { to: "/dashboard/member/schedule", icon: CalendarDays, label: "My Schedule" },
          { to: "/dashboard/member/workouts", icon: DumbbellIcon, label: "My Workouts" },
          { to: "/dashboard/member/progress", icon: TrendingUp, label: "My Progress" },
        ],
      },
      {
        label: "Community",
        links: [
          { to: "/dashboard/member/announcements", icon: Megaphone, label: "Announcements" },
          { to: "/dashboard/member/reviews", icon: Star, label: "Leave a Review" },
          { to: "/dashboard/member/notifications", icon: Bell, label: "Notifications" },
        ],
      },
    ],
  };

  const groups = navGroups[role] || [];
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const getNavLinkClass = ({ isActive }) =>
    isActive ? "nav-link active" : "nav-link";

  const renderLinks = (links) =>
    links.map((link) => {
      const Icon = link.icon;

      return (
        <NavLink
          key={link.to}
          to={link.to}
          className={getNavLinkClass}
          onClick={closeSidebar}
        >
          <span className="nav-icon">
            <Icon />
          </span>
          {link.label}
        </NavLink>
      );
    });

  return (
    <div className="app-layout">
      {/* Mobile top bar */}
      <div className="mobile-header">
        <div className="mobile-logo">
          <span className="logo-mark">
            <Dumbbell />
          </span>
          GymPro
        </div>

        <button
          className="menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu />
        </button>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeSidebar}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="logo">
          <span className="logo-mark">
            <Dumbbell />
          </span>
          <div>
            GymPro
            <span>Gym Management</span>
          </div>
        </div>

        {user && (
          <div className="sidebar-user">
            <div className="avatar">{initials}</div>
            <div className="sidebar-user-info">
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>
            <button
              className="menu-btn sidebar-close"
              onClick={closeSidebar}
              aria-label="Close menu"
            >
              <X />
            </button>
          </div>
        )}

        <nav className="nav-links">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {renderLinks(group.links)}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}

export default Layout;