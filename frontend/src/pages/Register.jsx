import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { API_BASE } from "../services/api/base";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    nombreCompleto: "",
    telefono: "",
  });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setOk("");
    if (!form.username || !form.password || !form.email || !form.nombreCompleto) {
      setError("Completa usuario, password, email y nombre.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password debe tener al menos 8 caracteres.");
      return;
    }
    if (!form.confirmPassword) {
      setError("Confirma el password.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords no coinciden.");
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    if (!emailOk) {
      setError("Email invalido.");
      return;
    }
    if (form.telefono) {
      const telefonoOk = /^\d{10}$/.test(form.telefono);
      if (!telefonoOk) {
        setError("Telefono debe tener 10 digitos.");
        return;
      }
    }
    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE}/usuarios/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          confirm_password: form.confirmPassword,
          email: form.email,
          nombre_completo: form.nombreCompleto,
          telefono: form.telefono,
          es_admin: false,
        }),
      });
      if (!response.ok) {
        let message = "No se pudo registrar el usuario.";
        try {
          const data = await response.json();
          message = data?.error || data?.detail || JSON.stringify(data);
        } catch {
          // keep fallback
        }
        throw new Error(message);
      }
      setOk("Usuario creado correctamente. Ya podes iniciar sesion.");
      setTimeout(() => navigate("/login"), 800);
      setForm({
        username: "",
        password: "",
        confirmPassword: "",
        email: "",
        nombreCompleto: "",
        telefono: "",
      });
    } catch (err) {
      setError(err?.message || "No se pudo registrar el usuario.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-6 w-full max-w-sm rounded-xl bg-neutral-200 p-4 shadow text-center">
      <h2 className="text-xl font-semibold text-gray-800">Registro</h2>
      <p className="mt-1 text-sm text-gray-600">
        Crea un usuario para acceder a la plataforma.
      </p>

      <form className="mt-4 space-y-3 text-left" onSubmit={handleSubmit}>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Usuario</label>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={form.username}
            onChange={(event) => handleChange("username", event.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={form.password}
            onChange={(event) => handleChange("password", event.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Confirmar password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={form.confirmPassword}
            onChange={(event) => handleChange("confirmPassword", event.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={form.email}
            onChange={(event) => handleChange("email", event.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Nombre completo</label>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={form.nombreCompleto}
            onChange={(event) => handleChange("nombreCompleto", event.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Telefono</label>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={form.telefono}
            onChange={(event) => handleChange("telefono", event.target.value)}
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {ok ? <p className="text-sm text-green-700">{ok}</p> : null}

        <Button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Registrando..." : "Crear usuario"}
        </Button>
        <Button
          type="button"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          onClick={() => navigate("/login")}
        >
          Volver al login
        </Button>
      </form>
    </div>
  );
}
