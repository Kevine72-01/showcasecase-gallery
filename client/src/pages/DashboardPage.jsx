import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function DashboardPage() {
  const { user } = useAuth();

  const isInstructor = user?.role === "instructor";

  return (
    <main className="container py-4 py-md-5">
      <div className="dashboard-hero rounded-4 p-4 p-md-5 mb-4">
        <span className="badge bg-light text-success mb-3">
          {isInstructor ? "Instructor Workspace" : "Student Workspace"}
        </span>

        <h1 className="display-6 fw-bold">
          Welcome, {user?.name?.split(" ")[0]}!
        </h1>

        <p className="mb-4">
          {isInstructor
            ? "Manage your courses, prepare lessons, and support your students."
            : "Explore courses, continue learning, and keep track of your progress."}
        </p>

        <Link to="/courses" className="btn btn-light fw-semibold">
          Explore Courses
        </Link>
      </div>

      <h2 className="h4 fw-bold mb-3">Quick Access</h2>

      <div className="row g-3">
        <div className="col-12 col-md-6 col-xl-4">
          <div className="card dashboard-card h-100">
            <div className="card-body p-4">
              <div className="dashboard-icon">📚</div>
              <h3 className="h5 mt-3">Courses</h3>
              <p className="text-secondary">
                Browse available courses and learning materials.
              </p>
              <Link to="/courses" className="btn btn-outline-success">
                View Courses
              </Link>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-xl-4">
          <div className="card dashboard-card h-100">
            <div className="card-body p-4">
              <div className="dashboard-icon">📝</div>
              <h3 className="h5 mt-3">Assignments</h3>
              <p className="text-secondary">
                {isInstructor
                  ? "Prepare assignments and review student work."
                  : "Review your assigned activities and submissions."}
              </p>
              <Link
                to="/assignments"
                className="btn btn-outline-success"
              >
                View Assignments
              </Link>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-xl-4">
          <div className="card dashboard-card h-100">
            <div className="card-body p-4">
              <div className="dashboard-icon">👤</div>
              <h3 className="h5 mt-3">My Profile</h3>
              <p className="text-secondary">
                Manage your name and personal learning profile.
              </p>
              <Link
                to="/profile"
                className="btn btn-outline-success"
              >
                View Profile
              </Link>
            </div>
          </div>
        </div>

        {isInstructor && (
          <div className="col-12 col-md-6 col-xl-4">
            <div className="card dashboard-card h-100">
              <div className="card-body p-4">
                <div className="dashboard-icon">🛠️</div>
                <h3 className="h5 mt-3">Course Management</h3>
                <p className="text-secondary">
                  Create courses and manage your published lessons.
                </p>
                <Link
                  to="/manage-courses"
                  className="btn btn-outline-success"
                >
                  Manage Courses
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}