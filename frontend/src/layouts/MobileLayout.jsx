import { useState } from "react";
import { useLocation } from "react-router-dom";
import BottomNavbar from "../components/ui/BottomNavbar";
import ModalAgregar from "../components/layout/ModalAgregar";
import ModalGestion from "../components/layout/ModalGestion";
import Logo from "../assets/logo-lupon.png";

export default function MobileLayout({ children }) {
  const location = useLocation();
  const hideNav = location.pathname === "/" || location.pathname === "/login" || location.pathname === "/register";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGestionOpen, setIsGestionOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-300">
        <header className="flex items-center justify-center p-1 shadow-md bg-gray-700">
            <h1><img className="h-12 w-12" src={Logo} alt="Lupon Logo" /></h1>
        </header>

        <main className="flex-1 pb-24">
            {children}
        </main>

        {!hideNav ? (
          <>
            <BottomNavbar
              onOpenModal={() => setIsModalOpen(true)}
              onOpenGestion={() => setIsGestionOpen(true)}
            />
            <ModalAgregar
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
            />
            <ModalGestion
              isOpen={isGestionOpen}
              onClose={() => setIsGestionOpen(false)}
            />
            <div className="fixed bottom-0 left-0 right-0 z-30 flex h-6 items-center justify-center bg-neutral-300 text-[10px] text-gray-600">
              Desarrollado por LD.dev
            </div>
          </>
        ) : null}
    </div>
  );
}
