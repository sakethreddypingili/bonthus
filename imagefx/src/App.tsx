import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from './utils/supabase';
import { TopBar } from './components/TopBar';
import { MainPage } from './pages/MainPage';
import { HistoryPage } from './pages/HistoryPage';
import { Login } from './pages/Login';
import './App.css';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="text-xs uppercase tracking-widest font-mono font-semibold text-gray-400">
          Bootstrapping…
        </span>
      </div>
    );
  }

  if (!session) {
    return <Login onSignIn={(s) => setSession(s)} />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <TopBar
        userEmail={session.user?.email}
        onSignOut={() => setSession(null)}
      />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
