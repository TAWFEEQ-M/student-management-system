import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  GraduationCap,
  BookOpen,
  BarChart3,
  AlertTriangle,
  Settings,
  LogOut
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { useApp } from "../context/AppContext";

function Sidebar() {
  const { logout } = useApp();

  return (
    <aside className="sidebar">

      <div className="logo">
        <GraduationCap size={30} />
        <span>StudentHub</span>
      </div>

      <nav className="sidebar-nav">

        <NavLink
          to="/"
          className="nav-item"
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/students"
          className="nav-item"
        >
          <Users size={20} />
          <span>Students</span>
        </NavLink>

        <NavLink
          to="/attendance"
          className="nav-item"
        >
          <CalendarCheck size={20} />
          <span>Attendance</span>
        </NavLink>

        <NavLink
          to="/marks"
          className="nav-item"
        >
          <GraduationCap size={20} />
          <span>Marks</span>
        </NavLink>

        <NavLink
          to="/subjects"
          className="nav-item"
        >
          <BookOpen size={20} />
          <span>Subjects</span>
        </NavLink>

        <NavLink
          to="/reports"
          className="nav-item"
        >
          <BarChart3 size={20} />
          <span>Reports</span>
        </NavLink>

        <NavLink to="/low-attendance" className="nav-item">
          <AlertTriangle size={20} />
          <span>Low Attendance</span>
        </NavLink>

      </nav>

      <div className="sidebar-bottom">

        <button className="nav-item" onClick={() => window.alert("Settings are managed by your administrator.")}>
          <Settings size={20} />
          <span>Settings</span>
        </button>

        <button className="nav-item logout" onClick={logout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;