import { useState, useEffect, useCallback, useRef } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from "./server/supabase/supabase";
import { supabaseAdmin } from "./server/supabase/supabaseAdmin";
import Sidebar from "./components/common/Sidebar";
import Topbar from "./components/common/Topbar";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import InventoryEntities from "./pages/InventoryEntities";
import EntityDetails from "./pages/EntityDetails";
import Categories from "./pages/Categories";
import BarcodeCreator from "./pages/BarcodeCreator";
import Barcodes from "./pages/Barcodes";
import WarehouseDashboard from "./pages/WarehouseDashboard";
import WarehouseAnalytics from "./pages/WarehouseAnalytics";
import WarehouseStoreInsight from "./pages/WarehouseStoreInsight";
import WarehouseShipment from "./pages/WarehouseShipment";
import Customers from "./pages/Customers";
import CustomerProfile from "./pages/CustomerProfile";
import Analytics from "./pages/Analytics";
import Attendance from "./pages/Attendance";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import StoreManagement from "./pages/StoreManagement";
import CreateOrder from "./pages/CreateOrder";
import InvoiceView from "./pages/InvoiceView";
import EditOrder from "./pages/EditOrder";
import PasswordReset from "./pages/PasswordReset";
import Reminders from "./pages/Reminders";
import Notifications from "./pages/Notifications";
import { PROFILE_CACHE_KEY, logout } from "./utils/auth";

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
      let { data, error } = await supabase
        .from("auth_users")
        .select("*, store(name)")
        .eq("id", activeSession.user.id)
        .maybeSingle();

      // Ignore stale responses from older in-flight profile requests.
      if (requestId !== profileRequestRef.current) {
        return null;
      }

      if (error) {
        throw error;
      }

      // If not found in auth_users, try employees table (for employee login)
      // Use supabaseAdmin to bypass RLS policies
      if (!data) {
        console.log("Not found in auth_users, trying employees table...");
        console.log("Looking for user_id:", activeSession.user.id);
        
        let { data: employeeData, error: empError } = await supabaseAdmin
          .from("employees")
          .select("id, name, employee_id, store_id, department, role, email, phone, status, joined_on, user_id")
          .eq("user_id", activeSession.user.id)
          .maybeSingle();
        
        console.log("Employee query result:", { employeeData, empError });
        
        // Fallback to email lookup if user_id is missing
        if (!employeeData && activeSession.user.email) {
          console.log("Not found by user_id, trying email:", activeSession.user.email);
          const { data: emailData, error: emailError } = await supabaseAdmin
            .from("employees")
            .select("id, name, employee_id, store_id, department, role, email, phone, status, joined_on, user_id")
            .ilike("email", activeSession.user.email)
            .maybeSingle();
            
          if (emailData) {
            employeeData = emailData;
            // Update the user_id for future logins
            await supabaseAdmin.from("employees").update({ user_id: activeSession.user.id }).eq("id", emailData.id);
            console.log("Linked missing user_id to employee:", emailData.email);
          } else if (emailError) {
            console.error("Error querying employees by email:", emailError);
          }
        }

        if (empError) {
          console.error("Error querying employees:", empError);
        }
        
        if (employeeData) {
          // Fetch store name separately using admin client
          const { data: storeData } = await supabaseAdmin
            .from("store")
            .select("name")
            .eq("id", employeeData.store_id)
            .maybeSingle();
          
          // Map employee data to same format as auth_users
          data = {
            id: activeSession.user.id,
            email: activeSession.user.email,
            role: 'employee',
            store_id: employeeData.store_id,
            name: employeeData.name,
            phone: employeeData.phone,
            must_reset_password: employeeData.must_reset_password ?? true,
            store: storeData
          };
          console.log("Employee profile created:", data);
        }
      }

      setUserProfile(data ?? null);
      if (data) {
        writeCachedProfile(data);
      } else {
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
      if (event === "INITIAL_SESSION" && authBootstrappedRef.current) {
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
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !nextSession) {
        profileRequestRef.current += 1;
        setSession(null);
        setUserProfile(null);
        clearCachedProfile();
        setProfileResolved(true);
        setAuthLoading(false);
        return;
      }

      if (event === 'INITIAL_SESSION' && authBootstrappedRef.current) {
        return;
      }

      setTimeout(() => {
        void handleAuthStateChange(event, nextSession);
      }, 0);
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

  // Public invoice route (accessible without login)
  if (!session && window.location.pathname.startsWith('/invoice/')) {
    return (
      <Routes>
        <Route path="/invoice/:id" element={<InvoiceView userProfile={null} />} />
      </Routes>
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
  const isEmployee = role === "employee";
  const isAdminOrManager = role === "admin" || role === "super_admin" || role === "store_manager";

  if (!isEmployee && !isAdminOrManager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] p-6">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
          <h2 className="text-lg font-bold text-[#000000]">Unauthorized role</h2>
          <p className="text-sm text-gray-500 mt-2">This account role is not configured for this app.</p>
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

  const employeeRoutes = (
    <Routes>
      <Route path="/" element={<Attendance userProfile={userProfile} />} />
      <Route path="/attendance" element={<Attendance userProfile={userProfile} />} />
      <Route path="/reminders" element={<Reminders userProfile={userProfile} />} />
      <Route path="/notifications" element={<Notifications userProfile={userProfile} />} />
      <Route path="/invoice/:id" element={<InvoiceView userProfile={userProfile} />} />
      <Route path="*" element={<Navigate to="/attendance" replace />} />
    </Routes>
  );

  const adminRoutes = (
    <Routes>
      <Route path="/" element={<Dashboard userProfile={userProfile} />} />
      <Route path="/orders" element={<Orders userProfile={userProfile} />} />
      <Route path="/orders/new" element={<CreateOrder userProfile={userProfile} />} />
      <Route path="/orders/edit/:id" element={<EditOrder userProfile={userProfile} />} />
      <Route path="/inventory-entities" element={<InventoryEntities userProfile={userProfile} />} />
      <Route path="/inventory-entities/:id" element={<EntityDetails userProfile={userProfile} />} />
      <Route path="/categories" element={<Categories userProfile={userProfile} />} />
      <Route path="/barcode-creator" element={<BarcodeCreator userProfile={userProfile} />} />
      <Route path="/barcodes" element={<Barcodes userProfile={userProfile} />} />
      <Route path="/warehouse" element={<WarehouseDashboard userProfile={userProfile} />} />
      <Route path="/warehouse/analytics" element={<WarehouseAnalytics userProfile={userProfile} />} />
      <Route path="/warehouse/store" element={<WarehouseStoreInsight userProfile={userProfile} />} />
      <Route path="/warehouse/shipment" element={<WarehouseShipment userProfile={userProfile} />} />
      <Route path="/customers" element={<Customers userProfile={userProfile} />} />
      <Route path="/customers/:id" element={<CustomerProfile userProfile={userProfile} />} />
      <Route path="/analytics" element={<Analytics userProfile={userProfile} />} />
      <Route path="/attendance" element={<Attendance userProfile={userProfile} />} />
      <Route path="/reminders" element={<Reminders userProfile={userProfile} />} />
      <Route path="/notifications" element={<Notifications userProfile={userProfile} />} />
      <Route path="/store-management" element={<StoreManagement userProfile={userProfile} />} />
      <Route path="/settings" element={<Settings userProfile={userProfile} />} />
      <Route path="/invoice/:id" element={<InvoiceView userProfile={userProfile} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  const isBoardPath = location.pathname === "/reminders" || location.pathname === "/notifications";

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FB] font-sans relative">
      {/* Mobile Overlay */}
      {!sidebarCollapsed && isMobile && (
        <div
          className="fixed inset-0 bg-[#000000]/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar Wrapper */}
      <div className={`fixed inset-y-0 left-0 z-50 transform md:relative md:translate-x-0 transition-all duration-300 flex-shrink-0 ${isMobile
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



