import { Routes, Route } from "react-router-dom";
import MobileLayout from "./layouts/MobileLayout";
import Home from "./pages/Home";
import Cash from "./pages/Cash";
import Contacts from "./pages/Contacts";
import Profile from "./pages/Profile";
import NewOrder from "./pages/NewSellOrder";
import Management from "./pages/Management";
import Sells from "./pages/Sells";
import Products from "./pages/Products";
import Purchases from "./pages/Purchases";
import Orders from "./pages/Orders";
import EditContact from "./pages/EditContact";


function App() {
  return (
    <MobileLayout>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cash" element={<Cash />} />
      <Route path="/contacts" element={<Contacts />} />
      <Route path="/contacts/edit/:id" element={<EditContact />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/orders/new" element={<NewOrder />} />
      <Route path="/management" element={<Management />} />
      <Route path="/sells" element={<Sells />} />
      <Route path="/products" element={<Products />} />
      <Route path="/purchases" element={<Purchases />} />
      <Route path="/orders" element={<Orders />} />
    </Routes>
    </MobileLayout>
  );
}

export default App;