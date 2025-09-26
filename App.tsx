import React from 'react';
import { useUser } from './context/UserContext';
import RegistrationForm from './components/RegistrationForm';
import HomeScreen from './components/HomeScreen';
import SuccessView from './components/SuccessView';
import { LogoutIcon } from './components/icons';

const App: React.FC = () => {
  const { user, setUser } = useUser();

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 font-sans transition-colors duration-500 relative overflow-hidden ${user ? 'bg-gradient-to-br from-[#2C1E3A] to-[#3D2F2F]' : 'bg-gradient-to-br from-gray-50 to-gray-200'}`}>
      <div className="mandala-corner mandala-top-left"></div>
      <div className="mandala-corner mandala-top-right"></div>
      <div className="mandala-corner mandala-bottom-left"></div>
      <div className="mandala-corner mandala-bottom-right"></div>
      
      {user && (
        <button
          onClick={handleLogout}
          className="absolute top-6 right-6 z-20 flex items-center space-x-2 text-[#FFD700] hover:text-white transition-colors duration-300 font-semibold"
          aria-label="Logout"
        >
          <span>Logout</span>
          <LogoutIcon className="w-6 h-6" />
        </button>
      )}
      
      <header className="mb-8 text-center relative z-10">
        <h1 className="text-4xl font-bold text-[#FFF5E6] tracking-tight font-serif">Shree Cauvery Refreshments</h1>
        <p className="text-lg text-[#FFD700] mt-2">Sales Conference 2024</p>
      </header>
      
      <main className="w-full max-w-6xl transition-all duration-500 relative z-10">
        {user ? <HomeScreen /> : 
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <RegistrationForm />
          </div>
        }
      </main>

      <footer className="mt-8 text-center text-[#FFF5E6]/70 text-sm relative z-10">
        <p>&copy; {new Date().getFullYear()} Shree Cauvery Refreshments. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;