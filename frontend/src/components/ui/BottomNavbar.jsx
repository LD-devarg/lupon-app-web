import { HomeIcon, CurrencyDollarIcon, PlusIcon, TruckIcon, Square3Stack3DIcon } from '@heroicons/react/24/solid'
import { useNavigate } from 'react-router-dom'
import Button from './Button'
import '../../styles/index.css'


export default function BottomNavbar({ onOpenModal, onOpenGestion }) {
  const navigate = useNavigate();

  return (
    <div className='fixed bottom-6 left-0 right-0 bg-neutral-300 border-t rounded-xl p-4 flex justify-around items-center h-16 z-40'>
            <Button
              className='flex flex-col mt-1 items-center w-16 text-center p-3 m-1 neuro-shadow-button'
              whileHover={{ scale: 1.2 }}
              onClick={() => navigate("/dashboard")}
            >
              <HomeIcon className='h-6 w-6 text-gray-700'/>
            </Button>
          <Button
            className='flex flex-col mt-1 items-center w-16 text-center p-3 m-1 neuro-shadow-button'
            whileHover={{ scale: 1.2 }}
            onClick={onOpenGestion}
          >
            <Square3Stack3DIcon className='h-6 w-6 text-gray-700' />
          </Button>

          <Button
            className='flex flex-col mt-1 items-center w-16 text-center p-3 m-1 neuro-shadow-button'
            whileHover={{ scale: 1.2 }}
            onClick={onOpenModal}
        >
          <PlusIcon className='h-6 w-6 text-gray-700' />
        </Button>

        <Button
          className='flex flex-col mt-1 items-center w-16 text-center p-3 m-1 neuro-shadow-button'
          whileHover={{ scale: 1.2 }}
          onClick={() => navigate("/logistica")}
        >
          <TruckIcon className='h-6 w-6 text-gray-700' />
        </Button>

        <Button
          className='flex flex-col mt-1 items-center w-16 text-center p-3 m-1 neuro-shadow-button'
          whileHover={{ scale: 1.2 }}
          onClick={() => navigate("/caja")}
        >
          <CurrencyDollarIcon className='h-6 w-6 text-gray-700'/>
        </Button>


    </div>
  );
}
