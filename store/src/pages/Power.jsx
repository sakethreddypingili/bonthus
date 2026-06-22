import { useState, useRef, Fragment, useEffect } from "react";
import { supabase } from "../server/supabase/supabase";
import { Search, Plus, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import SlideDrawer from "../components/common/SlideDrawer";
import { useForm, useController } from "react-hook-form";


const formatDiopter = (val) => {
  if (!val) return "";
  let clean = val.trim();
  if (clean.toLowerCase() === "pl" || clean.toLowerCase() === "plano") return "Plano";
  
  let sign = "+";
  if (clean.startsWith("-")) {
    sign = "-";
    clean = clean.substring(1);
  } else if (clean.startsWith("+")) {
    sign = "+";
    clean = clean.substring(1);
  }

  const numVal = parseFloat(clean);
  if (isNaN(numVal)) return val;

  let formattedNum = numVal;
  if (numVal === 25) formattedNum = 0.25;
  else if (numVal === 5 || numVal === 50) formattedNum = 0.50;
  else if (numVal === 75) formattedNum = 0.75;
  else if (numVal === 125) formattedNum = 1.25;
  else if (numVal === 150) formattedNum = 1.50;
  else if (numVal === 175) formattedNum = 1.75;
  else if (numVal === 225) formattedNum = 2.25;
  else if (numVal === 250) formattedNum = 2.50;
  else if (numVal === 275) formattedNum = 2.75;
  else if (numVal === 325) formattedNum = 3.25;
  else if (numVal === 350) formattedNum = 3.50;
  else if (numVal === 375) formattedNum = 3.75;

  const finalStr = formattedNum.toFixed(2);
  return finalStr === "0.00" ? "Plano" : `${sign}${finalStr}`;
};

const calculateNearSphVal = (sphVal, addVal) => {
  const isNonEmpty = (v) => v != null && String(v).trim() !== "";
  if (!isNonEmpty(sphVal) && !isNonEmpty(addVal)) return "";
  
  const sRaw = String(sphVal || "").trim().toUpperCase();
  const aRaw = String(addVal || "").trim().toUpperCase();
  
  const s = (!sRaw || sRaw === "PL" || sRaw === "PLANO") ? 0 : (parseFloat(sRaw) || 0);
  const a = (!aRaw || aRaw === "PL" || aRaw === "PLANO") ? 0 : (parseFloat(aRaw) || 0);
  
  const sum = s + a;
  if (sum === 0) return "Plano";
  return (sum > 0 ? "+" : "") + sum.toFixed(2);
};

const calculateAddVal = (sphVal, nearSphVal) => {
  const isNonEmpty = (v) => v != null && String(v).trim() !== "";
  if (!isNonEmpty(sphVal) && !isNonEmpty(nearSphVal)) return "";
  
  const sRaw = String(sphVal || "").trim().toUpperCase();
  const nRaw = String(nearSphVal || "").trim().toUpperCase();
  
  const s = (!sRaw || sRaw === "PL" || sRaw === "PLANO") ? 0 : (parseFloat(sRaw) || 0);
  const n = (!nRaw || nRaw === "PL" || nRaw === "PLANO") ? 0 : (parseFloat(nRaw) || 0);
  
  if (isNaN(s) || isNaN(n)) return "";
  const diff = n - s;
  if (diff === 0) return "Plano";
  return (diff > 0 ? "+" : "") + diff.toFixed(2);
};

function SmartPowerInput({ name, control, tabIndex, placeholder = "0.00", onBlurCallback }) {
  const {
    field: { value, onChange, onBlur, ref },
  } = useController({
    name,
    control,
    defaultValue: "",
  });

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleSign = (forceSign = null) => {
    let current = String(value || "").trim();
    if (!current || current.toLowerCase() === "plano") {
      onChange(forceSign === "-" ? "-0.25" : "+0.25");
      return;
    }
    if (current.startsWith("-")) {
      onChange("+" + current.substring(1));
    } else if (current.startsWith("+")) {
      onChange("-" + current.substring(1));
    } else {
      onChange("-" + current);
    }
  };

  const adjustStep = (step) => {
    let current = String(value || "").trim();
    let num = 0;

    if (current.toLowerCase() === "plano") {
      num = 0;
    } else {
      if (current.startsWith("-")) {
        num = -parseFloat(current.substring(1));
      } else if (current.startsWith("+")) {
        num = parseFloat(current.substring(1));
      } else {
        num = parseFloat(current);
      }
    }
    if (isNaN(num)) num = 0;

    let next = num + step;
    if (next === 0) {
      onChange("Plano");
    } else {
      const fixed = Math.abs(next).toFixed(2);
      onChange((next > 0 ? "+" : "-") + fixed);
    }
  };

  const handleBlur = () => {
    onBlur();
    const formatted = formatDiopter(value);
    onChange(formatted);
    if (onBlurCallback) {
      onBlurCallback(formatted);
    }
  };

  const suggestions = [
    "Plano", "+0.25", "+0.50", "+0.75", "+1.00", "+1.25", "+1.50", "+1.75", "+2.00",
    "-0.25", "-0.50", "-0.75", "-1.00", "-1.25", "-1.50", "-1.75", "-2.00"
  ];

  const displaySign = String(value || "").startsWith("-") ? "-" : "+";

  return (
    <div className="relative w-full max-w-[180px]" ref={containerRef}>
      <div className="flex items-center shadow-sm rounded-xl overflow-hidden border border-neutral-200 bg-white focus-within:ring-2 focus-within:ring-black focus-within:border-black transition-all">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => toggleSign()}
          className="px-3 py-3 text-xs font-black bg-neutral-100 hover:bg-neutral-200 border-r border-neutral-200 text-black transition-colors"
        >
          {displaySign}
        </button>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "+" || e.key === "-") {
              e.preventDefault();
              toggleSign(e.key);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              adjustStep(0.25);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              adjustStep(-0.25);
            }
          }}
          tabIndex={tabIndex}
          placeholder={placeholder}
          className="w-full px-3 py-3 text-xs font-black font-mono text-black focus:outline-none bg-transparent"
        />
      </div>

      {isOpen && (
        <div className="absolute z-[999] left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-xl">
          {suggestions
            .filter((s) => s.toLowerCase().includes(String(value || "").toLowerCase()))
            .map((sug) => (
              <button
                key={sug}
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(sug);
                  setIsOpen(false);
                  if (onBlurCallback) {
                    onBlurCallback(sug);
                  }
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-mono font-bold text-black hover:bg-neutral-50 border-b border-neutral-100 last:border-0"
              >
                {sug}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default function Power({ userProfile }) {
  const [phone, setPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRegForm, setShowRegForm] = useState(false);
  const [regForm, setRegForm] = useState({
    name: "",
    phone: "",
    email: "",
    street: "",
    town: "",
    district: "",
    state: "",
    postal_code: "",
    age: ""
  });
  const [notification, setNotification] = useState(null);

  // Save Confirmation Dialog States
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [discrepancyCheck, setDiscrepancyCheck] = useState(null);

  // Recent power history list for default view
  const [recentPowers, setRecentPowers] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);



  // Prescription Form State (React Hook Form)
  const [activeStep, setActiveStep] = useState(1);

  const { register, control, handleSubmit: handleFormSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      samePower: false,
      hasCyl: false,
      hasNear: false,
      isProgressive: false,
      hasPrism: false,
      re: { sph: "", cyl: "", axis: "", add: "" },
      le: { sph: "", cyl: "", axis: "", add: "" },
      nv_re: { sph: "", cyl: "", axis: "", add: "" },
      nv_le: { sph: "", cyl: "", axis: "", add: "" },
      acuity: {
        distRe: "6/6",
        distLe: "6/6",
        distOu: "6/6",
        nearRe: "N6",
        nearLe: "N6",
        nearOu: "N6"
      },
      pd: {
        type: "single",
        single: "",
        re: "",
        le: ""
      },
      prism: {
        re: { power: "", base: "" },
        le: { power: "", base: "" }
      },
      vd: "",
      panto: "",
      wrap: "",
      fh: {
        re: "",
        le: ""
      },
      pb: {
        re: "",
        le: ""
      },
      a_size: {
        re: "",
        le: ""
      },
      b_size: {
        re: "",
        le: ""
      },
      notes: ""
    }
  });

  const samePower = watch("samePower");
  const hasCyl = watch("hasCyl");
  const hasNear = watch("hasNear");
  const isProgressive = watch("isProgressive");
  const hasPrism = watch("hasPrism");

  const reSph = watch("re.sph");
  const reCyl = watch("re.cyl");
  const reAdd = watch("re.add");
  const reAxis = watch("re.axis");

  const nvReSph = watch("nv_re.sph");
  const nvReCyl = watch("nv_re.cyl");
  const nvReAxis = watch("nv_re.axis");
  const nvReAdd = watch("nv_re.add");

  useEffect(() => {
    if (samePower) {
      setValue("le.sph", reSph);
    }
  }, [reSph, samePower, setValue]);

  useEffect(() => {
    if (samePower) {
      setValue("le.cyl", reCyl);
    }
  }, [reCyl, samePower, setValue]);

  useEffect(() => {
    if (samePower) {
      setValue("le.axis", reAxis);
    }
  }, [reAxis, samePower, setValue]);

  useEffect(() => {
    if (samePower) {
      setValue("le.add", reAdd);
    }
  }, [reAdd, samePower, setValue]);

  useEffect(() => {
    if (samePower) {
      setValue("nv_le.sph", nvReSph);
    }
  }, [nvReSph, samePower, setValue]);

  useEffect(() => {
    if (samePower) {
      setValue("nv_le.cyl", nvReCyl);
    }
  }, [nvReCyl, samePower, setValue]);

  useEffect(() => {
    if (samePower) {
      setValue("nv_le.axis", nvReAxis);
    }
  }, [nvReAxis, samePower, setValue]);

  useEffect(() => {
    if (samePower) {
      setValue("nv_le.add", nvReAdd);
    }
  }, [nvReAdd, samePower, setValue]);

  useEffect(() => {
    const calculated = calculateNearSphVal(reSph || "", nvReAdd || "");
    if (calculated) {
      setValue("nv_re.sph", calculated);
    }
  }, [reSph, nvReAdd, setValue]);

  const leSphVal = watch("le.sph");
  const nvLeAddVal = watch("nv_le.add");
  useEffect(() => {
    const calculated = calculateNearSphVal(leSphVal || "", nvLeAddVal || "");
    if (calculated) {
      setValue("nv_le.sph", calculated);
    }
  }, [leSphVal, nvLeAddVal, setValue]);

  const handleTranspose = (eyeKey) => {
    const sphVal = watch(`${eyeKey}.sph`);
    const cylVal = watch(`${eyeKey}.cyl`);
    const axisVal = watch(`${eyeKey}.axis`);

    const s = parseFloat(sphVal) || 0;
    const c = parseFloat(cylVal) || 0;
    let a = parseInt(axisVal, 10) || 0;

    const newSph = s + c;
    const newCyl = -c;
    let newAxis = a + 90;
    if (newAxis > 180) {
      newAxis -= 180;
    }

    const formattedSph = newSph === 0 ? "Plano" : (newSph > 0 ? "+" : "") + newSph.toFixed(2);
    const formattedCyl = newCyl === 0 ? "Plano" : (newCyl > 0 ? "+" : "") + newCyl.toFixed(2);

    setValue(`${eyeKey}.sph`, formattedSph);
    setValue(`${eyeKey}.cyl`, formattedCyl);
    setValue(`${eyeKey}.axis`, newAxis.toString());
  };

  const getLogmar = (snellen) => {
    const mapping = {
      "6/4": "-0.18",
      "6/5": "-0.08",
      "6/6": "0.00",
      "6/9": "0.18",
      "6/12": "0.30",
      "6/18": "0.48",
      "6/24": "0.60",
      "6/36": "0.78",
      "6/60": "1.00"
    };
    return mapping[snellen] || "0.00";
  };

  const getPrescriptionDisplay = (pow) => {
    let notesText = pow.notes || "";
    let add = pow.re_add || pow.le_add;
    let fh = pow.re_fh || pow.le_fh;
    let pb = pow.re_pb || pow.le_pb;
    let a_size = pow.re_a_size || pow.le_a_size;
    let b_size = pow.re_b_size || pow.le_b_size;

    // Fallback to parse JSON from legacy notes if needed
    if (!add && !fh && !pb && !a_size && !b_size && notesText.startsWith("{")) {
      try {
        const parsed = JSON.parse(notesText);
        notesText = parsed.notes || "";
        const extra = parsed.extra || {};
        add = extra.re_add || extra.le_add;
        fh = extra.re_fh || extra.le_fh;
        pb = extra.re_pb || extra.le_pb;
        a_size = extra.re_a_size || extra.le_a_size;
        b_size = extra.re_b_size || extra.le_b_size;
      } catch(e) {}
    }
    
    const extraList = [];
    if (add) extraList.push(`ADD: ${add}`);
    if (fh) extraList.push(`FH: ${fh}`);
    if (pb) extraList.push(`PB: ${pb}`);
    if (a_size) extraList.push(`A: ${a_size}`);
    if (b_size) extraList.push(`B: ${b_size}`);

    return { notesText, extraList };
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setSearching(true);
    setCustomer(null);
    setProfiles([]);
    setSelectedProfile(null);
    setHistory([]);

    try {
      const { data: matchedCustomers, error: primaryError } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", phone.trim());

      if (primaryError) throw primaryError;

      const primaryData = matchedCustomers && matchedCustomers.length > 0
        ? (matchedCustomers.find(c => !c.parent_id) || matchedCustomers[0])
        : null;

      if (primaryData) {
        setCustomer(primaryData);

        const { data: dependentsData, error: dependentsError } = await supabase
          .from("customers")
          .select("*")
          .eq("parent_id", primaryData.id);

        if (dependentsError) throw dependentsError;

        const allProfiles = [
          { ...primaryData, label: "Primary Profile" },
          ...(dependentsData || []).map((dep) => ({
            ...dep,
            label: `Dependent (${dep.relationship || "Family"})`,
          })),
        ];

        setProfiles(allProfiles);
        if (allProfiles.length === 1) {
          setSelectedProfile(allProfiles[0]);
          fetchHistory(allProfiles[0].id);
        } else {
          setSelectedProfile(null);
          setHistory([]);
        }
      } else {
        setRegForm({
          name: "",
          phone: phone.trim(),
          email: "",
          street: "",
          town: "",
          district: "",
          state: "",
          postal_code: "",
          age: ""
        });
        setShowRegForm(true);
      }
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setSearching(false);
    }
  };

  const fetchHistory = async (profileId) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("customer_id", profileId)
        .order("prescribed_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchRecentPowers = async () => {
    if (!userProfile) return;

    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'super_admin';
    const userStoreId = userProfile.store_id;

    if (isAdmin) {
      console.log(`[Power Page] Authenticated User Role: ${userProfile.role} (Super/Global Admin). Showing all recent prescriptions.`);
    } else {
      const storeName = userProfile.store?.name || userProfile.store_name || "Assigned Store";
      console.log(`[Power Page] Authenticated User Role: ${userProfile.role} | Store: ${storeName} (ID: ${userStoreId}). Applying 48-hour activity window.`);
    }

    setLoadingRecent(true);
    try {
      let query = supabase
        .from("prescriptions")
        .select(`
          *,
          customers ( name, phone )
        `)
        .order("prescribed_at", { ascending: false });

      if (!isAdmin && userStoreId) {
        // Query recent orders from the last 48 hours to find relevant customer_ids
        const thresholdDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('customer_id')
          .eq('store_id', userStoreId)
          .gte('created_at', thresholdDate)
          .eq('disabled', false);

        const customerIds = (recentOrders || []).map(o => o.customer_id).filter(Boolean);
        if (customerIds.length > 0) {
          query = query.in("customer_id", customerIds);
        } else {
          // If no orders in the last 48 hours, return empty list
          setRecentPowers([]);
          setLoadingRecent(false);
          return;
        }
      }

      const { data, error } = await query.limit(10);

      if (error) throw error;
      setRecentPowers(data || []);
    } catch (err) {
      console.error("Error fetching recent prescriptions:", err.message);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    if (!customer && userProfile) {
      fetchRecentPowers();
    }
  }, [customer, userProfile]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...regForm,
        age: regForm.age ? Number(regForm.age) : null
      };

      const { data, error } = await supabase
        .from("customers")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      showNotification("Customer profile created!");
      setCustomer(data);
      const initialProfile = { ...data, label: "Primary Profile" };
      setProfiles([initialProfile]);
      setSelectedProfile(initialProfile);
      setHistory([]);
      setShowRegForm(false);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSelect = (p) => {
    setSelectedProfile(p);
    fetchHistory(p.id);
  };

  // Legacy suggestion handlers removed. Suggestions are now managed directly inside the SmartPowerInput component.

  const handleOpenAddModal = () => {
    reset({
      samePower: false,
      hasCyl: false,
      hasNear: false,
      isProgressive: false,
      hasPrism: false,
      re: { sph: "", cyl: "", axis: "", add: "" },
      le: { sph: "", cyl: "", axis: "", add: "" },
      acuity: {
        distRe: "6/6",
        distLe: "6/6",
        distOu: "6/6",
        nearRe: "N6",
        nearLe: "N6",
        nearOu: "N6"
      },
      pd: {
        type: "single",
        single: "",
        re: "",
        le: ""
      },
      prism: {
        re: { power: "", base: "" },
        le: { power: "", base: "" }
      },
      vd: "",
      panto: "",
      wrap: "",
      fh: {
        re: "",
        le: ""
      },
      pb: {
        re: "",
        le: ""
      },
      a_size: {
        re: "",
        le: ""
      },
      b_size: {
        re: "",
        le: ""
      },
      notes: ""
    });
    setActiveStep(1);
    setShowAddModal(true);
  };

  const checkAddDiscrepancies = (formData) => {
    if (!formData.hasNear) return null;
    
    const enteredReAdd = String(formData.nv_re?.add || "").trim();
    const calculatedReAdd = calculateAddVal(formData.re?.sph, formData.nv_re?.sph);
    
    if (enteredReAdd && calculatedReAdd && formatDiopter(enteredReAdd) !== formatDiopter(calculatedReAdd)) {
      return { eye: "re", entered: enteredReAdd, calculated: calculatedReAdd };
    }
    
    if (!formData.samePower) {
      const enteredLeAdd = String(formData.nv_le?.add || "").trim();
      const calculatedLeAdd = calculateAddVal(formData.le?.sph, formData.nv_le?.sph);
      if (enteredLeAdd && calculatedLeAdd && formatDiopter(enteredLeAdd) !== formatDiopter(calculatedLeAdd)) {
        return { eye: "le", entered: enteredLeAdd, calculated: calculatedLeAdd };
      }
    }
    
    return null;
  };

  const handleSavePrescription = (formData) => {
    if (!selectedProfile) return;
    
    if (formData.hasNear) {
      if (!formData.nv_re.add) {
        const calc = calculateAddVal(formData.re.sph, formData.nv_re.sph);
        if (calc) {
          formData.nv_re.add = calc;
          setValue("nv_re.add", calc);
        }
      }
      if (!formData.samePower && !formData.nv_le.add) {
        const calc = calculateAddVal(formData.le.sph, formData.nv_le.sph);
        if (calc) {
          formData.nv_le.add = calc;
          setValue("nv_le.add", calc);
        }
      }
    }
    
    const discrepancy = checkAddDiscrepancies(formData);
    if (discrepancy) {
      setDiscrepancyCheck({ discrepancy, formData });
    } else {
      setPendingFormData(formData);
      setShowConfirmSave(true);
    }
  };

  const handleResolveDiscrepancy = (action) => {
    const { discrepancy, formData } = discrepancyCheck;
    setDiscrepancyCheck(null);
    
    let updatedFormData = { ...formData };
    if (action === "replace") {
      const formattedCalc = formatDiopter(discrepancy.calculated);
      if (discrepancy.eye === "re") {
        updatedFormData.nv_re.add = formattedCalc;
        setValue("nv_re.add", formattedCalc);
        if (formData.samePower) {
          updatedFormData.nv_le.add = formattedCalc;
          setValue("nv_le.add", formattedCalc);
        }
      } else {
        updatedFormData.nv_le.add = formattedCalc;
        setValue("nv_le.add", formattedCalc);
      }
      
      const nextDiscrepancy = checkAddDiscrepancies(updatedFormData);
      if (nextDiscrepancy) {
        setDiscrepancyCheck({ discrepancy: nextDiscrepancy, formData: updatedFormData });
      } else {
        setPendingFormData(updatedFormData);
        setShowConfirmSave(true);
      }
    } else {
      if (discrepancy.eye === "re" && !formData.samePower) {
        const enteredLeAdd = String(formData.nv_le?.add || "").trim();
        const calculatedLeAdd = calculateAddVal(formData.le?.sph, formData.nv_le?.sph);
        if (enteredLeAdd && calculatedLeAdd && formatDiopter(enteredLeAdd) !== formatDiopter(calculatedLeAdd)) {
          setDiscrepancyCheck({
            discrepancy: { eye: "le", entered: enteredLeAdd, calculated: calculatedLeAdd },
            formData
          });
          return;
        }
      }
      setPendingFormData(formData);
      setShowConfirmSave(true);
    }
  };

  const confirmAndSave = async () => {
    if (!pendingFormData) return;
    setShowConfirmSave(false);
    setSaving(true);
    await executeSavePrescription(pendingFormData);
  };

  const executeSavePrescription = async (formData) => {
    console.log("[Optometry ERP] Submitting structured refraction payload:", formData);

    try {
      const isNonEmpty = (v) => v != null && String(v).trim() !== "";
      const normalizeAxis = (val) => {
        if (!isNonEmpty(val)) return null;
        const s = String(val).trim();
        const n = Number.parseInt(s, 10);
        return Number.isFinite(n) ? String(n) : null;
      };

      const normalizeOptical = (val, { decimals = 2 } = {}) => {
        if (!isNonEmpty(val)) return null;
        const raw = String(val).trim();
        const upper = raw.toUpperCase();
        if (upper === "PL" || upper === "PLANO") return "PL";
        const num = Number.parseFloat(raw);
        if (!Number.isFinite(num)) return raw;
        const fixed = num.toFixed(decimals);
        if (num > 0) return `+${fixed}`;
        return fixed;
      };



      const reSph = formData.re.sph;
      const reCyl = formData.re.cyl;
      const reAxis = formData.re.axis;

      const leSph = formData.samePower ? reSph : formData.le?.sph;
      const leCyl = formData.samePower ? reCyl : formData.le?.cyl;
      const leAxis = formData.samePower ? reAxis : formData.le?.axis;

      const nvReAdd = formData.nv_re?.add;
      const nvLeAdd = formData.samePower ? nvReAdd : formData.nv_le?.add;

      // Prism Formulation
      let prismReText = null;
      if (formData.hasPrism && isNonEmpty(formData.prism?.re?.power)) {
        prismReText = `${formData.prism.re.power} Base ${formData.prism.re.base || ""}`.trim();
      }
      let prismLeText = null;
      if (formData.hasPrism && isNonEmpty(formData.prism?.le?.power)) {
        prismLeText = `${formData.prism.le.power} Base ${formData.prism.le.base || ""}`.trim();
      }

      const payload = {
        customer_id: selectedProfile.id,
        // Distance Vision (DV)
        dv_re_sph: normalizeOptical(reSph),
        dv_re_cyl: formData.hasCyl ? normalizeOptical(reCyl) : null,
        dv_re_axis: formData.hasCyl ? normalizeAxis(reAxis) : null,
        dv_le_sph: normalizeOptical(leSph),
        dv_le_cyl: formData.hasCyl ? normalizeOptical(leCyl) : null,
        dv_le_axis: formData.hasCyl ? normalizeAxis(leAxis) : null,

        // Near Vision (NV)
        nv_re_sph: formData.hasNear ? normalizeOptical(formData.nv_re?.sph) : null,
        nv_re_cyl: (formData.hasNear && formData.hasCyl) ? normalizeOptical(formData.nv_re?.cyl) : null,
        nv_re_axis: (formData.hasNear && formData.hasCyl) ? normalizeAxis(formData.nv_re?.axis) : null,
        nv_re_add: formData.hasNear ? normalizeOptical(nvReAdd) : null,
        nv_le_sph: formData.hasNear ? normalizeOptical(formData.nv_le?.sph) : null,
        nv_le_cyl: (formData.hasNear && formData.hasCyl) ? normalizeOptical(formData.nv_le?.cyl) : null,
        nv_le_axis: (formData.hasNear && formData.hasCyl) ? normalizeAxis(formData.nv_le?.axis) : null,
        nv_le_add: formData.hasNear ? normalizeOptical(nvLeAdd) : null,

        // Direct DB columns
        re_add: formData.hasNear ? normalizeOptical(nvReAdd) : null,
        le_add: formData.hasNear ? normalizeOptical(nvLeAdd) : null,
        re_fh: formData.isProgressive ? (formData.fh?.re || null) : null,
        le_fh: formData.isProgressive ? (formData.fh?.le || null) : null,
        re_pb: formData.isProgressive ? (formData.pb?.re || null) : null,
        le_pb: formData.isProgressive ? (formData.pb?.le || null) : null,
        re_a_size: formData.isProgressive ? (formData.a_size?.re || null) : null,
        le_a_size: formData.isProgressive ? (formData.a_size?.le || null) : null,
        re_b_size: formData.isProgressive ? (formData.b_size?.re || null) : null,
        le_b_size: formData.isProgressive ? (formData.b_size?.le || null) : null,

        pd_distance: formData.pd?.type === "single" ? parseFloat(formData.pd.single) || null : null,
        pd_re: formData.pd?.type === "dual" ? parseFloat(formData.pd.re) || null : null,
        pd_le: formData.pd?.type === "dual" ? parseFloat(formData.pd.le) || null : null,
        prism_re: prismReText,
        prism_le: prismLeText,
        is_bifocal_progressive: !!formData.isProgressive,

        notes: isNonEmpty(formData.notes) ? String(formData.notes).trim() : null,
      };

      const { error } = await supabase.from("prescriptions").insert([payload]);
      if (error) {
        console.error("Prescription insert failed:", error.message);
        throw error;
      }

      showNotification("Prescription recorded successfully!");
      setShowAddModal(false);
      fetchHistory(selectedProfile.id);
      fetchRecentPowers();
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fast-slide pb-20">
      {/* Header */}
      <div className="flex justify-between items-end pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-black tracking-tighter uppercase mb-2">Power Records</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Add & View customer prescriptions</p>
        </div>
        {selectedProfile && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={14} strokeWidth={3} /> Record Power
          </button>
        )}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-8">
        {/* Search */}
        <form onSubmit={handleSearch} className="space-y-4">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
            Search Customer by Phone Number
          </label>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                required
                type="tel"
                placeholder="Enter Customer Phone..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="bg-black text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {/* Registration Form (Visible when phone search yields no results) */}
        {showRegForm && (
          <div className="border-t border-gray-50 pt-8 space-y-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-black text-black uppercase tracking-widest">Register Customer Profile</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">No customer found. Please create a new profile.</p>
            </div>
            <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Name *</label>
                <input
                  required
                  type="text"
                  placeholder="Full Name"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Phone</label>
                <input
                  required
                  type="tel"
                  placeholder="Phone"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Age</label>
                <input
                  type="number"
                  placeholder="Age"
                  value={regForm.age}
                  onChange={(e) => setRegForm({ ...regForm, age: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Email</label>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Street Address</label>
                <input
                  type="text"
                  placeholder="Street"
                  value={regForm.street}
                  onChange={(e) => setRegForm({ ...regForm, street: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Town / City</label>
                <input
                  type="text"
                  placeholder="Town"
                  value={regForm.town}
                  onChange={(e) => setRegForm({ ...regForm, town: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Postal Code</label>
                <input
                  type="text"
                  placeholder="Pin Code"
                  value={regForm.postal_code}
                  onChange={(e) => setRegForm({ ...regForm, postal_code: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="md:col-span-2 w-full py-4 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4"
              >
                {loading ? "Registering..." : "Create Account"}
              </button>
            </form>
          </div>
        )}

        {/* Profiles section */}
        {customer && (
          <div className="border-t border-gray-50 pt-8 space-y-6">
            {!selectedProfile && profiles.length > 0 && (
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Select Customer Profile
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {profiles.map((p) => {
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleProfileSelect(p)}
                        className="flex flex-col text-left p-5 rounded-2xl border border-gray-100 bg-gray-50/50 text-black hover:bg-gray-50 hover:scale-[1.01] transition-all"
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                          {p.label}
                        </span>
                        <span className="text-sm font-black mt-1 uppercase tracking-tight">{p.name}</span>
                        <span className="text-[10px] font-mono mt-1 opacity-70">{p.phone}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedProfile && (
              <>
                {/* Active Selected Profile Summary */}
                <div className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-3xl p-6 shadow-sm">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Active Profile</span>
                    <h4 className="text-base font-black uppercase tracking-tight text-black mt-1">{selectedProfile.name}</h4>
                    <p className="text-[10px] font-mono text-gray-400 mt-1">
                      Phone: {selectedProfile.phone || customer.phone} {selectedProfile.parent_id ? `• Dependent (${selectedProfile.relationship || "Family"})` : "• Primary Profile"}
                    </p>
                  </div>
                  {profiles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProfile(null);
                        setHistory([]);
                      }}
                      className="px-5 py-2.5 border border-black hover:bg-black hover:text-white transition-all rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Change Profile
                    </button>
                  )}
                </div>

                {/* Prescription History Table */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-wider text-black">
                    Prescription History for {selectedProfile.name}
                  </h3>
                  <div className="overflow-x-auto border border-gray-50 rounded-[24px]">
                    {loadingHistory ? (
                      <div className="p-10 text-center flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading history...</span>
                      </div>
                    ) : history.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Eye</th>
                            <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">SPH</th>
                            <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">CYL</th>
                            <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">AXIS</th>
                            <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">ADD</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-mono text-[11px] font-black">
                          {history.map((pow) => {
                            const hasNV = !!(pow.nv_re_sph || pow.nv_le_sph || pow.nv_re_cyl || pow.nv_le_cyl || pow.re_add || pow.le_add);
                            const mainRowSpan = hasNV ? 4 : 2;
                            const eyeRowSpan = hasNV ? 2 : 1;
                            return (
                              <Fragment key={pow.id}>
                                {/* Row 1: RE (DV) */}
                                <tr className="hover:bg-gray-50/50">
                                  <td rowSpan={mainRowSpan} className="px-6 py-4 text-xs font-bold text-gray-600 border-r border-gray-100 font-sans">
                                    {new Date(pow.prescribed_at || pow.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                  </td>
                                  <td className="px-6 py-3 text-center bg-gray-50/50 text-[10px] uppercase font-sans tracking-wider">RE (DV)</td>
                                  <td className="px-6 py-3 text-center text-gray-700">{pow.dv_re_sph || "—"}</td>
                                  <td className="px-6 py-3 text-center text-gray-700">{pow.dv_re_cyl || "—"}</td>
                                  <td className="px-6 py-3 text-center text-gray-700">{pow.dv_re_axis || "—"}</td>
                                  <td rowSpan={eyeRowSpan} className="px-6 py-3 text-center text-gray-700 border-l border-r border-gray-100 bg-neutral-50/30">
                                    {pow.re_add || pow.nv_re_add || calculateAddVal(pow.dv_re_sph, pow.nv_re_sph) || "—"}
                                  </td>
                                  <td rowSpan={mainRowSpan} className="px-6 py-4 text-xs font-medium text-gray-400 font-sans italic border-l border-gray-100 max-w-[200px]">
                                    {(() => {
                                      const { notesText, extraList } = getPrescriptionDisplay(pow);
                                      const filteredExtra = extraList.filter(item => !item.startsWith("ADD:"));
                                      return (
                                        <div className="space-y-1">
                                          <div>{notesText || "—"}</div>
                                          {filteredExtra.length > 0 && (
                                            <div className="text-[9px] font-black uppercase text-black not-italic bg-gray-50 px-2 py-1 rounded border border-gray-100 mt-1 inline-block">
                                              {filteredExtra.join(" | ")}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </td>
                                </tr>
                                {/* Row 2: RE (NV) */}
                                {hasNV && (
                                  <tr className="hover:bg-gray-50/50">
                                    <td className="px-6 py-3 text-center bg-gray-50/50 text-[10px] uppercase font-sans tracking-wider">RE (NV)</td>
                                    <td className="px-6 py-3 text-center text-gray-700">{pow.nv_re_sph || "—"}</td>
                                    <td className="px-6 py-3 text-center text-gray-700">{pow.nv_re_cyl || "—"}</td>
                                    <td className="px-6 py-3 text-center text-gray-700">{pow.nv_re_axis || "—"}</td>
                                  </tr>
                                )}
                                {/* Row 3: LE (DV) */}
                                <tr className="hover:bg-gray-50/50">
                                  <td className="px-6 py-3 text-center bg-gray-50/50 text-[10px] uppercase font-sans tracking-wider">LE (DV)</td>
                                  <td className="px-6 py-3 text-center text-gray-700">{pow.dv_le_sph || "—"}</td>
                                  <td className="px-6 py-3 text-center text-gray-700">{pow.dv_le_cyl || "—"}</td>
                                  <td className="px-6 py-3 text-center text-gray-700">{pow.dv_le_axis || "—"}</td>
                                  <td rowSpan={eyeRowSpan} className="px-6 py-3 text-center text-gray-700 border-l border-r border-gray-100 bg-neutral-50/30">
                                    {pow.le_add || pow.nv_le_add || calculateAddVal(pow.dv_le_sph, pow.nv_le_sph) || "—"}
                                  </td>
                                </tr>
                                {/* Row 4: LE (NV) */}
                                {hasNV && (
                                  <tr className="hover:bg-gray-50/50 border-b border-gray-100">
                                    <td className="px-6 py-3 text-center bg-gray-50/50 text-[10px] uppercase font-sans tracking-wider">LE (NV)</td>
                                    <td className="px-6 py-3 text-center text-gray-700">{pow.nv_le_sph || "—"}</td>
                                    <td className="px-6 py-3 text-center text-gray-700">{pow.nv_le_cyl || "—"}</td>
                                    <td className="px-6 py-3 text-center text-gray-700">{pow.nv_le_axis || "—"}</td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-10 text-center text-gray-400 italic">No prescription records found for this profile.</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Unconditional Recent Prescriptions list always displayed at bottom of page */}
      <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-black">
          Recent Prescriptions
        </h3>
        <div className="overflow-x-auto border border-gray-50 rounded-[24px]">
          {loadingRecent ? (
            <div className="p-10 text-center flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading prescriptions...</span>
            </div>
          ) : recentPowers.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Eye</th>
                  <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">SPH</th>
                  <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">CYL</th>
                  <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">AXIS</th>
                  <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">ADD</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[11px] font-black font-mono">
                {recentPowers.map((pow) => {
                  const hasNV = !!(pow.nv_re_sph || pow.nv_le_sph || pow.nv_re_cyl || pow.nv_le_cyl || pow.re_add || pow.le_add);
                  const mainRowSpan = hasNV ? 4 : 2;
                  const eyeRowSpan = hasNV ? 2 : 1;
                  return (
                    <Fragment key={pow.id}>
                      {/* Row 1: RE (DV) */}
                      <tr className="hover:bg-gray-50/50">
                        <td rowSpan={mainRowSpan} className="px-6 py-4 font-sans border-r border-gray-100">
                          <span className="block text-xs font-black uppercase text-black">{pow.customers?.name || "Unknown"}</span>
                          <span className="block text-[9px] text-gray-400 mt-0.5">{pow.customers?.phone}</span>
                        </td>
                        <td rowSpan={mainRowSpan} className="px-6 py-4 text-xs font-bold text-gray-600 border-r border-gray-100 font-sans">
                          {new Date(pow.prescribed_at || pow.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-6 py-3 text-center bg-gray-50/50 text-[10px] uppercase font-sans tracking-wider">RE (DV)</td>
                        <td className="px-6 py-3 text-center text-gray-700">{pow.dv_re_sph || "—"}</td>
                        <td className="px-6 py-3 text-center text-gray-700">{pow.dv_re_cyl || "—"}</td>
                        <td className="px-6 py-3 text-center text-gray-700">{pow.dv_re_axis || "—"}</td>
                        <td rowSpan={eyeRowSpan} className="px-6 py-3 text-center text-gray-700 border-l border-r border-gray-100 bg-neutral-50/30">
                          {pow.re_add || pow.nv_re_add || calculateAddVal(pow.dv_re_sph, pow.nv_re_sph) || "—"}
                        </td>
                        <td rowSpan={mainRowSpan} className="px-6 py-4 text-xs font-medium text-gray-400 font-sans italic border-l border-gray-100 max-w-[200px]">
                          {(() => {
                            const { notesText, extraList } = getPrescriptionDisplay(pow);
                            const filteredExtra = extraList.filter(item => !item.startsWith("ADD:"));
                            return (
                              <div className="space-y-1">
                                <div>{notesText || "—"}</div>
                                {filteredExtra.length > 0 && (
                                  <div className="text-[9px] font-black uppercase text-black not-italic bg-gray-50 px-2 py-1 rounded border border-gray-100 mt-1 inline-block">
                                    {filteredExtra.join(" | ")}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                      {/* Row 2: RE (NV) */}
                      {hasNV && (
                        <tr className="hover:bg-gray-50/50">
                          <td className="px-6 py-3 text-center bg-gray-50/50 text-[10px] uppercase font-sans tracking-wider">RE (NV)</td>
                          <td className="px-6 py-3 text-center text-gray-700">{pow.nv_re_sph || "—"}</td>
                          <td className="px-6 py-3 text-center text-gray-700">{pow.nv_re_cyl || "—"}</td>
                          <td className="px-6 py-3 text-center text-gray-700">{pow.nv_re_axis || "—"}</td>
                        </tr>
                      )}
                      {/* Row 3: LE (DV) */}
                      <tr className="hover:bg-gray-50/50">
                        <td className="px-6 py-3 text-center bg-gray-50/50 text-[10px] uppercase font-sans tracking-wider">LE (DV)</td>
                        <td className="px-6 py-3 text-center text-gray-700">{pow.dv_le_sph || "—"}</td>
                        <td className="px-6 py-3 text-center text-gray-700">{pow.dv_le_cyl || "—"}</td>
                        <td className="px-6 py-3 text-center text-gray-700">{pow.dv_le_axis || "—"}</td>
                        <td rowSpan={eyeRowSpan} className="px-6 py-3 text-center text-gray-700 border-l border-r border-gray-100 bg-neutral-50/30">
                          {pow.le_add || pow.nv_le_add || calculateAddVal(pow.dv_le_sph, pow.nv_le_sph) || "—"}
                        </td>
                      </tr>
                      {/* Row 4: LE (NV) */}
                      {hasNV && (
                        <tr className="hover:bg-gray-50/50 border-b border-gray-100">
                          <td className="px-6 py-3 text-center bg-gray-50/50 text-[10px] uppercase font-sans tracking-wider">LE (NV)</td>
                          <td className="px-6 py-3 text-center text-gray-700">{pow.nv_le_sph || "—"}</td>
                          <td className="px-6 py-3 text-center text-gray-700">{pow.nv_le_cyl || "—"}</td>
                          <td className="px-6 py-3 text-center text-gray-700">{pow.nv_le_axis || "—"}</td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center text-gray-400 italic">No recent prescriptions recorded.</div>
          )}
        </div>
      </div>

      <SlideDrawer
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Eye Power"
        subtitle={`Specify prescription data for ${selectedProfile?.name}`}
        width="max-w-5xl"
      >
          <div className="bg-neutral-50 min-h-[500px] flex flex-col justify-between select-none">
          {/* Top Wizard Steps Indicator (Premium black-and-white design) */}
          <div className="bg-white border-b border-neutral-200 px-8 py-5">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {["Setup", "Refraction", "Acuity & PD", "Dispensing & Notes"].map((stepLabel, idx) => {
                const stepNum = idx + 1;
                const isCompleted = activeStep > stepNum;
                const isActive = activeStep === stepNum;
                return (
                  <div key={stepLabel} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border transition-all duration-300 ${
                      isCompleted ? "bg-black border-black text-white" :
                      isActive ? "bg-neutral-950 border-neutral-950 text-white ring-4 ring-neutral-100" : "bg-white border-neutral-200 text-neutral-400"
                    }`}>
                      {stepNum}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${
                      isActive ? "text-black" : isCompleted ? "text-neutral-500" : "text-neutral-300"
                    }`}>
                      {stepLabel}
                    </span>
                    {idx < 3 && <div className="w-8 h-[2px] bg-neutral-200 mx-2 hidden sm:block" />}
                  </div>
                );
              })}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              if (activeStep < 4) {
                e.preventDefault();
                setActiveStep(prev => prev + 1);
              } else {
                handleFormSubmit(handleSavePrescription)(e);
              }
            }}
            className="p-8 space-y-8 flex-1"
          >
            {/* STEP 1: Exam Configuration (Setup) */}
            {activeStep === 1 && (
              <div className="space-y-6 max-w-xl mx-auto bg-white border border-neutral-200 rounded-[24px] p-8 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 border-b border-neutral-100 pb-4 mb-4">
                  <Sparkles className="w-5 h-5 text-black" />
                  <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest">Exam Configuration</h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {[
                    { id: "samePower", label: "Same Power Both Eyes", desc: "Auto-mirrors OD to OS measurements automatically" },
                    { id: "hasCyl", label: "Has Cylindrical Power", desc: "Enables CYL & AXIS column grids in refraction step" },
                    { id: "hasNear", label: "Has Near Vision", desc: "Adds ADD columns and near visual acuity controls" },
                    { id: "isProgressive", label: "Progressive / Bifocal", desc: "Expands fitting heights and progressive lens metrics" },
                    { id: "hasPrism", label: "Has Prism Correction", desc: "Shows prism and base alignment properties" }
                  ].map((item) => (
                    <label key={item.id} className="flex items-start gap-4 p-4 border border-neutral-100 rounded-2xl hover:border-neutral-900 hover:bg-neutral-50 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        {...register(item.id)}
                        className="w-5 h-5 rounded-lg border-neutral-300 text-black focus:ring-black accent-black mt-0.5"
                      />
                      <div>
                        <span className="block text-xs font-black uppercase tracking-wider text-neutral-800">{item.label}</span>
                        <span className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">{item.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: Subjective Refraction */}
            {activeStep === 2 && (
              <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white border border-neutral-200 rounded-[24px] p-8 shadow-sm space-y-8">
                  <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
                    <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest">
                      Subjective Refraction
                    </h3>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider italic">
                      Press tab to jump, arrow keys to tweak power
                    </span>
                  </div>

                  {/* Right Eye (OD) / Both Eyes (OU) Card */}
                  <div className="border border-neutral-150 rounded-2xl p-6 space-y-4 bg-white shadow-xs">
                    <div className="flex items-center gap-2 mb-2 border-b border-neutral-100 pb-2">
                      <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-mono font-black">
                        {samePower ? "OU" : "OD"}
                      </div>
                      <span className="text-xs font-black text-neutral-800 uppercase tracking-wider">
                        {samePower ? "Both Eyes" : "Right"}
                      </span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 items-stretch">
                      {/* SPH, CYL, AXIS Grid */}
                      <div className="flex-1 space-y-4">
                        {/* Headers */}
                        <div className="grid grid-cols-12 gap-2 items-center border-b border-neutral-100 pb-2">
                          <div className="col-span-2">
                            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Vision</span>
                          </div>
                          <div className="col-span-3 text-center">
                            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">SPH</span>
                          </div>
                          {hasCyl && (
                            <>
                              <div className="col-span-3 text-center">
                                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">CYL</span>
                              </div>
                              <div className="col-span-4 text-center">
                                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">AXIS</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Row 1: DV */}
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-2 flex flex-col items-start gap-1">
                            <span className="text-[10px] font-black text-neutral-700 uppercase tracking-wider">DV</span>
                            {hasCyl && (
                              <button
                                type="button"
                                onClick={() => handleTranspose("re")}
                                title="Transpose Distance Cylinder"
                                className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider border border-black text-black bg-white rounded hover:bg-black hover:text-white transition-colors cursor-pointer"
                              >
                                Trans
                              </button>
                            )}
                          </div>
                          <div className={hasCyl ? "col-span-3" : "col-span-10"}>
                            <SmartPowerInput name="re.sph" control={control} tabIndex={10} placeholder="0.00" />
                          </div>
                          {hasCyl && (
                            <>
                              <div className="col-span-3">
                                <SmartPowerInput name="re.cyl" control={control} tabIndex={11} placeholder="0.00" />
                              </div>
                              <div className="col-span-4 flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="180"
                                  {...register("re.axis")}
                                  tabIndex={12}
                                  className="w-full px-3 py-3 text-xs font-black font-mono text-center border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
                                  placeholder="0"
                                />
                                {reAxis && (
                                  <svg className="w-6 h-6 shrink-0 border border-neutral-200 rounded-full" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e5e5" strokeWidth="3" />
                                    <line
                                      x1="50" y1="50"
                                      x2={50 + 40 * Math.cos((parseFloat(reAxis) * Math.PI) / 180)}
                                      y2={50 - 40 * Math.sin((parseFloat(reAxis) * Math.PI) / 180)}
                                      stroke="black"
                                      strokeWidth="5"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Row 2: NV (Only if hasNear is true) */}
                        {hasNear && (
                          <div className="grid grid-cols-12 gap-2 items-center pt-2 border-t border-neutral-50">
                            <div className="col-span-2 flex flex-col items-start gap-1">
                              <span className="text-[10px] font-black text-neutral-700 uppercase tracking-wider">NV</span>
                              {hasCyl && (
                                <button
                                  type="button"
                                  onClick={() => handleTranspose("nv_re")}
                                  title="Transpose Near Cylinder"
                                  className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider border border-black text-black bg-white rounded hover:bg-black hover:text-white transition-colors cursor-pointer"
                                >
                                  Trans
                                </button>
                              )}
                            </div>
                            <div className={hasCyl ? "col-span-3" : "col-span-10"}>
                              <SmartPowerInput name="nv_re.sph" control={control} tabIndex={13} placeholder="0.00" />
                            </div>
                            {hasCyl && (
                              <>
                                <div className="col-span-3">
                                  <SmartPowerInput name="nv_re.cyl" control={control} tabIndex={14} placeholder="0.00" />
                                </div>
                                <div className="col-span-4 flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="180"
                                    {...register("nv_re.axis")}
                                    tabIndex={15}
                                    className="w-full px-3 py-3 text-xs font-black font-mono text-center border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
                                    placeholder="0"
                                  />
                                  {nvReAxis && (
                                    <svg className="w-6 h-6 shrink-0 border border-neutral-200 rounded-full" viewBox="0 0 100 100">
                                      <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e5e5" strokeWidth="3" />
                                      <line
                                        x1="50" y1="50"
                                        x2={50 + 40 * Math.cos((parseFloat(nvReAxis) * Math.PI) / 180)}
                                        y2={50 - 40 * Math.sin((parseFloat(nvReAxis) * Math.PI) / 180)}
                                        stroke="black"
                                        strokeWidth="5"
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ADD Column (only if hasNear is true) */}
                      {hasNear && (
                        <div className="w-full md:w-44 px-6 py-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl flex flex-col justify-center items-center gap-2">
                          <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">ADD</label>
                          <SmartPowerInput name="nv_re.add" control={control} tabIndex={20} placeholder="+2.00" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Left Eye (OS) Card (Only if samePower is false) */}
                  {!samePower && (
                    <div className="border border-neutral-150 rounded-2xl p-6 space-y-4 bg-white shadow-xs">
                      <div className="flex items-center gap-2 mb-2 border-b border-neutral-100 pb-2">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-300 text-neutral-800 flex items-center justify-center text-xs font-mono font-black">
                          OS
                        </div>
                        <span className="text-xs font-black text-neutral-800 uppercase tracking-wider">
                          Left
                        </span>
                      </div>

                      <div className="flex flex-col md:flex-row gap-6 items-stretch">
                        {/* SPH, CYL, AXIS Grid */}
                        <div className="flex-1 space-y-4">
                          {/* Headers */}
                          <div className="grid grid-cols-12 gap-2 items-center border-b border-neutral-100 pb-2">
                            <div className="col-span-2">
                              <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Vision</span>
                            </div>
                            <div className="col-span-3 text-center">
                              <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">SPH</span>
                            </div>
                            {hasCyl && (
                              <>
                                <div className="col-span-3 text-center">
                                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">CYL</span>
                                </div>
                                <div className="col-span-4 text-center">
                                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">AXIS</span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Row 1: DV */}
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-2 flex flex-col items-start gap-1">
                              <span className="text-[10px] font-black text-neutral-700 uppercase tracking-wider">DV</span>
                              {hasCyl && (
                                <button
                                  type="button"
                                  onClick={() => handleTranspose("le")}
                                  title="Transpose Distance Cylinder"
                                  className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider border border-black text-black bg-white rounded hover:bg-black hover:text-white transition-colors cursor-pointer"
                                >
                                  Trans
                                </button>
                              )}
                            </div>
                            <div className={hasCyl ? "col-span-3" : "col-span-10"}>
                              <SmartPowerInput name="le.sph" control={control} tabIndex={30} placeholder="0.00" />
                            </div>
                            {hasCyl && (
                              <>
                                <div className="col-span-3">
                                  <SmartPowerInput name="le.cyl" control={control} tabIndex={31} placeholder="0.00" />
                                </div>
                                <div className="col-span-4 flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="180"
                                    {...register("le.axis")}
                                    tabIndex={32}
                                    className="w-full px-3 py-3 text-xs font-black font-mono text-center border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
                                    placeholder="0"
                                  />
                                  {watch("le.axis") && (
                                    <svg className="w-6 h-6 shrink-0 border border-neutral-200 rounded-full" viewBox="0 0 100 100">
                                      <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e5e5" strokeWidth="3" />
                                      <line
                                        x1="50" y1="50"
                                        x2={50 + 40 * Math.cos((parseFloat(watch("le.axis")) * Math.PI) / 180)}
                                        y2={50 - 40 * Math.sin((parseFloat(watch("le.axis")) * Math.PI) / 180)}
                                        stroke="black"
                                        strokeWidth="5"
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Row 2: NV (Only if hasNear is true) */}
                          {hasNear && (
                            <div className="grid grid-cols-12 gap-2 items-center pt-2 border-t border-neutral-50">
                              <div className="col-span-2 flex flex-col items-start gap-1">
                                <span className="text-[10px] font-black text-neutral-700 uppercase tracking-wider">NV</span>
                                {hasCyl && (
                                  <button
                                    type="button"
                                    onClick={() => handleTranspose("nv_le")}
                                    title="Transpose Near Cylinder"
                                    className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider border border-black text-black bg-white rounded hover:bg-black hover:text-white transition-colors cursor-pointer"
                                  >
                                    Trans
                                  </button>
                                )}
                              </div>
                              <div className={hasCyl ? "col-span-3" : "col-span-10"}>
                                <SmartPowerInput name="nv_le.sph" control={control} tabIndex={33} placeholder="0.00" />
                              </div>
                              {hasCyl && (
                                <>
                                  <div className="col-span-3">
                                    <SmartPowerInput name="nv_le.cyl" control={control} tabIndex={34} placeholder="0.00" />
                                  </div>
                                  <div className="col-span-4 flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      max="180"
                                      {...register("nv_le.axis")}
                                      tabIndex={35}
                                      className="w-full px-3 py-3 text-xs font-black font-mono text-center border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
                                      placeholder="0"
                                    />
                                    {watch("nv_le.axis") && (
                                      <svg className="w-6 h-6 shrink-0 border border-neutral-200 rounded-full" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e5e5" strokeWidth="3" />
                                        <line
                                          x1="50" y1="50"
                                          x2={50 + 40 * Math.cos((parseFloat(watch("nv_le.axis")) * Math.PI) / 180)}
                                          y2={50 - 40 * Math.sin((parseFloat(watch("nv_le.axis")) * Math.PI) / 180)}
                                          stroke="black"
                                          strokeWidth="5"
                                          strokeLinecap="round"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* ADD Column (only if hasNear is true) */}
                        {hasNear && (
                          <div className="w-full md:w-44 px-6 py-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl flex flex-col justify-center items-center gap-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">ADD</label>
                            <SmartPowerInput name="nv_le.add" control={control} tabIndex={40} placeholder="+2.00" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Binocular & Acuity */}
            {activeStep === 3 && (
              <div className="bg-white border border-neutral-200 rounded-[24px] p-8 shadow-sm max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest border-b border-neutral-100 pb-4">
                    Visual Acuity (Aided)
                  </h3>
                  
                  {/* Distance VA */}
                  <div className="mt-6 space-y-4">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">Distance Visual Acuity</label>
                    <div className="grid grid-cols-3 gap-4">
                      {["distRe", "distLe", "distOu"].map((vaKey) => {
                        const label = vaKey === "distRe" ? "Right" : vaKey === "distLe" ? "Left" : "Binocular";
                        const selectedVal = watch(`acuity.${vaKey}`);
                        return (
                          <div key={vaKey} className="space-y-1">
                            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">{label}</span>
                            <div className="relative">
                              <select
                                {...register(`acuity.${vaKey}`)}
                                className="w-full px-3 py-3 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white appearance-none"
                              >
                                {["6/4", "6/5", "6/6", "6/9", "6/12", "6/18", "6/24", "6/36", "6/60"].map(v => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono font-black bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200">
                                logMAR {getLogmar(selectedVal)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Near VA (If setup enabled) */}
                  {hasNear && (
                    <div className="mt-6 space-y-4">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">Near Visual Acuity</label>
                      <div className="grid grid-cols-3 gap-4">
                        {["nearRe", "nearLe", "nearOu"].map((vaKey) => {
                          const label = vaKey === "nearRe" ? "Right" : vaKey === "nearLe" ? "Left" : "Binocular";
                          return (
                            <div key={vaKey} className="space-y-1">
                              <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">{label}</span>
                              <select
                                {...register(`acuity.${vaKey}`)}
                                className="w-full px-3 py-3 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
                              >
                                {["N5", "N6", "N8", "N10", "N12", "N18"].map(v => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pupillary Distance (PD) */}
                <div className="border-t border-neutral-100 pt-6">
                  <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest pb-4">
                    Pupillary Distance (PD)
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-6 mt-2">
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="single"
                          {...register("pd.type")}
                          className="w-4 h-4 text-black focus:ring-black accent-black cursor-pointer"
                        />
                        <span className="text-xs font-black uppercase tracking-wider text-neutral-700">Single PD</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="dual"
                          {...register("pd.type")}
                          className="w-4 h-4 text-black focus:ring-black accent-black cursor-pointer"
                        />
                        <span className="text-xs font-black uppercase tracking-wider text-neutral-700">Dual PD</span>
                      </label>
                    </div>

                    <div className="flex-1">
                      {watch("pd.type") === "single" ? (
                        <div className="max-w-[150px]">
                          <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 block">Binocular PD</label>
                          <div className="relative">
                            <input
                              type="number"
                              {...register("pd.single")}
                              placeholder="64"
                              className="w-full px-3 py-3 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-neutral-400">mm</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-4">
                          <div className="w-28">
                            <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 block">Right PD</label>
                            <input
                              type="number"
                              {...register("pd.re")}
                              placeholder="32"
                              className="w-full px-3 py-3 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
                            />
                          </div>
                          <div className="w-28">
                            <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 block">Left PD</label>
                            <input
                              type="number"
                              {...register("pd.le")}
                              placeholder="32"
                              className="w-full px-3 py-3 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Prism Correction */}
                {hasPrism && (
                  <div className="border-t border-neutral-100 pt-6 space-y-4">
                    <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest pb-2">
                      Prism Correction
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* OD Prism */}
                      <div className="flex gap-4 items-center">
                        <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-mono font-black">OD</div>
                        <div className="flex-1">
                          <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1 block">Prism Power</label>
                          <input
                            type="text"
                            {...register("prism.re.power")}
                            placeholder="0.00"
                            className="w-full px-3 py-3 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
                          />
                        </div>
                        <div className="w-32">
                          <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1 block">Base</label>
                          <select
                            {...register("prism.re.base")}
                            className="w-full px-3 py-3 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
                          >
                            <option value="">—</option>
                            <option value="UP">UP</option>
                            <option value="DOWN">DOWN</option>
                            <option value="IN">IN</option>
                            <option value="OUT">OUT</option>
                          </select>
                        </div>
                      </div>

                      {/* OS Prism */}
                      <div className="flex gap-4 items-center">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-300 text-neutral-800 flex items-center justify-center text-xs font-mono font-black">OS</div>
                        <div className="flex-1">
                          <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1 block">Prism Power</label>
                          <input
                            type="text"
                            {...register("prism.le.power")}
                            placeholder="0.00"
                            className="w-full px-3 py-3 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
                          />
                        </div>
                        <div className="w-32">
                          <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1 block">Base</label>
                          <select
                            {...register("prism.le.base")}
                            className="w-full px-3 py-3 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
                          >
                            <option value="">—</option>
                            <option value="UP">UP</option>
                            <option value="DOWN">DOWN</option>
                            <option value="IN">IN</option>
                            <option value="OUT">OUT</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Advanced Dispensing & Notes */}
            {activeStep === 4 && (
              <div className="bg-white border border-neutral-200 rounded-[24px] p-8 shadow-sm max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest border-b border-neutral-100 pb-4">
                  Advanced Dispensing Metrics
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 block">Vertex Distance (VD)</label>
                    <div className="relative">
                      <input
                        type="text"
                        {...register("vd")}
                        placeholder="12"
                        className="w-full px-3 py-3 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-neutral-400">mm</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 block">Pantoscopic Tilt</label>
                    <div className="relative">
                      <input
                        type="text"
                        {...register("panto")}
                        placeholder="8"
                        className="w-full px-3 py-3 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">deg</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 block">Bow / Wrap Angle</label>
                    <div className="relative">
                      <input
                        type="text"
                        {...register("wrap")}
                        placeholder="5"
                        className="w-full px-3 py-3 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">deg</span>
                    </div>
                  </div>
                </div>

                {isProgressive && (
                  <div className="border-t border-neutral-100 pt-6 space-y-6">
                    {/* Fitting Heights (FH) */}
                    <div>
                      <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-3">Fitting Heights (FH)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 block">Right Fitting Height</label>
                          <div className="relative">
                            <input
                              type="text"
                              {...register("fh.re")}
                              placeholder="18"
                              className="w-full px-3 py-3 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">mm</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 block">Left Fitting Height</label>
                          <div className="relative">
                            <input
                              type="text"
                              {...register("fh.le")}
                              placeholder="18"
                              className="w-full px-3 py-3 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">mm</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pupil Heights (PB) */}
                    <div>
                      <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-3">Pupil Heights (PB)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 block">Right Pupil Height</label>
                          <div className="relative">
                            <input
                              type="text"
                              {...register("pb.re")}
                              placeholder="18"
                              className="w-full px-3 py-3 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">mm</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 block">Left Pupil Height</label>
                          <div className="relative">
                            <input
                              type="text"
                              {...register("pb.le")}
                              placeholder="18"
                              className="w-full px-3 py-3 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">mm</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Frame Box Sizes (A & B) */}
                    <div>
                      <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-3">Frame Dimensions (A & B Box Size)</h4>
                      <div className="grid grid-cols-2 gap-6">
                        {/* Right Eye Dimensions */}
                        <div className="space-y-4 border border-neutral-100 p-4 rounded-2xl bg-neutral-50/50">
                          <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block">Right Eye</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1 block">A Size</label>
                              <input
                                type="text"
                                {...register("a_size.re")}
                                placeholder="52"
                                className="w-full px-2 py-2 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1 block">B Size</label>
                              <input
                                type="text"
                                {...register("b_size.re")}
                                placeholder="40"
                                className="w-full px-2 py-2 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Left Eye Dimensions */}
                        <div className="space-y-4 border border-neutral-100 p-4 rounded-2xl bg-neutral-50/50">
                          <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block">Left Eye</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1 block">A Size</label>
                              <input
                                type="text"
                                {...register("a_size.le")}
                                placeholder="52"
                                className="w-full px-2 py-2 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1 block">B Size</label>
                              <input
                                type="text"
                                {...register("b_size.le")}
                                placeholder="40"
                                className="w-full px-2 py-2 text-xs font-black border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-neutral-100 pt-6 space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Lab Notes & Clinical Remarks</label>
                  <textarea
                    rows={4}
                    {...register("notes")}
                    placeholder="Enter patient tolerance observations, lab parameters, or prism directions..."
                    className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-6 py-4 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            )}

            {/* Bottom Navigation Buttons */}
            <div className="pt-6 border-t border-neutral-200 flex gap-4 max-w-4xl mx-auto">
              {activeStep > 1 ? (
                <button
                  key="btn-back"
                  type="button"
                  onClick={() => setActiveStep(activeStep - 1)}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-600 border border-neutral-200 rounded-2xl hover:bg-neutral-100 transition-colors"
                >
                  Back
                </button>
              ) : (
                <button
                  key="btn-discard"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors"
                >
                  Discard
                </button>
              )}

              {activeStep < 4 ? (
                <button
                  key="btn-next"
                  type="button"
                  onClick={() => setActiveStep(activeStep + 1)}
                  className="flex-[2] py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:shadow-2xl hover:bg-neutral-800 transition-all text-center"
                >
                  Next Step
                </button>
              ) : (
                <button
                  key="btn-submit"
                  type="submit"
                  disabled={saving}
                  className="flex-[2] py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:shadow-2xl hover:bg-neutral-800 transition-all"
                >
                  {saving ? "Saving..." : "Save Prescription"}
                </button>
              )}
            </div>
          </form>
        </div>
      </SlideDrawer>

      {/* ADD Discrepancy Dialog */}
      {discrepancyCheck && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setDiscrepancyCheck(null)}
          />
          <div className="relative bg-white border border-neutral-200 rounded-[24px] p-8 shadow-2xl max-w-md w-full space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-black uppercase tracking-widest flex items-center justify-center gap-2">
                <AlertCircle className="text-amber-500 w-5 h-5" /> ADD Power Discrepancy
              </h3>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mt-2">
                Discrepancy detected for {discrepancyCheck.discrepancy.eye === "re" ? "Right Eye" : "Left Eye"}.
              </p>
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 font-mono text-[11px] font-black text-neutral-700 space-y-1">
                <div>Entered ADD: <span className="text-red-500">{formatDiopter(discrepancyCheck.discrepancy.entered)}</span></div>
                <div>Calculated ADD (Near SPH - Distance SPH): <span className="text-emerald-600">{formatDiopter(discrepancyCheck.discrepancy.calculated)}</span></div>
              </div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                Would you like to replace the entered ADD with our calculated value?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleResolveDiscrepancy("replace")}
                className="w-full py-3 text-[10px] font-black uppercase tracking-wider bg-black text-white rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Yes, Use Calculated ({formatDiopter(discrepancyCheck.discrepancy.calculated)})
              </button>
              <button
                type="button"
                onClick={() => handleResolveDiscrepancy("keep")}
                className="w-full py-3 text-[10px] font-black uppercase tracking-wider border border-neutral-200 rounded-xl text-neutral-600 hover:text-black hover:bg-neutral-50 transition-colors"
              >
                No, Keep Entered ({formatDiopter(discrepancyCheck.discrepancy.entered)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Confirmation Dialog */}
      {showConfirmSave && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowConfirmSave(false)}
          />
          <div className="relative bg-white border border-neutral-200 rounded-[24px] p-8 shadow-2xl max-w-sm w-full space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-black uppercase tracking-widest">Confirm Prescription</h3>
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
                Are you sure you want to save this clinical refraction data for {selectedProfile?.name}?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmSave(false)}
                className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider border border-neutral-200 rounded-xl text-neutral-500 hover:text-black hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAndSave}
                className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider bg-black text-white rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-5">
          <div
            className={`px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              notification.type === "success"
                ? "bg-black border-white/10 text-white"
                : "bg-red-50 border-red-100 text-red-600"
            }`}
          >
            {notification.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span className="text-[10px] font-black uppercase tracking-widest">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
