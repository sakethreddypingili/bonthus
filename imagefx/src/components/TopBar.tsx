import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, History, Search } from 'lucide-react';
import { supabase } from '../utils/supabase';
import logoImg from '../assets/logo.webp';

interface TopBarProps {
  userEmail: string | undefined;
  onSignOut: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  userEmail,
  onSignOut,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHistory = location.pathname === '/history';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  return (
    <header className="top-bar">
      {/* Left — Brand */}
      <div className="top-bar-brand cursor-pointer" onClick={() => navigate('/')}>
        <img src={logoImg} alt="ImageFX Logo" className="top-bar-logo" />
      </div>

      {/* Middle — Spacer / Push buttons to right */}
      <div className="flex-1" />

      {/* Navigation Buttons & User Info */}
      <div className="top-bar-user">
        {isHistory ? (
          <Link to="/" className="btn btn-ghost flex items-center gap-1.5" style={{ height: 34 }}>
            <Search className="w-3.5 h-3.5" />
            Search
          </Link>
        ) : (
          <Link to="/history" className="btn btn-ghost flex items-center gap-1.5" style={{ height: 34 }}>
            <History className="w-3.5 h-3.5" />
            History
          </Link>
        )}

        {userEmail && (
          <div className="top-bar-user-pill">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <span className="top-bar-user-email">{userEmail}</span>
          </div>
        )}
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="top-bar-logout-btn"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>
    </header>
  );
};
