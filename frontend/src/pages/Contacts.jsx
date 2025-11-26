import { useEffect, useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  ChevronDownIcon,
  EllipsisVerticalIcon,
  PhoneIcon,
  PhoneArrowDownLeftIcon,
  PhoneArrowUpRightIcon,
} from "@heroicons/react/24/outline";

import IOSSwitch from "../components/IOSSwitch";
import ContactDetailModal from "../components/ContactDetailModal";
import "../styles/index.css";

// SERVICES
import {
  getClientes,
  getContactos,
  getProveedores,
  eliminarContacto,
} from "../services/api/contacts";

function Contacts({ altaUsuario }) {
  const [filtro, setFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [contactos, setContactos] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const [modalContacto, setModalContacto] = useState(null);

  // =============================
  //     CARGA INICIAL / FILTRO
  // =============================
  useEffect(() => {
    const cargar = async () => {
      try {
        let data = [];

        if (filtro === "clientes") data = await getClientes();
        else if (filtro === "proveedores") data = await getProveedores();
        else data = await getContactos();

        setContactos(data);
      } catch (err) {
        console.error("Error cargando contactos:", err);
      }
    };

    cargar();
  }, [filtro]);

  // =============================
  //      BUSCADOR / FILTRO LOCAL
  // =============================
  const contactosFiltrados = contactos.filter((c) =>
    `${c.nombre} ${c.telefono} ${c.direccion_completa || ""}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  // =============================
  //      TOGGLE ACTIVO
  // =============================
  const handleToggleActivo = async (id, nuevoValor) => {
    try {
      setUpdatingId(id);

      setContactos((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, activo: nuevoValor } : c
        )
      );

      const res = await fetch(`/api/contactos/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: nuevoValor }),
      });

      if (!res.ok) throw new Error("Error al actualizar contacto");
    } catch (err) {
      console.error(err);
      setContactos((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, activo: !nuevoValor } : c
        )
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // =============================
  //         ELIMINAR
  // =============================
  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro de eliminar este contacto?")) return;

    try {
      await eliminarContacto(id);

      // lo sacamos localmente
      setContactos((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Error eliminando contacto:", err);
      alert("No se pudo eliminar el contacto.");
    }
  };

  return (
    <div className="p-4">

      {/* Filtros superiores */}
      <div className="flex items-center justify-between mb-4 backdrop-blur-md z-10">

        {/* Buscador */}
        <input
          type="text"
          placeholder="Buscar contacto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="
            w-5/9 p-2 rounded-xl bg-white/10 text-white placeholder-gray-300
            focus:outline-none focus:ring-2 focus:ring-blue-500
          "
        />

        {/* Dropdown filtro */}
        <Menu>
          <MenuButton className="inline-flex items-center gap-2 rounded-xl bg-gray-800 px-3 py-2 text-sm font-semibold text-white shadow-inner shadow-white/10">
            <span>
              {filtro === ""
                ? "Todos"
                : filtro === "clientes"
                ? "Clientes"
                : "Proveedores"}
            </span>
            <ChevronDownIcon className="h-5 w-5" />
          </MenuButton>

          <MenuItems
            transition
            anchor="bottom end"
            className="absolute w-52 right-0 mt-2 origin-top-right rounded-xl border border-white/5 bg-white/10 p-1 text-sm text-white backdrop-blur-lg shadow-lg transition"
          >
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={() => setFiltro("")}
                  className={`w-full text-left px-4 py-2 flex items-center ${active ? "opcion-activa" : ""}`}
                >
                  <PhoneIcon className="h-5 w-5 mr-2" />
                  Todos
                </button>
              )}
            </MenuItem>

            <MenuItem>
              {({ active }) => (
                <button
                  onClick={() => setFiltro("clientes")}
                  className={`w-full text-left px-4 py-2 flex items-center ${active ? "opcion-activa" : ""}`}
                >
                  <PhoneArrowUpRightIcon className="h-5 w-5 mr-2" />
                  Clientes
                </button>
              )}
            </MenuItem>

            <MenuItem>
              {({ active }) => (
                <button
                  onClick={() => setFiltro("proveedores")}
                  className={`w-full text-left px-4 py-2 flex items-center ${active ? "opcion-activa" : ""}`}
                >
                  <PhoneArrowDownLeftIcon className="h-5 w-5 mr-2" />
                  Proveedores
                </button>
              )}
            </MenuItem>
          </MenuItems>
        </Menu>
      </div>

      {/* Lista */}
      <div className="mt-4 space-y-4">
        {contactosFiltrados.length === 0 ? (
          <p className="text-center text-gray-300">
            No hay contactos para mostrar.
          </p>
        ) : (
          contactosFiltrados.map((c) => (
            <div
              key={c.id}
              onClick={() => setModalContacto(c)}
              className="
                w-full rounded-3xl bg-slate-800/70
                backdrop-blur-sm p-4 shadow-lg
                transition transform hover:scale-[1.01]
                cursor-pointer
              "
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-white font-semibold text-lg">{c.nombre}</h3>

                  {c.direccion_completa && (
                    <p className="text-white/70 text-sm">{c.direccion_completa}</p>
                  )}

                  <p className="text-blue-300 text-sm">{c.telefono}</p>

                  <span
                    className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                      c.tipo === "cliente"
                        ? "bg-green-600/20 text-green-400"
                        : "bg-blue-600/20 text-blue-400"
                    }`}
                  >
                    {c.tipo === "cliente" ? "Cliente" : "Proveedor"}
                  </span>

                  {typeof c.saldo !== "undefined" && (
                    <p
                      className={`mt-1 text-sm ${
                        c.saldo < 0
                          ? "text-red-400"
                          : c.saldo > 0
                          ? "text-green-400"
                          : "text-gray-300"
                      }`}
                    >
                      Saldo: ${c.saldo}
                    </p>
                  )}
                </div>

                {/* Switch + menú */}
                <div className="flex flex-col items-end">
                  <IOSSwitch
                    checked={!!c.activo}
                    disabled={updatingId === c.id}
                    onChange={(nuevo) => handleToggleActivo(c.id, nuevo)}
                  />

                  <Menu>
                    <MenuButton
                      onClick={(e) => e.stopPropagation()} // evita abrir modal
                      className="mt-2 p-1 rounded-full hover:bg-white/10"
                    >
                      <EllipsisVerticalIcon className="h-6 w-6 text-white" />
                    </MenuButton>

                    <MenuItems
                      anchor="bottom end"
                      className="
                        absolute mt-2 right-0 w-40 rounded-xl
                        bg-white/10 text-white p-2 backdrop-blur-lg shadow-lg
                      "
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MenuItem>
                        {({ active }) => (
                          <button
                            onClick={() => setModalContacto(c)}
                            className={`w-full text-left px-3 py-2 ${
                              active ? "bg-white/20" : ""
                            }`}
                          >
                            Editar
                          </button>
                        )}
                      </MenuItem>

                      <MenuItem>
                        {({ active }) => (
                          <button
                            className={`w-full text-left px-3 py-2 ${
                              active ? "bg-white/20" : ""
                            }`}
                          >
                            Ver Cuenta Corriente
                          </button>
                        )}
                      </MenuItem>

                      <MenuItem>
                        {({ active }) => (
                          <button
                            onClick={() => handleDelete(c.id)}
                            className={`w-full text-left px-3 py-2 text-red-400 ${
                              active ? "bg-red-400/20" : ""
                            }`}
                          >
                            Eliminar
                          </button>
                        )}
                      </MenuItem>
                    </MenuItems>
                  </Menu>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL DETALLE */}
      {modalContacto && (
        <ContactDetailModal
          contacto={modalContacto}
          open={!!modalContacto}
          onClose={() => setModalContacto(null)}
        />
      )}
    </div>
  );
}

export default Contacts;
