import { Bell, Search } from "lucide-react";
import { useState } from "react";

function Navbar() {
  const [query, setQuery] = useState("");
  return (
    <header className="navbar">

      <div className="search-box">
        <Search size={19} />
        <input
          type="text"
          placeholder="Search students..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="navbar-right">

        <button className="notification" onClick={() => window.alert("No new notifications")}>
          <Bell size={21} />
          <span className="notification-dot"></span>
        </button>

        <div className="profile">

          <div className="profile-avatar">
            A
          </div>

          <div className="profile-info">
            <strong>Admin</strong>
            <span>Administrator</span>
          </div>

        </div>

      </div>

    </header>
  );
}

export default Navbar;