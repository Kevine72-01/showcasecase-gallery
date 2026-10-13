import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthProvider";
import { useAuth } from "./context/useAuth";

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CourseDetailsPage from "./pages/CourseDetailsPage";
import ProfilePage from "./pages/ProfilePage";
import CoursesPage from "./pages/CoursePage";
import ManageCoursesPage from "./pages/ManageCoursePage";
import AssignmentsPage from "./pages/AssignmentPage";

function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container py-5 text-center">Loading LearnSpace...</div>
    );
  }

  return (
    <>
      {user && <Navbar />}

      <Routes>
        <Route
          path="/"
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
        />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Routes available to authenticated users */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailsPage />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
        </Route>

        {/* Student-only routes */}
        <Route element={<ProtectedRoute roles={["student"]} />}>
          <Route path="/my-courses" element={<CoursesPage enrolledOnly />} />
        </Route>

        {/* Instructor-only routes */}
        <Route element={<ProtectedRoute roles={["instructor"]} />}>
          <Route path="/manage-courses" element={<ManageCoursesPage />} />
        </Route>

        {/* Fallback route */}
        <Route
          path="*"
          element={
            <div className="container py-5 text-center">
              <h1 className="h3">Page not found</h1>
              <p>The page you requested does not exist.</p>
            </div>
          }
        />
      </Routes>

      <footer className="page-footer">
        LearnSpace LMS · MERN Stack Project
      </footer>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}
