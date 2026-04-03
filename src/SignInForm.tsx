import { useState } from "react";
import { toast } from "sonner";

const PASSWORD = "Bi7eEfMpVimsvRZBB8gLGyfnjuueKpVodU";

export function SignInForm({ onAuth }: { onAuth: () => void }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (password === PASSWORD) {
      localStorage.setItem("phoodle-auth", "true");
      onAuth();
    } else {
      toast.error("Incorrect password.");
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form className="flex flex-col gap-form-field" onSubmit={handleSubmit}>
        <input
          className="auth-input-field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button className="auth-button" type="submit" disabled={submitting}>
          Sign in
        </button>
      </form>
    </div>
  );
}
