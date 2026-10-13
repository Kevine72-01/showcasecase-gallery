import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchCourses = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/courses", {
          params: { search, page, limit: 9 },
        });

        if (!active) return;

        const data = response.data;
        setCourses(data.courses || []);
        setPages(data.pages || 1);
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to load courses. Check your backend connection."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCourses();

    return () => {
      active = false;
    };
  }, [search, page]);

  const handleSearch = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="fw-bold">Explore Courses</h1>
          <p className="text-secondary mb-0">
            Discover courses and continue your learning journey.
          </p>
        </div>

        <span className="badge text-bg-success fs-6">
          {courses.length} courses
        </span>
      </div>

      <div className="mb-4">
        <input
          type="search"
          className="form-control form-control-lg"
          placeholder="Search by course title, code, or category..."
          value={search}
          onChange={handleSearch}
          aria-label="Search courses"
        />
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status" />
          <p className="mt-2">Loading courses...</p>
        </div>
      )}

      {!loading && error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && courses.length === 0 && (
        <div className="text-center py-5">
          <h4>No courses found</h4>
          <p className="text-secondary">
            Try another search or check back later.
          </p>
        </div>
      )}

      {!loading && !error && courses.length > 0 && (
        <div className="row g-4">
          {courses.map((course) => (
            <div className="col-12 col-md-6 col-lg-4" key={course._id}>
              <article className="card h-100 shadow-sm border-0">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    className="card-img-top"
                    alt={course.title}
                    style={{ height: 190, objectFit: "cover" }}
                  />
                ) : (
                  <div
                    className="d-flex align-items-center justify-content-center bg-success-subtle text-success"
                    style={{ height: 190 }}
                  >
                    <span className="fs-1">📚</span>
                  </div>
                )}

                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between gap-2 mb-2">
                    <span className="badge text-bg-light border">
                      {course.category || "General"}
                    </span>
                    <small className="text-secondary">
                      {course.code}
                    </small>
                  </div>

                  <h5 className="card-title fw-bold">
                    {course.title}
                  </h5>

                  <p className="card-text text-secondary">
                    {course.description?.length > 120
                      ? `${course.description.slice(0, 120)}...`
                      : course.description}
                  </p>

                  <div className="mt-auto pt-3">
                    <p className="small text-secondary">
                      Instructor:{" "}
                      {course.instructor?.name || "Course instructor"}
                    </p>

                    <Link
                      to={`/courses/${course._id}`}
                      className="btn btn-success w-100"
                    >
                      View Course
                    </Link>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && pages > 1 && (
        <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
          <button
            className="btn btn-outline-success"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>

          <span>
            Page {page} of {pages}
          </span>

          <button
            className="btn btn-outline-success"
            disabled={page >= pages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
