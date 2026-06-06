import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { API_BASE, setAuthTokens } from "../services/api/base";

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
      navigate("/home");
    } catch (err) {
      setError(err?.message || "No se pudo validar el acceso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full p-4 bg-black/80 text-center h-[calc(100dvh-2.5rem)] overflow-y-hidden lg:h-screen lg:overflow-y-auto flex items-center justify-center">
      <div className="w-full max-w-sm p-4 rounded-xl bg-black/80 border border-stone-700">
        <h1 className="text-2xl text-white">
          Bienvenido a Lupon
        </h1>
        <form className="mt-4 space-y-3 text-left" onSubmit={handleSubmit}>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-white">Usuario</label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg bg-stone-900 border border-stone-700 p-2 text-[16px] text-white"
              value={user}
              onChange={(event) => setUser(event.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-white">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg bg-stone-900 border border-stone-700 p-2 text-[16px] text-white"
              value={pass}
              onChange={(event) => setPass(event.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}
          <Button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Validando..." : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
