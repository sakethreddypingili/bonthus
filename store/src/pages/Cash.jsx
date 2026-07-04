import { useState, useEffect, useCallback } from "react";
import { Banknote, TrendingUp, TrendingDown, IndianRupee, RefreshCw, ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../server/supabase/supabase";

export default function Cash({ userProfile }) {
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState("");
    const [openingBalance, setOpeningBalance] = useState("");
    const [todayCashSales, setTodayCashSales] = useState(0);
    const [yesterdayCashSales, setYesterdayCashSales] = useState(0);
    const [totalCashSales, setTotalCashSales] = useState(0);
    const [fetchingCashSales, setFetchingCashSales] = useState(false);
    const [orderPayments, setOrderPayments] = useState([]);
    const [cashEntries, setCashEntries] = useState([]);
    const [cashForm, setCashForm] = useState({ type: 'cash_in', amount: '', reason: '' });
    const [loadingStores, setLoadingStores] = useState(true);
    const [activeLogTab, setActiveLogTab] = useState('adjustments');

    const isSuperAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

    // Fetch stores
    useEffect(() => {
        const fetchStores = async () => {
            setLoadingStores(true);
            try {
                const { data, error } = await supabase.from('stores').select('id, name').order('name');
                if (error) throw error;
                setStores(data || []);
                const defaultStore = isSuperAdmin ? data?.[0]?.id : userProfile?.store_id;
                setSelectedStore(defaultStore || "");
            } catch (err) {
                console.error("Error fetching stores:", err.message);
            } finally {
                setLoadingStores(false);
            }
        };
        fetchStores();
    }, [isSuperAdmin, userProfile?.store_id]);

    // Fetch Cash Sales (Today, Yesterday, Total) and manual logs from the cash_registry table
    const fetchCashData = useCallback(async () => {
        if (!selectedStore) return;
        setFetchingCashSales(true);
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const yesterdayStart = new Date();
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            yesterdayStart.setHours(0, 0, 0, 0);
            const yesterdayEnd = new Date();
            yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
            yesterdayEnd.setHours(23, 59, 59, 999);

            // 1. Fetch Today's Payments & list
            const { data: todayData, error: todayErr } = await supabase
                .from('payments')
                .select(`
                    id,
                    amount,
                    created_at,
                    orders!inner (
                        id,
                        order_number,
                        store_id,
                        customers (
                            name
                        )
                    )
                `)
                .eq('payment_method', 'cash')
                .eq('status', 'completed')
                .eq('orders.store_id', selectedStore)
                .gte('created_at', todayStart.toISOString())
                .lte('created_at', todayEnd.toISOString());

            if (todayErr) throw todayErr;

            const list = (todayData || []).map(p => ({
                id: p.id,
                amount: Number(p.amount) || 0,
                orderNumber: p.orders?.order_number,
                customerName: p.orders?.customers?.name || 'Walk-in',
                time: new Date(p.created_at)
            }));
            setOrderPayments(list);
            const todayTotal = list.reduce((sum, item) => sum + item.amount, 0);
            setTodayCashSales(todayTotal);

            // 2. Fetch Yesterday's Payments
            const { data: yestData, error: yestErr } = await supabase
                .from('payments')
                .select('amount, orders!inner(store_id)')
                .eq('payment_method', 'cash')
                .eq('status', 'completed')
                .eq('orders.store_id', selectedStore)
                .gte('created_at', yesterdayStart.toISOString())
                .lte('created_at', yesterdayEnd.toISOString());

            if (yestErr) throw yestErr;
            const yestTotal = (yestData || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            setYesterdayCashSales(yestTotal);

            // 3. Fetch Total (All Time) Payments
            const { data: allData, error: allErr } = await supabase
                .from('payments')
                .select('amount, orders!inner(store_id)')
                .eq('payment_method', 'cash')
                .eq('status', 'completed')
                .eq('orders.store_id', selectedStore);

            if (allErr) throw allErr;
            const grandTotal = (allData || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            setTotalCashSales(grandTotal);

            // 4. Fetch Today's Manual Cash Registry Logs (cash_in, cash_out, opening_balance)
            const { data: regData, error: regErr } = await supabase
                .from('cash_registry')
                .select('*')
                .eq('store_id', selectedStore)
                .gte('created_at', todayStart.toISOString())
                .lte('created_at', todayEnd.toISOString())
                .order('created_at', { ascending: false });

            if (regErr) throw regErr;

            const adjustments = (regData || [])
                .filter(r => r.type === 'cash_in' || r.type === 'cash_out')
                .map(r => ({
                    id: r.id,
                    type: r.type,
                    amount: Number(r.amount) || 0,
                    reason: r.reason,
                    time: new Date(r.created_at)
                }));
            setCashEntries(adjustments);

            const openingRow = (regData || []).find(r => r.type === 'opening_balance');
            if (openingRow) {
                setOpeningBalance(openingRow.amount.toString());
            } else {
                setOpeningBalance("");
            }

        } catch (err) {
            console.error('Error fetching cash data:', err.message);
        } finally {
            setFetchingCashSales(false);
        }
    }, [selectedStore]);

    useEffect(() => {
        if (selectedStore) {
            fetchCashData();
        }
    }, [selectedStore, fetchCashData]);

    const handleSaveOpeningBalance = async (val) => {
        setOpeningBalance(val);
        if (!selectedStore) return;
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            // Check if opening balance already exists for today
            const { data: existing, error: findErr } = await supabase
                .from('cash_registry')
                .select('id')
                .eq('store_id', selectedStore)
                .eq('type', 'opening_balance')
                .gte('created_at', todayStart.toISOString())
                .lte('created_at', todayEnd.toISOString())
                .maybeSingle();

            if (findErr) throw findErr;

            const amountNum = Number(val) || 0;

            if (existing) {
                const { error: updErr } = await supabase
                    .from('cash_registry')
                    .update({ amount: amountNum })
                    .eq('id', existing.id);
                if (updErr) throw updErr;
            } else {
                const { error: insErr } = await supabase
                    .from('cash_registry')
                    .insert([{
                        store_id: selectedStore,
                        user_id: userProfile?.id || null,
                        type: 'opening_balance',
                        amount: amountNum,
                        reason: 'Opening Balance Setup'
                    }]);
                if (insErr) throw insErr;
            }
        } catch (err) {
            console.error('Failed to save opening balance:', err.message);
        }
    };

    const handleAddCashEntry = async (e) => {
        e.preventDefault();
        if (!cashForm.amount || Number(cashForm.amount) <= 0) return;
        try {
            const newAmount = Number(cashForm.amount);
            const newReason = cashForm.reason || (cashForm.type === 'cash_in' ? 'Cash In' : 'Cash Out');
            
            const { data, error } = await supabase
                .from('cash_registry')
                .insert([{
                    store_id: selectedStore,
                    user_id: userProfile?.id || null,
                    type: cashForm.type,
                    amount: newAmount,
                    reason: newReason
                }])
                .select()
                .single();

            if (error) throw error;

            const entry = {
                id: data.id,
                type: data.type,
                amount: Number(data.amount) || 0,
                reason: data.reason,
                time: new Date(data.created_at)
            };

            setCashEntries(prev => [entry, ...prev]);
            setCashForm({ type: 'cash_in', amount: '', reason: '' });
        } catch (err) {
            console.error('Failed to log till adjustment:', err.message);
        }
    };

    const computeClosingBalance = () => {
        const opening = Number(openingBalance) || 0;
        const sales = todayCashSales;
        const ins = cashEntries.filter(e => e.type === 'cash_in').reduce((s, e) => s + e.amount, 0);
        const outs = cashEntries.filter(e => e.type === 'cash_out').reduce((s, e) => s + e.amount, 0);
        return opening + sales + ins - outs;
    };

    return (
        <div className="space-y-8 animate-fast-slide pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
                <div>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Cash Desk</h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Dedicated Cash Management & Till Balance</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
                        <Banknote size={14} className="text-black" />
                        <select
                            value={selectedStore}
                            onChange={e => setSelectedStore(e.target.value)}
                            disabled={!isSuperAdmin || loadingStores}
                            className="appearance-none bg-transparent text-xs font-black text-black uppercase focus:outline-none cursor-pointer pr-8 py-1 disabled:opacity-50"
                        >
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        {isSuperAdmin && <ChevronDown size={14} className="text-black -ml-6" />}
                    </div>
                    <button
                        onClick={fetchCashData}
                        disabled={fetchingCashSales}
                        className="flex items-center gap-2 px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
                    >
                        <RefreshCw size={12} strokeWidth={3} className={fetchingCashSales ? 'animate-spin' : ''} />
                        {fetchingCashSales ? 'Fetching...' : 'Sync Cash Sales'}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Opening Balance */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Opening Balance</p>
                        <input
                            type="number"
                            min="0"
                            placeholder="₹ 0"
                            value={openingBalance}
                            onChange={e => setOpeningBalance(e.target.value)}
                            onBlur={e => handleSaveOpeningBalance(e.target.value)}
                            className="w-full text-2xl font-black text-black bg-transparent outline-none border-b-2 border-gray-100 focus:border-black pb-1 transition-colors"
                        />
                    </div>
                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Enter manually for till startup</p>
                </div>

                {/* Cash Sales (Today & Yesterday) */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
                    <div className="space-y-1.5 w-full">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cash Sales Stats</p>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Today</span>
                            <span className="text-[13px] font-black text-black">₹{todayCashSales.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1.5">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Yesterday</span>
                            <span className="text-[13px] font-black text-gray-600">₹{yesterdayCashSales.toLocaleString()}</span>
                        </div>
                    </div>
                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Auto-pulled from completed orders</p>
                </div>

                {/* Closing Balance */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estimated Till Balance</p>
                        <p className="text-3xl font-black text-black mt-2">₹{computeClosingBalance().toLocaleString()}</p>
                    </div>
                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Calculated Closing Total</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Entry Form */}
                <div className="bg-gray-50 rounded-[32px] p-8 border border-gray-100 h-fit">
                    <h4 className="text-[10px] font-black text-black uppercase tracking-[0.2em] border-b border-gray-200 pb-3 mb-6 flex items-center gap-2">
                        <IndianRupee size={14} /> Register Till Adjustment
                    </h4>
                    <form onSubmit={handleAddCashEntry} className="space-y-6">
                        {/* Type */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Adjustment Type</label>
                            <div className="flex bg-white border border-gray-150 rounded-2xl overflow-hidden p-1 gap-1">
                                <button
                                    type="button"
                                    onClick={() => setCashForm(f => ({ ...f, type: 'cash_in' }))}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                                        cashForm.type === 'cash_in' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-400 hover:text-black'
                                    }`}
                                >
                                    <TrendingUp size={13} /> Cash In
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCashForm(f => ({ ...f, type: 'cash_out' }))}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                                        cashForm.type === 'cash_out' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400 hover:text-black'
                                    }`}
                                >
                                    <TrendingDown size={13} /> Cash Out
                                </button>
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                            <input
                                required
                                type="number"
                                min="1"
                                value={cashForm.amount}
                                onChange={e => setCashForm(f => ({ ...f, amount: e.target.value }))}
                                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[14px] font-black text-black outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                                placeholder="0"
                            />
                        </div>

                        {/* Reason */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Reference / Note</label>
                            <input
                                type="text"
                                value={cashForm.reason}
                                onChange={e => setCashForm(f => ({ ...f, reason: e.target.value }))}
                                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[11px] font-bold text-black outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all uppercase tracking-wide placeholder:text-gray-300"
                                placeholder="e.g. Daily Tea Expense"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
                        >
                            Record Transaction
                        </button>
                    </form>
                </div>

                {/* Cash Log */}
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-[32px] overflow-hidden flex flex-col shadow-sm min-h-[450px]">
                    {/* Log Tabs */}
                    <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <span className="text-[10px] font-black text-black uppercase tracking-[0.2em]">Till Log (Today)</span>
                        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-150 shadow-sm">
                            <button
                                type="button"
                                onClick={() => setActiveLogTab('adjustments')}
                                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${
                                    activeLogTab === 'adjustments' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'
                                }`}
                            >
                                Adjustments
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                                    activeLogTab === 'adjustments' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                    {cashEntries.length}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveLogTab('sales')}
                                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${
                                    activeLogTab === 'sales' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'
                                }`}
                            >
                                Sales Payments
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                                    activeLogTab === 'sales' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                    {orderPayments.length}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        {activeLogTab === 'adjustments' ? (
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Time</th>
                                        <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Flow</th>
                                        <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Reference Details</th>
                                        <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Volume</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {cashEntries.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-24 text-center">
                                                <div className="text-gray-300 text-[10px] font-black uppercase tracking-widest">No Manual Adjustments Logged</div>
                                                <p className="text-[8px] text-gray-400 uppercase tracking-widest mt-1">Till has only auto sales records</p>
                                            </td>
                                        </tr>
                                    )}
                                    {cashEntries.map(entry => (
                                        <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                {entry.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                    entry.type === 'cash_in'
                                                        ? 'bg-green-50 text-green-700'
                                                        : 'bg-red-50 text-red-600'
                                                }`}>
                                                    {entry.type === 'cash_in'
                                                        ? <TrendingUp size={11} />
                                                        : <TrendingDown size={11} />
                                                    }
                                                    {entry.type === 'cash_in' ? 'Cash In' : 'Cash Out'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-[11px] font-bold text-black uppercase tracking-tight">{entry.reason}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`text-[13px] font-black ${
                                                    entry.type === 'cash_in' ? 'text-green-600' : 'text-red-500'
                                                }`}>
                                                    {entry.type === 'cash_in' ? '+' : '-'}₹{entry.amount.toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Time</th>
                                        <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Order #</th>
                                        <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                                        <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {orderPayments.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-24 text-center">
                                                <div className="text-gray-300 text-[10px] font-black uppercase tracking-widest">No Order Cash Payments Today</div>
                                                <p className="text-[8px] text-gray-400 uppercase tracking-widest mt-1">Cash sales will appear automatically on order completion</p>
                                            </td>
                                        </tr>
                                    )}
                                    {orderPayments.map(payment => (
                                        <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                {payment.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-[10px] font-black text-black uppercase tracking-widest">
                                                {payment.orderNumber}
                                            </td>
                                            <td className="px-6 py-4 text-[11px] font-bold text-black uppercase tracking-tight">
                                                {payment.customerName}
                                            </td>
                                            <td className="px-6 py-4 text-right text-[13px] font-black text-green-600">
                                                +₹{payment.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
