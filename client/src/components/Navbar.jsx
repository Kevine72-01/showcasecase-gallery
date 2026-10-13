import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark lms-navbar">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/dashboard">
          LearnSpace
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#lmsNavigation"
          aria-controls="lmsNavigation"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="lmsNavigation">
          <div className="navbar-nav me-auto">
            <NavLink className="nav-link" to="/dashboard">
              Dashboard
            </NavLink>

            <NavLink className="nav-link" to="/courses">
              Courses
            </NavLink>

            {user?.role === "instructor" && (
              <NavLink className="nav-link" to="/manage-courses">
                Manage Courses
              </NavLink>
            )}

            <NavLink className="nav-link" to="/assignments">
              Assignments
            </NavLink>
          </div>

          <div className="d-flex align-items-center gap-3">
            <Link to="/profile" className="text-white text-decoration-none">
              {user?.name}
            </Link>

            <button
              className="btn btn-outline-light btn-sm"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
