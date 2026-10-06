import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

function friendlyError(code) {
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }
    if (password !== confirm) {
      return setError("Passwords do not match.");
    }
    setLoading(true);
    try {
      await signup(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(friendlyError(err.code));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-neutral-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-neutral-200 shadow-xs p-8">
        <h1 className="text-4xl font-black tracking-tight text-black">Join Cat-Dex</h1>
        <p className="mt-1 mb-6 text-neutral-500">Create an account to collect cats.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl border border-neutral-300 px-4 py-3 outline-hidden focus:border-black"
          />
          <input
            type="password"
            required
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-2xl border border-neutral-300 px-4 py-3 outline-hidden focus:border-black"
          />
          <input
            type="password"
            required
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="rounded-2xl border border-neutral-300 px-4 py-3 outline-hidden focus:border-black"
          />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-black text-white font-semibold py-3 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-black underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}