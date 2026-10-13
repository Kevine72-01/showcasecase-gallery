import { useCallback, useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../context/useAuth";

export default function AssignmentsPage() {
  const { user } = useAuth();

  // Main data
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [mySubmissions, setMySubmissions] = useState({});
  const [submissions, setSubmissions] = useState([]);

  // Page state
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Instructor state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Assignment form
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    instructions: "",
    course: "",
    dueDate: "",
    maxScore: 100,
    published: false,
  });

  // Keep answers separate for each assignment.
  const [answers, setAnswers] = useState({});
  const [attachmentUrls, setAttachmentUrls] = useState({});
  const [grading, setGrading] = useState({});

  const isInstructor = user?.role === "instructor";

  // Fetch assignments and existing student submissions.
  const fetchAssignments = useCallback(async () => {
    try {
      const response = await api.get("/assignments");

      const list = Array.isArray(response.data)
        ? response.data
        : response.data.assignments || [];

      setAssignments(list);

      if (!isInstructor) {
        const submissionMap = {};

        list.forEach((assignment) => {
          if (assignment.submission) {
            submissionMap[assignment._id] = assignment.submission;
          }
        });

        setMySubmissions(submissionMap);
      }

      setError("");
    } catch (err) {
      console.error("Fetch assignments error:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load assignments. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [isInstructor]);

  // Fetch courses for the instructor's assignment form.
  const fetchCourses = useCallback(async () => {
    if (!isInstructor) return;

    try {
      const response = await api.get("/courses", {
        params: { mine: true, limit: 100 },
      });

      const data = response.data;
      setCourses(Array.isArray(data) ? data : data.courses || []);
    } catch (err) {
      console.error("Fetch courses error:", err);
      setCourses([]);
    }
  }, [isInstructor]);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchAssignments(), fetchCourses()]);
    };

    loadData();
  }, [fetchAssignments, fetchCourses]);

  // Handle assignment creation form fields.
  const handleAssignmentChange = (event) => {
    const { name, value, type, checked } = event.target;

    setAssignmentForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Create a new assignment.
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

    const maxScore = Number(assignmentForm.maxScore);

    if (!Number.isFinite(maxScore) || maxScore < 1 || maxScore > 1000) {
      setError("Maximum score must be between 1 and 1000.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/assignments", {
        title: assignmentForm.title.trim(),
        instructions: assignmentForm.instructions.trim(),
        course: assignmentForm.course,
        dueDate: assignmentForm.dueDate || null,
        maxScore,
        published: assignmentForm.published,
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

  // Submit an answer for a specific assignment.
  const handleSubmitAssignment = async (event, assignment) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const content = (answers[assignment._id] || "").trim();

    if (!content) {
      setError("Please enter your answer before submitting.");
      return;
    }

    if (!assignment.published) {
      setError("This assignment has not been published yet.");
      return;
    }

    setSaving(true);

    try {
      const response = await api.post(
        `/assignments/${assignment._id}/submissions`,
        {
          content,
        },
      );

      // Update the visible indicator immediately.
      const savedSubmission = response.data.submission;

      if (savedSubmission) {
        setMySubmissions((current) => ({
          ...current,
          [assignment._id]: savedSubmission,
        }));
      } else {
        // Still show submitted status if the API only returns a message.
        setMySubmissions((current) => ({
          ...current,
          [assignment._id]: {
            content,
            submittedAt: new Date().toISOString(),
            grade: null,
            feedback: "",
          },
        }));
      }

      setAnswers((current) => ({
        ...current,
        [assignment._id]: "",
      }));

      setMessage(response.data.message || "Assignment submitted successfully.");

      // Reload to retrieve the persisted submission from the backend.
      await fetchAssignments();
    } catch (err) {
      console.error("Submit assignment error:", err);
      setError(
        err.response?.data?.message || "Unable to submit your assignment.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Load all submissions for an instructor-selected assignment.
  const handleViewSubmissions = async (assignment) => {
    setError("");
    setMessage("");
    setSelectedAssignment(assignment);
    setSubmissions([]);

    try {
      const response = await api.get(
        `/assignments/${assignment._id}/submissions`,
      );

      const data = response.data;
      setSubmissions(Array.isArray(data) ? data : data.submissions || []);
    } catch (err) {
      console.error("Fetch submissions error:", err);
      setError(
        err.response?.data?.message || "Unable to load assignment submissions.",
      );
    }
  };

  // Handle instructor grade and feedback inputs.
  const handleGradeChange = (submissionId, field, value) => {
    setGrading((current) => ({
      ...current,
      [submissionId]: {
        ...current[submissionId],
        [field]: value,
      },
    }));
  };

  // Save a grade and instructor feedback.
  const handleGradeSubmission = async (submission) => {
    if (!selectedAssignment) return;

    const values = grading[submission._id] || {};

    const score =
      values.score !== undefined ? values.score : (submission.grade ?? "");

    const feedback =
      values.feedback !== undefined
        ? values.feedback
        : submission.feedback || "";

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
        grade: Number(score),
        feedback,
      });

      setMessage("Submission graded successfully.");

      // Refresh the list after grading.
      await handleViewSubmissions(selectedAssignment);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to grade this submission.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Search assignments by title or course.
  const filteredAssignments = assignments.filter((assignment) => {
    const query = search.trim().toLowerCase();

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
      {/* Page heading */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="fw-bold">Assignments</h1>
          <p className="text-secondary mb-0">
            {isInstructor
              ? "Create assignments and review student submissions."
              : "View coursework, submit your work, and track your grades."}
          </p>
        </div>

        {isInstructor && (
          <button
            type="button"
            className="btn btn-success"
            onClick={() => setShowCreateForm((value) => !value)}
          >
            {showCreateForm ? "Cancel" : "+ Create Assignment"}
          </button>
        )}
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="alert alert-success" role="status">
          {message}
        </div>
      )}

      {/* Instructor: create assignment */}
      {isInstructor && showCreateForm && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-success text-white py-3">
            <h5 className="mb-0">Create Assignment</h5>
          </div>

          <div className="card-body p-4">
            <form onSubmit={handleCreateAssignment}>
              <div className="mb-3">
                <label className="form-label" htmlFor="assignmentTitle">
                  Assignment Title
                </label>
                <input
                  id="assignmentTitle"
                  className="form-control"
                  name="title"
                  value={assignmentForm.title}
                  onChange={handleAssignmentChange}
                  maxLength={150}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="assignmentCourse">
                  Course
                </label>
                <select
                  id="assignmentCourse"
                  className="form-select"
                  name="course"
                  value={assignmentForm.course}
                  onChange={handleAssignmentChange}
                  required
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                      {course.code ? ` (${course.code})` : ""}
                    </option>
                  ))}
                </select>

                {courses.length === 0 && (
                  <small className="text-secondary">
                    No courses found. Create or assign a course to your
                    instructor account first.
                  </small>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="assignmentInstructions">
                  Instructions
                </label>
                <textarea
                  id="assignmentInstructions"
                  className="form-control"
                  name="instructions"
                  rows={4}
                  maxLength={10000}
                  value={assignmentForm.instructions}
                  onChange={handleAssignmentChange}
                  required
                />
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="assignmentDueDate">
                    Due Date
                  </label>
                  <input
                    id="assignmentDueDate"
                    type="datetime-local"
                    className="form-control"
                    name="dueDate"
                    value={assignmentForm.dueDate}
                    onChange={handleAssignmentChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label" htmlFor="assignmentMaxScore">
                    Maximum Score
                  </label>
                  <input
                    id="assignmentMaxScore"
                    type="number"
                    className="form-control"
                    name="maxScore"
                    min="1"
                    max="1000"
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
                disabled={saving || courses.length === 0}
              >
                {saving ? "Saving..." : "Create Assignment"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
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

      {/* Assignment cards */}
      {filteredAssignments.length === 0 ? (
        <div className="text-center py-5">
          <h4>No assignments found</h4>
          <p className="text-secondary">
            Assignments will appear here when they are available.
          </p>
        </div>
      ) : (
        <div className="row g-4">
          {filteredAssignments.map((assignment) => {
            const submission = mySubmissions[assignment._id];
            const isSubmitted = Boolean(submission);

            return (
              <div className="col-12 col-lg-6" key={assignment._id}>
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <span className="badge text-bg-success">
                        {assignment.course?.title || "Course"}
                      </span>

                      {isInstructor ? (
                        <span
                          className={`badge ${
                            assignment.published
                              ? "text-bg-success"
                              : "text-bg-secondary"
                          }`}
                        >
                          {assignment.published ? "Published" : "Draft"}
                        </span>
                      ) : (
                        <span
                          className={`badge ${
                            isSubmitted
                              ? "text-bg-success"
                              : assignment.published
                                ? "text-bg-warning"
                                : "text-bg-secondary"
                          }`}
                        >
                          {isSubmitted
                            ? "Submitted"
                            : assignment.published
                              ? "Not submitted"
                              : "Not published"}
                        </span>
                      )}
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

                    {/* Student: submission details and grade */}
                    {!isInstructor && isSubmitted && (
                      <div className="alert alert-success mt-3 mb-3">
                        <div className="fw-bold mb-1">
                          <span aria-hidden="true">✓ </span>
                          Assignment Submitted
                        </div>

                        <div className="small">
                          <strong>Submitted:</strong>{" "}
                          {submission.submittedAt
                            ? new Date(submission.submittedAt).toLocaleString()
                            : "Submission recorded"}
                        </div>

                        {submission.content && (
                          <div className="mt-2">
                            <strong>Your answer:</strong>
                            <div
                              className="bg-white rounded border p-2 mt-1"
                              style={{ whiteSpace: "pre-wrap" }}
                            >
                              {submission.content}
                            </div>
                          </div>
                        )}

                        <div className="mt-2">
                          <strong>Grade:</strong>{" "}
                          {submission.grade !== null &&
                          submission.grade !== undefined
                            ? `${submission.grade} / ${assignment.maxScore}`
                            : "Not graded yet"}
                        </div>

                        {submission.feedback && (
                          <div className="mt-2">
                            <strong>Instructor feedback:</strong>
                            <p className="mb-0">{submission.feedback}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Instructor controls */}
                    {isInstructor ? (
                      <button
                        type="button"
                        className="btn btn-outline-success"
                        onClick={() => handleViewSubmissions(assignment)}
                      >
                        View Submissions / Grade
                      </button>
                    ) : (
                      /* Student submission form */
                      <form
                        onSubmit={(event) =>
                          handleSubmitAssignment(event, assignment)
                        }
                      >
                        <div className="mb-3">
                          <label
                            className="form-label"
                            htmlFor={`answer-${assignment._id}`}
                          >
                            {isSubmitted ? "Update Your Answer" : "Your Answer"}
                          </label>

                          <textarea
                            id={`answer-${assignment._id}`}
                            className="form-control"
                            rows={3}
                            value={answers[assignment._id] || ""}
                            onChange={(event) =>
                              setAnswers((current) => ({
                                ...current,
                                [assignment._id]: event.target.value,
                              }))
                            }
                            placeholder="Write your answer..."
                            disabled={!assignment.published || saving}
                            required
                          />
                        </div>

                        <div className="mb-3">
                          <label
                            className="form-label"
                            htmlFor={`attachment-${assignment._id}`}
                          >
                            Attachment URL (optional)
                          </label>

                          <input
                            id={`attachment-${assignment._id}`}
                            type="url"
                            className="form-control"
                            value={attachmentUrls[assignment._id] || ""}
                            onChange={(event) =>
                              setAttachmentUrls((current) => ({
                                ...current,
                                [assignment._id]: event.target.value,
                              }))
                            }
                            placeholder="https://example.com/my-work.pdf"
                            disabled={!assignment.published || saving}
                          />

                          <small className="text-secondary">
                            Attachment links are displayed only if your backend
                            supports storing them.
                          </small>
                        </div>

                        <button
                          type="submit"
                          className="btn btn-success"
                          disabled={saving || !assignment.published}
                        >
                          {saving
                            ? "Submitting..."
                            : isSubmitted
                              ? "Update Submission"
                              : "Submit Assignment"}
                        </button>

                        {!assignment.published && (
                          <p className="text-secondary small mt-2 mb-0">
                            This assignment is not available for submission.
                          </p>
                        )}
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Instructor: review and grade submissions */}
      {isInstructor && selectedAssignment && (
        <div className="card border-0 shadow-sm mt-5">
          <div className="card-header bg-success text-white py-3 d-flex justify-content-between align-items-center gap-2">
            <h5 className="mb-0">Submissions: {selectedAssignment.title}</h5>

            <button
              type="button"
              className="btn btn-sm btn-light"
              onClick={() => {
                setSelectedAssignment(null);
                setSubmissions([]);
                setGrading({});
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
                      {submission.student?.name ||
                        submission.student?.fullName ||
                        submission.student?.email ||
                        "Student"}
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
                      {submission.content || "No written answer."}
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
                        <label
                          className="form-label"
                          htmlFor={`score-${submission._id}`}
                        >
                          Score
                        </label>

                        <input
                          id={`score-${submission._id}`}
                          type="number"
                          className="form-control"
                          min="0"
                          max={selectedAssignment.maxScore}
                          step="any"
                          value={
                            grading[submission._id]?.score ??
                            submission.grade ??
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
                        <label
                          className="form-label"
                          htmlFor={`feedback-${submission._id}`}
                        >
                          Feedback
                        </label>

                        <textarea
                          id={`feedback-${submission._id}`}
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
                      type="button"
                      className="btn btn-success btn-sm mt-3"
                      disabled={saving}
                      onClick={() => handleGradeSubmission(submission)}
                    >
                      {saving ? "Saving..." : "Save Grade"}
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
