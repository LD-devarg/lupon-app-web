import { useState } from "react";
import { useNavigate } from "react-router-dom";   // <- ACA
import BottomNav from "../components/BottomNav";
import Header from "../components/Header";
import ActionModal from "../components/ActionModal";
import NewContactModal from "../components/NewContactModal";
import fondo from "../assets/fondo.png";

function MobileLayout({ children }) {
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [isNewContact, setIsNewContact] = useState(false);
  const navigate = useNavigate();                // <- ACA

  const handlePlusClick = () => {
    setIsActionOpen(true);
  };

  const handleCloseModal = () => {
    setIsActionOpen(false);
  };

  const handleSelectAction = (action) => {
    setIsActionOpen(false);

    switch (action) {
      case "sell-order":
        navigate("/orders/new");
        break;
      case "sell":
        navigate("/sales/new");     // más adelante la armás
        break;
      case "expense":
        navigate("/expenses/new");
        break;
      case "contact":
        setIsNewContact(true);  // o la que definas
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-100 flex flex-col bg-cover bg-center"
      style={{ backgroundImage: `url(${fondo})` }}
    >
      <Header />

      <main className="flex-1 overflow-y-auto pb-20 px-4 pt-4 flex flex-col gap-4">
        {children}
      </main>

      <BottomNav onPlusClick={handlePlusClick} />

      <ActionModal
        open={isActionOpen}
        onClose={handleCloseModal}
        onSelect={handleSelectAction}
      />
      <NewContactModal
        open={isNewContact}
        onClose={() => setIsNewContact(false)}
      />
    </div>
  );
}

export default MobileLayout;
