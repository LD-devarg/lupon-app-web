import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";

export default function Login() {
  const navigate = useNavigate();
  const [user, setUser] = useState(localStorage.getItem("devAuthUser") || "");
  const [pass, setPass] = useState(localStorage.getItem("devAuthPass") || "");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!user || !pass) {
      setError("Completa usuario y password.");
      return;
    }
    localStorage.setItem("devAuthUser", user);
    localStorage.setItem("devAuthPass", pass);
    setError("");
    navigate("/pedidos-ventas");
  };

  const handleClear = () => {
    localStorage.removeItem("devAuthUser");
    localStorage.removeItem("devAuthPass");
    setUser("");
    setPass("");
  };

  return (
    <div className="mx-auto mt-6 w-full max-w-sm rounded-xl bg-neutral-200 p-4 shadow text-center">
      <h2 className="text-xl font-semibold text-gray-800">Acceso dev</h2>
      <p className="mt-1 text-sm text-gray-600">
        Usa tu usuario y password para consumir la API.
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
        >
          Guardar credenciales
        </Button>
        <Button
          type="button"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          onClick={handleClear}
        >
          Limpiar
        </Button>
      </form>
    </div>
  );
}
