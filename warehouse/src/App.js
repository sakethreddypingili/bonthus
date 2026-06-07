import { useState, useEffect, useCallback, useRef } from"react";
import { Routes, Route, Navigate, useLocation } from"react-router-dom";
import { supabase } from"./server/supabase/supabase";
import Sidebar from"./components/common/Sidebar";
import Topbar from"./components/common/Topbar";
import ProductList from"./pages/ProductList";
import EntityDetails from"./pages/EntityDetails";
import Attendance from"./pages/Attendance";
import Settings from"./pages/Settings";
import Login from"./pages/Login";
import PasswordReset from"./pages/PasswordReset";
import Reminders from"./pages/Reminders";
import Notifications from"./pages/Notifications";
import Dashboard from"./pages/Dashboard";
import Categories from"./pages/Categories";
import Barcodes from"./pages/Barcodes";
import BarcodeCreator from"./pages/BarcodeCreator";
import Analytics from"./pages/Analytics";
import StoreIntelligence from"./pages/StoreIntelligence";
import Shipments from"./pages/Shipments";
import ShipmentOverview from"./pages/ShipmentOverview";
import Vendors from"./pages/Vendors";
import Provisioning from"./pages/Provisioning";
import { PROFILE_CACHE_KEY, logout } from"./utils/auth";

