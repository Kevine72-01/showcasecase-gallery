import { useState } from "react";
import { useAuth } from "../context/useAuth";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setSaving(true);

    try {
      await updateProfile({
        name: form.name.trim(),
        bio: form.bio.trim(),
      });

      setMessage("Your profile has been updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">
          Please log in to view your profile.
        </div>
      </div>
    );
  }

  const initials = (user.name || "User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="fw-bold">My Profile</h1>
        <p className="text-secondary">
          Manage your personal information and account details.
        </p>
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

      <div className="row g-4">
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center p-4">
              <div
                className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center mx-auto mb-3 fw-bold"
                style={{
                  width: 100,
                  height: 100,
                  fontSize: 32,
                }}
              >
                {initials}
              </div>

              <h4 className="fw-bold mb-1">{user.name}</h4>

              <p className="text-secondary mb-3">
                {user.email}
              </p>

              <span className="badge text-bg-success text-capitalize">
                {user.role}
              </span>

              <hr />

              <div className="text-start">
                <p className="mb-2">
                  <strong>Account type:</strong>{" "}
                  <span className="text-capitalize">
                    {user.role}
                  </span>
                </p>

                <p className="mb-0">
                  <strong>Email:</strong> {user.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3">
              <h5 className="fw-bold mb-0">
                Personal Information
              </h5>
            </div>

            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">
                    Full Name
                  </label>

                  <input
                    id="name"
                    type="text"
                    name="name"
                    className="form-control"
                    value={form.name}
                    onChange={handleChange}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    value={user.email || ""}
                    disabled
                  />

                  <small className="text-secondary">
                    Your email address cannot be changed here.
                  </small>
                </div>

                <div className="mb-4">
                  <label htmlFor="bio" className="form-label">
                    About Me
                  </label>

                  <textarea
                    id="bio"
                    name="bio"
                    className="form-control"
                    rows={4}
                    maxLength={500}
                    value={form.bio}
                    onChange={handleChange}
                    placeholder="Tell us a little about yourself..."
                  />

                  <small className="text-secondary">
                    {form.bio.length}/500 characters
                  </small>
                </div>

                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
