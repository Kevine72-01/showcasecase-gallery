import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/useAuth";

export default function CourseDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [completingLessonId, setCompletingLessonId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isStudent = user?.role === "student";

  useEffect(() => {
    let active = true;

    const loadCourse = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/courses/${id}`);

        if (!active) return;

        const loadedCourse = response.data.course || response.data;
        setCourse(loadedCourse);

        if (user?.role === "student") {
          try {
            const enrollmentResponse = await api.get("/enrollments/mine");

            if (!active) return;

            const data = enrollmentResponse.data;
            const enrollments = Array.isArray(data)
              ? data
              : data.enrollments || [];

            const currentEnrollment = enrollments.find((item) => {
              const enrolledCourseId =
                item.course?._id || item.course;

              return String(enrolledCourseId) === String(id);
            });

            setEnrollment(currentEnrollment || null);
          } catch (err) {
            if (active) {
              console.error(
                "Failed to load enrollment:",
                err.response?.data || err.message
              );
              setEnrollment(null);
            }
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to load this course."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCourse();

    return () => {
      active = false;
    };
  }, [id, user?.role]);

  const handleEnroll = async () => {
    setEnrolling(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post("/enrollments", {
        courseId: id,
      });

      setEnrollment(
        response.data.enrollment || {
          course: id,
          completedLessons: [],
          status: "active",
        }
      );

      setMessage("You have successfully enrolled in this course.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to enroll in this course."
      );
    } finally {
      setEnrolling(false);
    }
  };

  const handleCompleteLesson = async (lessonId) => {
    if (!course?._id || !lessonId) {
      setError("Course or lesson information is missing.");
      return;
    }

    setError("");
    setMessage("");
    setCompletingLessonId(lessonId);

    try {
      const response = await api.patch(
        `/enrollments/course/${course._id}/lessons/${lessonId}/complete`
      );

      if (response.data.enrollment) {
        setEnrollment(response.data.enrollment);
      } else {
        setEnrollment((current) => {
          if (!current) return current;

          const currentCompleted = current.completedLessons || [];
          const alreadyCompleted = currentCompleted.some(
            (item) =>
              String(item?._id || item) === String(lessonId)
          );

          if (alreadyCompleted) return current;

          return {
            ...current,
            completedLessons: [
              ...currentCompleted,
              lessonId,
            ],
          };
        });
      }

      setMessage("Lesson marked as complete.");
    } catch (err) {
      console.error(
        "Failed to complete lesson:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          "Unable to update lesson progress."
      );
    } finally {
      setCompletingLessonId(null);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-success" role="status" />
        <p className="mt-2">Loading course...</p>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error}</div>
        <Link to="/courses" className="btn btn-success">
          Back to Courses
        </Link>
      </div>
    );
  }

  if (!course) return null;

  const lessons = course.lessons || [];
  const completedLessons = enrollment?.completedLessons || [];

  const isLessonCompleted = (lessonId) =>
    completedLessons.some(
      (item) =>
        String(item?._id || item) === String(lessonId)
    );

  const completedCount = lessons.filter((lesson) =>
    isLessonCompleted(lesson._id)
  ).length;

  const progress =
    lessons.length > 0
      ? Math.round((completedCount / lessons.length) * 100)
      : 0;

  return (
    <div className="container py-4">
      <Link
        to="/courses"
        className="text-decoration-none text-success"
      >
        ← Back to Courses
      </Link>

      {error && (
        <div className="alert alert-danger mt-3">{error}</div>
      )}

      {message && (
        <div className="alert alert-success mt-3">
          {message}
        </div>
      )}

      <div className="card border-0 shadow-sm mt-3 mb-4">
        {course.thumbnail && (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="card-img-top"
            style={{
              maxHeight: 360,
              objectFit: "cover",
            }}
          />
        )}

        <div className="card-body p-4 p-md-5">
          <div className="d-flex flex-wrap gap-2 mb-3">
            <span className="badge text-bg-success">
              {course.category || "General"}
            </span>

            <span className="badge text-bg-light border">
              {course.code}
            </span>
          </div>

          <h1 className="fw-bold">{course.title}</h1>

          <p className="text-secondary">
            Instructor: {course.instructor?.name || "Instructor"}
          </p>

          <p style={{ whiteSpace: "pre-wrap" }}>
            {course.description}
          </p>

          {isStudent && !enrollment && (
            <button
              className="btn btn-success btn-lg mt-3"
              onClick={handleEnroll}
              disabled={enrolling}
            >
              {enrolling ? "Enrolling..." : "Enroll in Course"}
            </button>
          )}

          {isStudent && enrollment && (
            <div className="mt-4">
              <div className="d-flex justify-content-between mb-2">
                <span className="fw-semibold">
                  Your Learning Progress
                </span>
                <span>{progress}%</span>
              </div>

              <div
                className="progress"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  className="progress-bar bg-success"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <small className="text-secondary">
                {completedCount} of {lessons.length} lessons completed
              </small>
            </div>
          )}
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fw-bold mb-0">Course Lessons</h2>
        <span className="text-secondary">
          {lessons.length} lessons
        </span>
      </div>

      {lessons.length === 0 ? (
        <div className="alert alert-info">
          No lessons have been added to this course yet.
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {lessons.map((lesson, index) => {
            const completed = isLessonCompleted(lesson._id);
            const completing = completingLessonId === lesson._id;

            return (
              <div
                className="card border-0 shadow-sm"
                key={lesson._id || index}
              >
                <div className="card-body p-4">
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                    <div className="d-flex gap-3">
                      <div
                        className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                        style={{
                          width: 44,
                          height: 44,
                          flexShrink: 0,
                        }}
                      >
                        {completed ? "✓" : index + 1}
                      </div>

                      <div>
                        <h5 className="fw-bold">
                          {lesson.title}
                        </h5>

                        {lesson.content && (
                          <p
                            className="text-secondary mb-2"
                            style={{ whiteSpace: "pre-wrap" }}
                          >
                            {lesson.content}
                          </p>
                        )}

                        {lesson.materialUrl && (
                          <a
                            href={lesson.materialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-success"
                          >
                            Open Learning Material ↗
                          </a>
                        )}
                      </div>
                    </div>

                    {isStudent && enrollment && (
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          completed
                            ? "btn-outline-success"
                            : "btn-success"
                        }`}
                        disabled={completed || completing}
                        onClick={() =>
                          handleCompleteLesson(lesson._id)
                        }
                      >
                        {completed
                          ? "Completed"
                          : completing
                            ? "Saving..."
                            : "Mark Complete"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {user?.role === "instructor" && (
        <div className="mt-4">
          <Link
            to="/manage-courses"
            className="btn btn-outline-success"
          >
            Manage Your Courses
          </Link>
        </div>
      )}
    </div>
  );
}
