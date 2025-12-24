import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { API_BASE, setAuthTokens, clearAuthTokens } from "../services/api/base";

export default function Login() {
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user || !pass) {
      setError("Completa usuario y password.");
      return;
    }
    setError("");
    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE}/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });
      if (!response.ok) {
        throw new Error("Credenciales invalidas.");
      }
      const data = await response.json();
      setAuthTokens({ access: data.access, refresh: data.refresh });
      navigate("/dashboard");
    } catch (err) {
      setError(err?.message || "No se pudo validar el acceso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    clearAuthTokens();
    setUser("");
    setPass("");
  };

  return (
    <div className="mx-auto mt-6 w-full max-w-sm rounded-xl bg-neutral-200 p-4 shadow text-center">
      <h2 className="text-xl font-semibold text-gray-800">Acceso dev</h2>
      <p className="mt-1 text-sm text-gray-600">
        Usa tu usuario y password.
      </p>

      <form className="mt-4 space-y-3 text-left" onSubmit={handleSubmit}>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Usuario</label>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={user}
            onChange={(event) => setUser(event.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={pass}
            onChange={(event) => setPass(event.target.value)}
          />
        </div>
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : null}
        <Button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Validando..." : "Ingresar"}
        </Button>
        <Button
          type="button"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          onClick={handleClear}
        >
          Limpiar
        </Button>
        <Button
          type="button"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          onClick={() => navigate("/register")}
        >
          Registrarse
        </Button>
      </form>
    </div>
  );
}
