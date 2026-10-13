import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

const emptyCourse = {
  title: "",
  code: "",
  description: "",
  category: "",
  thumbnail: "",
  published: false,
  lessons: [],
};

export default function ManageCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyCourse);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchCourses = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/courses", {
        params: { mine: true, limit: 100 },
      });

      setCourses(response.data.courses || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load your courses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(emptyCourse);
    setEditingId(null);
    setError("");
    setMessage("");
  };

  const handleEdit = (course) => {
    setEditingId(course._id);

    setForm({
      title: course.title || "",
      code: course.code || "",
      description: course.description || "",
      category: course.category || "",
      thumbnail: course.thumbnail || "",
      published: Boolean(course.published),
      lessons: (course.lessons || []).map((lesson) => ({
        title: lesson.title || "",
        content: lesson.content || "",
        materialUrl: lesson.materialUrl || "",
      })),
    });

    setError("");
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLessonChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      lessons: current.lessons.map((lesson, i) =>
        i === index ? { ...lesson, [field]: value } : lesson,
      ),
    }));
  };

  const addLesson = () => {
    setForm((current) => ({
      ...current,
      lessons: [
        ...current.lessons,
        { title: "", content: "", materialUrl: "" },
      ],
    }));
  };

  const removeLesson = (index) => {
    setForm((current) => ({
      ...current,
      lessons: current.lessons.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.title.trim() || !form.code.trim() || !form.description.trim()) {
      setError("Title, course code, and description are required.");
      return;
    }

    const invalidLesson = form.lessons.some((lesson) => !lesson.title.trim());

    if (invalidLesson) {
      setError("Every lesson must have a title.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        category: form.category.trim(),
        thumbnail: form.thumbnail.trim(),
        published: Boolean(form.published),
        lessons: form.lessons.map((lesson) => ({
          title: lesson.title.trim(),
          content: lesson.content.trim(),
          materialUrl: lesson.materialUrl.trim(),
        })),
      };

      if (editingId) {
        await api.put(`/courses/${editingId}`, payload);
      } else {
        await api.post("/courses", payload);
      }

      const successMessage = editingId
        ? "Course updated successfully."
        : "Course created successfully.";

      resetForm();
      await fetchCourses();
      setMessage(successMessage);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save the course. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (course) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${course.title}"?`,
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await api.delete(`/courses/${course._id}`);
      setCourses((current) =>
        current.filter((item) => item._id !== course._id),
      );

      if (editingId === course._id) {
        resetForm();
      }

      setMessage("Course deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete the course.");
    }
  };

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="fw-bold">Manage Courses</h1>
        <p className="text-secondary">
          Create and organize courses, lessons, and learning materials.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {message && <div className="alert alert-success">{message}</div>}

      <div className="card border-0 shadow-sm mb-5">
        <div className="card-header bg-success text-white py-3">
          <h5 className="mb-0">
            {editingId ? "Edit Course" : "Create New Course"}
          </h5>
        </div>

        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-8">
                <label className="form-label">Course Title *</label>
                <input
                  className="form-control"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  maxLength={150}
                  placeholder="Introduction to Programming"
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Course Code *</label>
                <input
                  className="form-control"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  required
                  maxLength={30}
                  placeholder="CS101"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Category</label>
                <input
                  className="form-control"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="Information Technology"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Thumbnail Image URL</label>
                <input
                  type="url"
                  className="form-control"
                  name="thumbnail"
                  value={form.thumbnail}
                  onChange={handleChange}
                  placeholder="https://example.com/course.jpg"
                />
              </div>

              <div className="col-12">
                <label className="form-label">Description *</label>
                <textarea
                  className="form-control"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  required
                  placeholder="Describe what students will learn..."
                />
              </div>
            </div>

            <hr className="my-4" />

            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Course Lessons</h5>

              <button
                type="button"
                className="btn btn-outline-success btn-sm"
                onClick={addLesson}
              >
                + Add Lesson
              </button>
            </div>

            {form.lessons.length === 0 && (
              <p className="text-secondary">
                No lessons added yet. You can add lessons now or later.
              </p>
            )}

            {form.lessons.map((lesson, index) => (
              <div className="border rounded p-3 mb-3" key={index}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0">Lesson {index + 1}</h6>

                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => removeLesson(index)}
                  >
                    Remove
                  </button>
                </div>

                <div className="mb-3">
                  <label className="form-label">Lesson Title *</label>
                  <input
                    className="form-control"
                    value={lesson.title}
                    onChange={(event) =>
                      handleLessonChange(index, "title", event.target.value)
                    }
                    required
                    placeholder="Getting Started"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Lesson Content</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={lesson.content}
                    onChange={(event) =>
                      handleLessonChange(index, "content", event.target.value)
                    }
                    placeholder="Enter lesson content..."
                  />
                </div>

                <div>
                  <label className="form-label">Learning Material URL</label>
                  <input
                    type="url"
                    className="form-control"
                    value={lesson.materialUrl}
                    onChange={(event) =>
                      handleLessonChange(
                        index,
                        "materialUrl",
                        event.target.value,
                      )
                    }
                    placeholder="https://example.com/material.pdf"
                  />
                </div>
              </div>
            ))}

            <div className="form-check form-switch my-4">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="published"
                name="published"
                checked={form.published}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="published">
                Publish course for students
              </label>
            </div>

            <div className="d-flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn btn-success"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Create Course"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={resetForm}
                >
                  Cancel Editing
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <h3 className="fw-bold mb-3">Your Courses</h3>

      {loading ? (
        <p>Loading courses...</p>
      ) : courses.length === 0 ? (
        <div className="alert alert-info">
          You have not created any courses yet.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Course</th>
                <th>Code</th>
                <th>Lessons</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {courses.map((course) => (
                <tr key={course._id}>
                  <td className="fw-semibold">{course.title}</td>
                  <td>{course.code}</td>
                  <td>{course.lessons?.length || 0}</td>
                  <td>
                    <span
                      className={`badge ${
                        course.published
                          ? "text-bg-success"
                          : "text-bg-secondary"
                      }`}
                    >
                      {course.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => handleEdit(course)}
                      >
                        Edit
                      </button>

                      <Link
                        to={`/courses/${course._id}`}
                        className="btn btn-sm btn-outline-primary"
                      >
                        View
                      </Link>

                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(course)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
