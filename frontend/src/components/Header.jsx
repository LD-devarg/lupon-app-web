import logo from '../assets/logo-lupon.png';

function Header() {
    return (
    <header className="h-12 bg-slate-900 text-slate-100 flex items-center justify-center px-4">
        <a href="./pages/home"><img src={logo} alt="Logo Lupon" className='h-10' /></a>
      </header>
    );
}

export default Header;