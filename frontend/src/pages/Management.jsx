// src/pages/Management.jsx
import { useNavigate } from "react-router-dom";
import {
  UserGroupIcon,
  BanknotesIcon,
  CubeIcon,
  ArrowDownOnSquareStackIcon,
    ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

function Management() {
  const navigate = useNavigate();

  const items = [
    {
      title: "Contactos",
      description: "Ver y gestionar tus contactos.",
      icon: UserGroupIcon,
      path: "/contacts",      // Contacts.jsx
    },
    {
      title: "Ventas",
      description: "Pedidos facturados y ventas.",
      icon: BanknotesIcon,
      path: "/sells",         // Sells.jsx
    },
    {
      title: "Productos",
      description: "Catálogo, precios y ofertas.",
      icon: CubeIcon,
      path: "/products",      // Products.jsx
    },
    {
      title: "Compras",
      description: "Compras a proveedores.",
      icon: ArrowDownOnSquareStackIcon,
      path: "/purchases",     // Purchases.jsx
    },
    {
      title: "Pedidos",
      description: "Gestión de pedidos y estados.",
      icon: ClipboardDocumentListIcon,
      path: "/orders",        // Orders.jsx
    },
  ];

  return (
    <section className="min-h-[calc(100vh-80px)] px-4 py-6 flex flex-col items-center">
      {/* Contenedor central tipo tarjeta iOS */}
      <div className="w-full max-w-4xl rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.6)] p-5 sm:p-7">
        <div className="mb-4 sm:mb-6 text-center">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-50">
            Gestión
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Accedé rápido a los módulos principales del sistema.
          </p>
        </div>

        {/* Grid de módulos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {items.map(({ title, description, icon: Icon, path }) => (
            <button
              key={title}
              type="button"
              onClick={() => navigate(path)}
              className="
                group w-full text-left
                rounded-3xl border border-white/10 bg-slate-800/70
                backdrop-blur-xl px-4 py-4 sm:px-5 sm:py-5
                flex items-center justify-between gap-4
                shadow-[0_10px_30px_rgba(0,0,0,0.5)]
                transition
                hover:scale-[1.02] hover:bg-slate-700/70 hover:border-lime-300/40
                active:scale-[0.99]
              "
            >
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-50">
                  {title}
                </h2>
                <p className="mt-1 text-[11px] sm:text-xs text-slate-300">
                  {description}
                </p>
              </div>
              <div
                className="
                  flex items-center justify-center
                  h-10 w-10 sm:h-11 sm:w-11
                  rounded-2xl bg-slate-900/70 border border-white/10
                  group-hover:bg-lime-400/20 group-hover:border-lime-300/60
                  transition
                "
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-slate-100 group-hover:text-lime-300" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Management;
