import React, { useState } from 'react';
import { useUser } from './context/UserContext';
import RegistrationForm from './components/RegistrationForm';
import HomeScreen from './components/HomeScreen';
import SuccessView from './components/SuccessView';
import BackendPortal from './components/BackendPortal';
import { LogoutIcon } from './components/icons';

const App: React.FC = () => {
  const { user, setUser } = useUser();
  const [showBackendPortal, setShowBackendPortal] = useState(false);

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
        <div className="absolute top-6 right-6 z-20 flex items-center space-x-4">
          <button
            onClick={() => setShowBackendPortal(true)}
            className="flex items-center space-x-2 text-[#FFD700] hover:text-white transition-colors duration-300 font-semibold"
            aria-label="Backend Portal"
          >
            <span>Admin</span>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-[#FFD700] hover:text-white transition-colors duration-300 font-semibold"
            aria-label="Logout"
          >
            <span>Logout</span>
            <LogoutIcon className="w-6 h-6" />
          </button>
        </div>
      )}
      
      <header className="mb-8 text-center relative z-10">
        <h1 className="text-4xl font-bold text-[#FF0000] tracking-tight font-serif">Shree Cauvery Refreshments</h1>
        <p className="text-lg text-[#FF0000] mt-2">Sales Conference 2025</p>
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

      {showBackendPortal && (
        <BackendPortal onClose={() => setShowBackendPortal(false)} />
      )}
    </div>
  );
};

export default App;