function App() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileResolved, setProfileResolved] = useState(false);
  const profileRequestRef = useRef(0);
  const authBootstrappedRef = useRef(false);

  const readCachedProfile = useCallback((userId) => {
    try {
      const raw = localStorage.getItem(PROFILE_CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached || cached.id !== userId) return null;
      return cached;
    } catch {
      return null;
    }
  }, []);

  const writeCachedProfile = useCallback((profile) => {
    try {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage write failures (private mode / quota).
    }
  }, []);

  const clearCachedProfile = useCallback(() => {
    try {
      localStorage.removeItem(PROFILE_CACHE_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--app-topbar-offset', '4.5rem');
    root.style.setProperty(
      '--app-sidebar-offset',
      isMobile ? '0px' : sidebarCollapsed ? '66px' : '14rem'
    );
    return () => {
      root.style.removeProperty('--app-topbar-offset');
      root.style.removeProperty('--app-sidebar-offset');
    };
  }, [isMobile, sidebarCollapsed]);

  const fetchProfile = useCallback(async (activeSession, options = {}) => {
    const requestId = ++profileRequestRef.current;
    const preserveExistingProfile = options.preserveExistingProfile === true;

    if (!activeSession?.user) {
      setUserProfile(null);
      setProfileResolved(true);
      return null;
    }

    try {
      // 1. Primary Lookup: Try matching public.users.id with Auth UID
      let { data, error } = await supabase
        .from("users")
        .select("*, store:stores(name)")
        .eq("id", activeSession.user.id)
        .maybeSingle();

      // 2. Secondary Lookup: Try matching by email if ID match fails
      if (!data && activeSession.user.email) {
        const { data: emailMatch } = await supabase
          .from("users")
          .select("*, store:stores(name)")
          .ilike("email", activeSession.user.email)
          .maybeSingle();
        
        if (emailMatch) {
          data = emailMatch;
        }
      }

      // Ignore stale responses from older in-flight profile requests.
      if (requestId !== profileRequestRef.current) {
        return null;
      }

      if (error) {
        throw error;
      }

      if (data) {
        setUserProfile(data);
        writeCachedProfile(data);
      } else {
        console.error("Unauthorized: No profile found for", activeSession.user.email);
        setUserProfile(null);
        clearCachedProfile();
      }
      return data ?? null;
    } catch (err) {
      if (requestId !== profileRequestRef.current) {
        return null;
      }

      console.error("Error fetching profile:", err.message || err);
      if (!preserveExistingProfile) {
        setUserProfile(null);
      }
      return null;
    } finally {
      if (requestId === profileRequestRef.current) {
        setProfileResolved(true);
      }
    }
  }, [clearCachedProfile, writeCachedProfile]);

  useEffect(() => {
    let isMounted = true;

    const applySession = async (nextSession) => {
      if (!isMounted) return;

      setSession(nextSession);

      if (!nextSession?.user) {
        profileRequestRef.current += 1;
        setUserProfile(null);
        clearCachedProfile();
        setProfileResolved(true);
        return;
      }

      const cachedProfile = readCachedProfile(nextSession.user.id);
      if (cachedProfile) {
        setUserProfile(cachedProfile);
        setProfileResolved(true);
        void fetchProfile(nextSession, { preserveExistingProfile: true });
        return;
      }

      setProfileResolved(false);
      await fetchProfile(nextSession);
    };

    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!isMounted) return;
        await applySession(initialSession);
      } catch (err) {
        if (!isMounted) return;
        console.error("Session fetch failed:", err.message || err);
        setSession(null);
        profileRequestRef.current += 1;
        setUserProfile(null);
        clearCachedProfile();
        setProfileResolved(true);
      } finally {
        if (isMounted) {
          authBootstrappedRef.current = true;
          setAuthLoading(false);
        }
      }
    };

    initializeAuth();

    const handleAuthStateChange = async (event, nextSession) => {
      if (!isMounted) return;

      // Initial session is already handled by getSession during bootstrap.
      if (event ==="INITIAL_SESSION" && authBootstrappedRef.current) {
        return;
      }

      await applySession(nextSession);

      if (!authBootstrappedRef.current) {
        authBootstrappedRef.current = true;
        setAuthLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      void handleAuthStateChange(event, nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearCachedProfile, fetchProfile, readCachedProfile]);

  const handleLogout = useCallback(async () => {
    profileRequestRef.current += 1;
    authBootstrappedRef.current = true;
    setSession(null);
    setUserProfile(null);
    setProfileResolved(true);
    setAuthLoading(false);
    clearCachedProfile();
    await logout();
  }, [clearCachedProfile]);

  if (authLoading || (session && !profileResolved)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[#000000] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm font-semibold">Loading your workspace...</p>
        </div>
      </div>
    );
  }



  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  // Never render a workspace until profile resolution is complete.
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] p-6">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
          <h2 className="text-lg font-bold text-[#000000]">Unable to load account profile</h2>
          <p className="text-sm text-gray-500 mt-2">Please sign in again to continue.</p>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-5 px-4 py-2 rounded-lg bg-[#000000] text-white text-sm font-semibold"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // Mandatory Password Reset
  if (userProfile?.must_reset_password === true) {
    return <PasswordReset userProfile={userProfile} onPasswordReset={() => fetchProfile(session)} />;
  }

  const role = userProfile?.role;
  const isEmployee = role === "sales" || role === "optometrist" || role === "employee";
  const isAdminOrManager = role === "admin" || role === "manager" || role === "super_admin" || role === "store_manager";

  if (!isEmployee && !isAdminOrManager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] p-6">
        <div className="max-w-md w-full bg-white border border-gray-100 rounded-3xl p-10 text-center shadow-sm">
          <h2 className="text-xl font-black text-black uppercase tracking-tighter">Unauthorized Identity</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4 leading-relaxed">
            This account role is not registered for the warehouse operations dashboard.
          </p>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-8 px-10 py-4 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }


  const employeeRoutes = (
    <Routes>
      <Route path="/" element={<Attendance userProfile={userProfile} />} />
      <Route path="/attendance" element={<Attendance userProfile={userProfile} />} />
      <Route path="/reminders" element={<Reminders userProfile={userProfile} />} />
      <Route path="/notifications" element={<Notifications userProfile={userProfile} />} />
      <Route path="*" element={<Navigate to="/attendance" replace />} />
    </Routes>
  );

  const adminRoutes = (
    <Routes>
      <Route path="/" element={<Dashboard userProfile={userProfile} />} />
      <Route path="/products" element={<ProductList userProfile={userProfile} />} />
      <Route path="/products/:id" element={<EntityDetails userProfile={userProfile} />} />
      <Route path="/analytics" element={<Analytics userProfile={userProfile} />} />
      <Route path="/store-intelligence" element={<StoreIntelligence userProfile={userProfile} />} />
      <Route path="/shipments" element={<Shipments userProfile={userProfile} />} />
      <Route path="/shipment-overview" element={<ShipmentOverview userProfile={userProfile} />} />
      <Route path="/provisioning" element={<Provisioning userProfile={userProfile} />} />
      <Route path="/vendors" element={<Vendors userProfile={userProfile} />} />
      <Route path="/requests" element={<StoreIntelligence userProfile={userProfile} />} />
      <Route path="/barcode-creator" element={<BarcodeCreator userProfile={userProfile} />} />
      <Route path="/categories" element={<Categories userProfile={userProfile} />} />
      <Route path="/barcodes" element={<Barcodes userProfile={userProfile} />} />
      <Route path="/attendance" element={<Attendance userProfile={userProfile} />} />
      <Route path="/reminders" element={<Reminders userProfile={userProfile} />} />
      <Route path="/notifications" element={<Notifications userProfile={userProfile} />} />
      <Route path="/settings" element={<Settings userProfile={userProfile} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  const isBoardPath = location.pathname ==="/reminders" || location.pathname ==="/notifications";

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FB] font-sans relative">
      {/* Mobile Overlay */}
      {!sidebarCollapsed && isMobile && (
        <div
          className="fixed inset-0 bg-[#000000]/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar Wrapper */}
      <div className={`fixed inset-y-0 left-0 z-50 transform md:relative md:translate-x-0 transition-all duration-150 flex-shrink-0 ${isMobile
        ? (sidebarCollapsed ? '-translate-x-full w-64' : 'translate-x-0 w-64')
        : (sidebarCollapsed ? 'w-[66px]' : 'w-56')
        } h-full`}>
        <Sidebar
          collapsed={sidebarCollapsed && !isMobile}
          setCollapsed={setSidebarCollapsed}
          userProfile={userProfile}
          isMobile={isMobile}
          onLogout={handleLogout}
        />
      </div>


      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          userProfile={userProfile}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {isEmployee ? employeeRoutes : adminRoutes}
        </main>
      </div>
    </div>
  );
}

export default App;



