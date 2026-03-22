import { HomeIcon, CurrencyDollarIcon, PlusIcon, TruckIcon, Square3Stack3DIcon } from '@heroicons/react/24/solid'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from './Button'
import '../../styles/index.css'


export default function BottomNavbar({ onOpenModal, onOpenGestion }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";

  return (
    <div className={isDashboard ? 'fixed bottom-2 left-3 right-3 rounded-2xl border border-white/20 bg-neutral-300/90 px-3 py-2 flex justify-around items-center h-14 z-40 backdrop-blur' : 'fixed bottom-6 left-0 right-0 bg-neutral-300 border-t rounded-xl p-4 flex justify-around items-center h-16 z-40'}>
            <Button
              className={isDashboard ? 'flex flex-col items-center w-12 text-center p-2 m-0.5 neuro-shadow-button' : 'flex flex-col mt-1 items-center w-16 text-center p-3 m-1 neuro-shadow-button'}
              whileHover={{ scale: isDashboard ? 1.08 : 1.2 }}
              onClick={() => navigate("/dashboard")}
            >
              <HomeIcon className={isDashboard ? 'h-5 w-5 text-gray-700' : 'h-6 w-6 text-gray-700'}/>
            </Button>
          <Button
            className={isDashboard ? 'flex flex-col items-center w-12 text-center p-2 m-0.5 neuro-shadow-button' : 'flex flex-col mt-1 items-center w-16 text-center p-3 m-1 neuro-shadow-button'}
            whileHover={{ scale: isDashboard ? 1.08 : 1.2 }}
            onClick={onOpenGestion}
          >
            <Square3Stack3DIcon className={isDashboard ? 'h-5 w-5 text-gray-700' : 'h-6 w-6 text-gray-700'} />
          </Button>

          <Button
            className={isDashboard ? 'flex flex-col items-center w-12 text-center p-2 m-0.5 neuro-shadow-button' : 'flex flex-col mt-1 items-center w-16 text-center p-3 m-1 neuro-shadow-button'}
            whileHover={{ scale: isDashboard ? 1.08 : 1.2 }}
            onClick={onOpenModal}
        >
          <PlusIcon className={isDashboard ? 'h-5 w-5 text-gray-700' : 'h-6 w-6 text-gray-700'} />
        </Button>

        <Button
          className={isDashboard ? 'flex flex-col items-center w-12 text-center p-2 m-0.5 neuro-shadow-button' : 'flex flex-col mt-1 items-center w-16 text-center p-3 m-1 neuro-shadow-button'}
          whileHover={{ scale: isDashboard ? 1.08 : 1.2 }}
          onClick={() => navigate("/logistica")}
        >
          <TruckIcon className={isDashboard ? 'h-5 w-5 text-gray-700' : 'h-6 w-6 text-gray-700'} />
        </Button>

        <Button
          className={isDashboard ? 'flex flex-col items-center w-12 text-center p-2 m-0.5 neuro-shadow-button' : 'flex flex-col mt-1 items-center w-16 text-center p-3 m-1 neuro-shadow-button'}
          whileHover={{ scale: isDashboard ? 1.08 : 1.2 }}
          onClick={() => navigate("/caja")}
        >
          <CurrencyDollarIcon className={isDashboard ? 'h-5 w-5 text-gray-700' : 'h-6 w-6 text-gray-700'}/>
        </Button>


    </div>
  );
}
