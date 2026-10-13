import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../context/useAuth";

export default function AssignmentsPage() {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    instructions: "",
    course: "",
    dueDate: "",
    maxScore: 100,
    published: false,
  });

  const [answer, setAnswer] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [grading, setGrading] = useState({});

  const [saving, setSaving] = useState(false);

  const isInstructor = user?.role === "instructor";

  const fetchAssignments = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/assignments");

      setAssignments(response.data.assignments || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load assignments. Check your backend routes.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get("/courses", {
        params: {
          mine: isInstructor ? true : undefined,
          limit: 100,
        },
      });

      setCourses(response.data.courses || []);
    } catch {
      setCourses([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchAssignments(), fetchCourses()]);
    };

    loadData();
  }, [isInstructor]);

  const handleAssignmentChange = (event) => {
    const { name, value, type, checked } = event.target;

    setAssignmentForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCreateAssignment = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (
      !assignmentForm.title.trim() ||
      !assignmentForm.instructions.trim() ||
      !assignmentForm.course
    ) {
      setError("Please provide a title, instructions, and course.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/assignments", {
        ...assignmentForm,
        title: assignmentForm.title.trim(),
        instructions: assignmentForm.instructions.trim(),
        maxScore: Number(assignmentForm.maxScore),
        dueDate: assignmentForm.dueDate || null,
      });

      setMessage("Assignment created successfully.");
      setShowCreateForm(false);

      setAssignmentForm({
        title: "",
        instructions: "",
        course: "",
        dueDate: "",
        maxScore: 100,
        published: false,
      });

      await fetchAssignments();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to create the assignment.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAssignment = async (event, assignmentId) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!answer.trim()) {
      setError("Please enter your answer before submitting.");
      return;
    }

    setSaving(true);

    try {
      await api.post(`/assignments/${assignmentId}/submissions`, {
        answer: answer.trim(),
        attachmentUrl: attachmentUrl.trim(),
      });

      setMessage("Your assignment was submitted successfully.");
      setAnswer("");
      setAttachmentUrl("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to submit your assignment.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleViewSubmissions = async (assignment) => {
    setError("");
    setMessage("");
    setSelectedAssignment(assignment);

    try {
      const response = await api.get(
        `/assignments/${assignment._id}/submissions`,
      );

      setSubmissions(response.data.submissions || []);
    } catch (err) {
      setSubmissions([]);
      setError(
        err.response?.data?.message || "Unable to load student submissions.",
      );
    }
  };

  const handleGradeChange = (submissionId, field, value) => {
    setGrading((current) => ({
      ...current,
      [submissionId]: {
        ...current[submissionId],
        [field]: value,
      },
    }));
  };

  const handleGradeSubmission = async (submission) => {
    const values = grading[submission._id] || {};

    const score =
      values.score === undefined ? (submission.score ?? "") : values.score;

    const feedback =
      values.feedback === undefined
        ? submission.feedback || ""
        : values.feedback;

    if (score === "" || !Number.isFinite(Number(score))) {
      setError("Please enter a valid numeric grade.");
      return;
    }

    if (Number(score) < 0 || Number(score) > selectedAssignment.maxScore) {
      setError(`Grade must be between 0 and ${selectedAssignment.maxScore}.`);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await api.patch(`/assignments/submissions/${submission._id}/grade`, {
        score: Number(score),
        feedback,
      });

      setMessage("Submission graded successfully.");

      await handleViewSubmissions(selectedAssignment);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to grade this submission.",
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const query = search.toLowerCase();

    return (
      assignment.title?.toLowerCase().includes(query) ||
      assignment.course?.title?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-success" role="status" />
        <p className="mt-2">Loading assignments...</p>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="fw-bold">Assignments</h1>
          <p className="text-secondary mb-0">
            {isInstructor
              ? "Create assignments and review student submissions."
              : "View coursework and submit your assignments."}
          </p>
        </div>

        {isInstructor && (
          <button
            className="btn btn-success"
            onClick={() => setShowCreateForm((value) => !value)}
          >
            {showCreateForm ? "Cancel" : "+ Create Assignment"}
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="alert alert-success" role="alert">
          {message}
        </div>
      )}

      {isInstructor && showCreateForm && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-success text-white py-3">
            <h5 className="mb-0">Create Assignment</h5>
          </div>

          <div className="card-body p-4">
            <form onSubmit={handleCreateAssignment}>
              <div className="mb-3">
                <label className="form-label">Assignment Title</label>
                <input
                  className="form-control"
                  name="title"
                  value={assignmentForm.title}
                  onChange={handleAssignmentChange}
                  maxLength={150}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Course</label>
                <select
                  className="form-select"
                  name="course"
                  value={assignmentForm.course}
                  onChange={handleAssignmentChange}
                  required
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title} ({course.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Instructions</label>
                <textarea
                  className="form-control"
                  name="instructions"
                  rows={4}
                  value={assignmentForm.instructions}
                  onChange={handleAssignmentChange}
                  required
                />
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">Due Date</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    name="dueDate"
                    value={assignmentForm.dueDate}
                    onChange={handleAssignmentChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Maximum Score</label>
                  <input
                    type="number"
                    className="form-control"
                    name="maxScore"
                    min="1"
                    max="100000"
                    value={assignmentForm.maxScore}
                    onChange={handleAssignmentChange}
                    required
                  />
                </div>
              </div>

              <div className="form-check form-switch mb-4">
                <input
                  id="assignmentPublished"
                  className="form-check-input"
                  type="checkbox"
                  name="published"
                  checked={assignmentForm.published}
                  onChange={handleAssignmentChange}
                />
                <label
                  className="form-check-label"
                  htmlFor="assignmentPublished"
                >
                  Publish assignment for students
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-success"
                disabled={saving}
              >
                {saving ? "Saving..." : "Create Assignment"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input
          type="search"
          className="form-control"
          placeholder="Search assignments or courses..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search assignments"
        />
      </div>

      {filteredAssignments.length === 0 ? (
        <div className="text-center py-5">
          <h4>No assignments found</h4>
          <p className="text-secondary">
            Assignments will appear here when they are available.
          </p>
        </div>
      ) : (
        <div className="row g-4">
          {filteredAssignments.map((assignment) => (
            <div className="col-12 col-lg-6" key={assignment._id}>
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <span className="badge text-bg-success">
                      {assignment.course?.title || "Course"}
                    </span>

                    <span className="badge text-bg-light border">
                      {assignment.published ? "Published" : "Draft"}
                    </span>
                  </div>

                  <h5 className="fw-bold">{assignment.title}</h5>

                  <p className="text-secondary">{assignment.instructions}</p>

                  <p className="small mb-2">
                    <strong>Maximum score:</strong> {assignment.maxScore}
                  </p>

                  <p className="small text-secondary">
                    <strong>Due:</strong>{" "}
                    {assignment.dueDate
                      ? new Date(assignment.dueDate).toLocaleString()
                      : "No due date"}
                  </p>

                  {isInstructor ? (
                    <button
                      className="btn btn-outline-success"
                      onClick={() => handleViewSubmissions(assignment)}
                    >
                      View Submissions / Grade
                    </button>
                  ) : (
                    <form
                      onSubmit={(event) =>
                        handleSubmitAssignment(event, assignment._id)
                      }
                    >
                      <div className="mb-3">
                        <label className="form-label">Your Answer</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={answer}
                          onChange={(event) => setAnswer(event.target.value)}
                          placeholder="Write your answer..."
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">
                          Attachment URL (optional)
                        </label>
                        <input
                          type="url"
                          className="form-control"
                          value={attachmentUrl}
                          onChange={(event) =>
                            setAttachmentUrl(event.target.value)
                          }
                          placeholder="https://example.com/my-work.pdf"
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn btn-success"
                        disabled={saving || !assignment.published}
                      >
                        {saving ? "Submitting..." : "Submit Assignment"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isInstructor && selectedAssignment && (
        <div className="card border-0 shadow-sm mt-5">
          <div className="card-header bg-success text-white py-3 d-flex justify-content-between align-items-center gap-2">
            <h5 className="mb-0">Submissions: {selectedAssignment.title}</h5>

            <button
              className="btn btn-sm btn-light"
              onClick={() => {
                setSelectedAssignment(null);
                setSubmissions([]);
              }}
            >
              Close
            </button>
          </div>

          <div className="card-body p-4">
            {submissions.length === 0 ? (
              <p className="text-secondary mb-0">
                No submissions found for this assignment.
              </p>
            ) : (
              <div className="d-flex flex-column gap-4">
                {submissions.map((submission) => (
                  <div key={submission._id} className="border rounded p-3">
                    <h6 className="fw-bold">
                      {submission.student?.name || "Student"}
                    </h6>

                    <p className="text-secondary small">
                      Submitted:{" "}
                      {submission.submittedAt
                        ? new Date(submission.submittedAt).toLocaleString()
                        : "Unknown"}
                    </p>

                    <div
                      className="bg-light rounded p-3 mb-3"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {submission.answer || "No written answer."}
                    </div>

                    {submission.attachmentUrl && (
                      <p>
                        <a
                          href={submission.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View Attachment
                        </a>
                      </p>
                    )}

                    <div className="row g-3">
                      <div className="col-md-3">
                        <label className="form-label">Score</label>

                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          max={selectedAssignment.maxScore}
                          value={
                            grading[submission._id]?.score ??
                            submission.score ??
                            ""
                          }
                          onChange={(event) =>
                            handleGradeChange(
                              submission._id,
                              "score",
                              event.target.value,
                            )
                          }
                        />
                      </div>

                      <div className="col-md-9">
                        <label className="form-label">Feedback</label>

                        <textarea
                          className="form-control"
                          rows={2}
                          value={
                            grading[submission._id]?.feedback ??
                            submission.feedback ??
                            ""
                          }
                          onChange={(event) =>
                            handleGradeChange(
                              submission._id,
                              "feedback",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    </div>

                    <button
                      className="btn btn-success btn-sm mt-3"
                      disabled={saving}
                      onClick={() => handleGradeSubmission(submission)}
                    >
                      Save Grade
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
