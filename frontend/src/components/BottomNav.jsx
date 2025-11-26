import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  PlusIcon,
  CurrencyDollarIcon,
  CircleStackIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

function BottomNav({ onPlusClick }) {
  const location = useLocation();
  const path = location.pathname;

  const isActive = (to) =>
    path === to ? "text-sky-500" : "text-gray-500";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16">
      <ul className="flex items-center h-full">
        <li className="flex-1">
          <Link
            to="/"
            className={`flex flex-col items-center text-xs ${isActive("/")}`}
          >
            <HomeIcon className="h-6 w-6 mb-0.5" />
            Inicio
          </Link>
        </li>

        <li className="flex-1">
          <Link
            to="/caja"
            className={`flex flex-col items-center text-xs ${isActive("/caja")}`}
          >
            <CurrencyDollarIcon className="h-6 w-6 mb-0.5" />
            Caja
          </Link>
        </li>

        <li className="flex-1 relative flex justify-center">
          <button
            type="button"
            onClick={onPlusClick}
            className="bg-sky-500 text-white h-20 w-20 rounded-full flex items-center justify-center border-4 border-white shadow-xl -mt-8 active:scale-95 transition-transform"
          >
            <PlusIcon className="h-10 w-10" />
          </button>
        </li>

        <li className="flex-1">
          <Link
            to="/management"
            className={`flex flex-col items-center text-xs ${isActive("/management")}`}
          >
            <CircleStackIcon className="h-6 w-6 mb-0.5" />
            Gestión
          </Link>
        </li>

        <li className="flex-1">
          <Link
            to="/perfil"
            className={`flex flex-col items-center text-xs ${isActive("/perfil")}`}
          >
            <UserIcon className="h-6 w-6 mb-0.5" />
            Perfil
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export default BottomNav;
