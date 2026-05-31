import React from 'react';
import { Phone, MapPin } from 'lucide-react';
const logoImg = '/assets/images/image.png';;

const numberToWords = (num) => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return ''; 
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim();
};

const pickBestEyePower = (eyePowerRows) => {
  if (!Array.isArray(eyePowerRows) || eyePowerRows.length === 0) return null;

  const isNonEmpty = (v) => {
    if (v == null) return false;
    const s = String(v).trim();
    return s !== '' && s !== '-' && s !== '—';
  };

  const scoreRow = (row) => {
    if (!row) return 0;
    const fields = [
      row.dv_right_sph,
      row.dv_right_cyl,
      row.dv_right_axis,
      row.nv_right_sph,
      row.nv_right_cyl,
      row.nv_right_axis,
      row.dv_left_sph,
      row.dv_left_cyl,
      row.dv_left_axis,
      row.nv_left_sph,
      row.nv_left_cyl,
      row.nv_left_axis,
    ];
    return fields.reduce((acc, v) => acc + (isNonEmpty(v) ? 1 : 0), 0);
  };

  const sorted = [...eyePowerRows].sort((a, b) => {
    const scoreDiff = scoreRow(b) - scoreRow(a);
    if (scoreDiff !== 0) return scoreDiff;
    const at = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const bt = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return bt - at;
  });

  const best = sorted[0];
  return scoreRow(best) > 0 ? best : null;
};

const PdfInvoiceLayout = React.forwardRef(({ 
  id,
  order, storeName, headerTitle, displayGstin, displayPhone, displayAddress, 
  customerName, customerPhone, totals, isDelivered, displayPaymentStatus,
  storeDetails,
  style = {}
}, ref) => {
  return (
    <div 
      id={id}
      ref={ref}
      className="bg-white font-sans shrink-0"
      style={style}
    >
      {/* Header / Business Identity */}
      <div className="flex items-center gap-4 px-8 pt-4 pb-2">
        <div className="w-[100px] h-14 bg-black rounded-xl overflow-hidden shadow-sm shrink-0">
          <img src={logoImg} alt="Company logo" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-[11px] font-bold text-black tracking-wider uppercase mb-0.5">THE LENSCARE</span>
          <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase">{headerTitle || 'BONTHUS OPTICALS'}</h1>
          <p className="text-[11px] font-semibold text-slate-500 mt-0.5 tracking-[0.1em] uppercase whitespace-nowrap">Pvt Ltd</p>
        </div>
      </div>

      {/* Primary Info Cards */}
      <div className="grid grid-cols-2 gap-3 px-8 mb-3">
        {/* Company Details */}
        <div className="bg-[#f8f9fc] rounded-2xl p-4 border border-slate-100 flex flex-col gap-2 min-h-[100px]">
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-slate-400" />
            <span className="text-[13px] text-slate-800">Phone: {displayPhone}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
            <div className="text-[12px] text-slate-600 leading-tight">
              <p>{displayAddress}</p>
            </div>
          </div>
          {displayGstin && (
            <div className="flex items-center gap-2 text-slate-600 border-t border-slate-100 pt-2 mt-2">
              <span className="text-[13px] font-medium">GST No: <span className="font-semibold text-slate-800">{displayGstin}</span></span>
            </div>
          )}
        </div>

        {/* Invoice Info */}
        <div className="bg-[#f8f9fc] rounded-2xl p-4 border border-slate-100 flex flex-col items-start justify-start min-h-[100px]">
          <h2 className="text-[24px] font-black text-slate-900 mb-1">INVOICE</h2>
          <div className="space-y-0.5">
            <p className="text-[14px] text-slate-700 font-medium text-left italic opacity-90">Invoice: <span className="font-bold text-slate-900 not-italic">{order?.id || '-'}</span></p>
            <p className="text-[14px] text-slate-700 font-medium text-left italic opacity-90">Date: <span className="font-bold text-slate-900 not-italic">{new Date(order?.created_at || new Date()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
          </div>
        </div>
      </div>

      {/* Secondary Info Cards (Billing) */}
      <div className="grid grid-cols-2 gap-4 px-8 mb-6">
        <div className="bg-[#f8f9fc] rounded-2xl p-6 border border-slate-100 flex flex-col min-h-[120px]">
          <p className="text-[12px] text-slate-500 font-bold tracking-wider mb-2 uppercase">BILLED FROM</p>
          <p className="font-extrabold text-black text-[18px] mb-1">THE LENSCARE</p>
          <p className="font-bold text-slate-900 text-[15px] uppercase mb-1">{storeName}</p>
          <p className="text-slate-600 text-[13px] leading-relaxed">
            Phone: {displayPhone}
            <br />
            {displayAddress}
          </p>
        </div>

        <div className="bg-[#f8f9fc] rounded-2xl p-6 border border-slate-100 flex flex-col min-h-[120px]">
          <p className="text-[12px] text-slate-500 font-bold tracking-wider mb-2 uppercase">BILLED TO</p>
          <p className="font-bold text-slate-900 text-[16px] uppercase mb-1">{customerName}</p>
          <p className="text-slate-600 text-[13px]">Phone: {customerPhone}</p>
          {order?.customers?.email && <p className="text-slate-500 text-[13px] mt-0.5">{order?.customers?.email}</p>}
        </div>
      </div>

      {/* Items Table (Lines 77+) remained standard box as previous turn... but I will re-include it to be sure it matches user expectation */}
      <div className="px-8 mb-6">
        <div className="overflow-hidden">
          <table className="w-full text-[13px] border-collapse border border-slate-400">
            <thead>
              <tr className="bg-[#f8f9fc] border-b border-slate-400">
                <th className="border-r border-slate-400 text-left py-3 px-4 font-bold text-slate-800 w-[20%]">Product</th>
                <th className="border-r border-slate-400 text-center py-3 px-2 font-bold text-slate-800 w-[5%]">Qty</th>
                <th className="border-r border-slate-400 text-right py-3 px-2 font-bold text-slate-800 w-[10%]">Price</th>
                <th className="border-r border-slate-400 text-right py-3 px-2 font-bold text-slate-800 w-[10%]">Disc</th>
                <th className="border-r border-slate-400 text-right py-3 px-2 font-bold text-slate-800 w-[11%]">Taxable</th>
                <th className="border-r border-slate-400 text-center py-3 px-2 font-bold text-slate-800 w-[8%]">SGST<br/>%</th>
                <th className="border-r border-slate-400 text-right py-3 px-2 font-bold text-slate-800 w-[8%]">SGST</th>
                <th className="border-r border-slate-400 text-center py-3 px-2 font-bold text-slate-800 w-[8%]">CGST<br/>%</th>
                <th className="border-r border-slate-400 text-right py-3 px-2 font-bold text-slate-800 w-[8%]">CGST</th>
                <th className="text-right py-3 px-4 font-bold text-slate-800 w-[12%]">Total</th>
              </tr>
            </thead>
            <tbody>
              {order?.order_items?.map((item) => {
                const q = Number(item.qty || 0);
                const p = Number(item.price || 0);
                const d = Number(item.discount_amt || 0);

                const sgstR = Number(item.products_list?.products_category?.sgst || 0);
                const cgstR = Number(item.products_list?.products_category?.cgst || 0);
                const totalTaxR = sgstR + cgstR;

                let taxable, sgstA, cgstA, total;
                if (totals.isLegacy) {
                  taxable = (q * p) - d;
                  sgstA = (taxable * sgstR) / 100;
                  cgstA = (taxable * cgstR) / 100;
                  total = taxable + sgstA + cgstA;
                } else {
                  total = (q * p) - d;
                  taxable = total / (1 + totalTaxR / 100);
                  sgstA = (taxable * sgstR) / 100;
                  cgstA = (taxable * cgstR) / 100;
                }

                return (
                  <tr key={item.id} className="bg-white border-b border-slate-400 last:border-b-0">
                    <td className="border-r border-slate-400 py-1.5 px-4 text-slate-600 font-medium uppercase text-[11px]">
                      {item.products_list?.name || 'Custom Product'}
                    </td>
                    <td className="border-r border-slate-400 py-1.5 px-2 text-center text-slate-600">{q}</td>
                    <td className="border-r border-slate-400 py-1.5 px-2 text-right text-slate-600">{p.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="border-r border-slate-400 py-1.5 px-2 text-right text-black">-{d.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="border-r border-slate-400 py-1.5 px-2 text-right text-slate-600 text-[11px] font-bold">{taxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="border-r border-slate-400 py-1.5 px-2 text-center text-slate-500 text-[10px]">{sgstR.toFixed(1)}%</td>
                    <td className="border-r border-slate-400 py-1.5 px-2 text-right text-slate-500 text-[10px]">{sgstA.toFixed(2)}</td>
                    <td className="border-r border-slate-400 py-1.5 px-2 text-center text-slate-500 text-[10px]">{cgstR.toFixed(1)}%</td>
                    <td className="border-r border-slate-400 py-1.5 px-2 text-right text-slate-500 text-[10px]">{cgstA.toFixed(2)}</td>
                    <td className="py-1.5 px-4 text-right font-bold text-slate-900">₹{Math.round(total).toLocaleString()}</td>
                  </tr>
                );
              })}
              <tr className="bg-[#f8f9fc] border-t border-slate-400 font-bold text-[12px]">
                <td className="border-r border-slate-400 py-2 px-4 text-slate-900 uppercase italic">Total</td>
                <td className="border-r border-slate-400 py-2 px-2 text-center text-slate-900">{order?.order_items?.reduce((sum, item) => sum + Number(item.qty || 0), 0)}</td>
                <td className="border-r border-slate-400 py-2 px-2"></td>
                <td className="border-r border-slate-400 py-2 px-2 text-right text-black">₹{Number(totals.itemDiscount || 0).toLocaleString()}</td>
                <td className="border-r border-slate-400 py-2 px-2 text-right text-slate-900 text-[11px]">₹{Number(totals.taxableAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="border-r border-slate-400 py-2 px-2"></td>
                <td className="border-r border-slate-400 py-2 px-2 text-right text-slate-900 text-[10px]">₹{Number(totals.sgst || 0).toFixed(2)}</td>
                <td className="border-r border-slate-400 py-2 px-2"></td>
                <td className="py-2 px-1 text-right border-r border-slate-400 text-[10px]">₹{Number(totals.cgst || 0).toFixed(2)}</td>
                <td className="py-2 px-4 text-right font-black text-slate-900 text-[13px]">₹{Math.round(Number(totals.total || 0)).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals Section */}
      <div className="flex flex-row justify-between items-start px-8 mb-8">
        <div className="w-[45%]">
          {(() => {
            const ep = pickBestEyePower(order?.eye_power);
            if (!ep) return null;

            const isNonEmpty = (v) => {
              if (v == null) return false;
              const s = String(v).trim();
              return s !== '' && s !== '-' && s !== '—';
            };

            const hasRightDv =
              isNonEmpty(ep.dv_right_sph) ||
              isNonEmpty(ep.dv_right_cyl) ||
              isNonEmpty(ep.dv_right_axis);
            const hasRightNv =
              isNonEmpty(ep.nv_right_sph) ||
              isNonEmpty(ep.nv_right_cyl) ||
              isNonEmpty(ep.nv_right_axis);
            const hasLeftDv =
              isNonEmpty(ep.dv_left_sph) ||
              isNonEmpty(ep.dv_left_cyl) ||
              isNonEmpty(ep.dv_left_axis);
            const hasLeftNv =
              isNonEmpty(ep.nv_left_sph) ||
              isNonEmpty(ep.nv_left_cyl) ||
              isNonEmpty(ep.nv_left_axis);

            const hasRE = hasRightDv || hasRightNv;
            const hasLE = hasLeftDv || hasLeftNv;
            const hasBothVision = (hasRightDv && hasRightNv) || (hasLeftDv && hasLeftNv);

                      const parseOpticalValue = (val) => {
                        if (val == null) return null;
                        const s = String(val).toUpperCase().trim();
                        if (!s || s === '-' || s === '—') return null;
                        if (s === 'PL' || s === 'PLANO') return 0;
                        const num = Number.parseFloat(s);
                        return Number.isFinite(num) ? num : null;
                      };

                      const formatOptical = (val, { kind } = {}) => {
                        if (val == null) return '-';
                        const s = String(val).trim();
                        if (!s || s === '-' || s === '—') return '-';
                        const upper = s.toUpperCase();
                        if (upper === 'PL' || upper === 'PLANO') return 'PL';
                        if (kind === 'axis') {
                          const axisNum = Number.parseInt(s, 10);
                          return Number.isFinite(axisNum) ? String(axisNum) : s;
                        }
                        const num = Number.parseFloat(s);
                        if (!Number.isFinite(num)) return s;
                        const fixed = num.toFixed(2);
                        if (num > 0) return `+${fixed}`;
                        return fixed;
                      };

                      const computeAddNum = (nv, dv) => {
                        const nvNum = parseOpticalValue(nv);
                        const dvNum = parseOpticalValue(dv);
                        if (nvNum == null || dvNum == null) return null;
                        return nvNum - dvNum;
                      };

                      const formatAdd = (addNum) => {
                        if (addNum == null || !Number.isFinite(addNum)) return '-';
                        return addNum >= 0 ? `+${addNum.toFixed(2)}` : addNum.toFixed(2);
                      };

                      const directRightAdd = computeAddNum(ep.nv_right_sph, ep.dv_right_sph);
                      const directLeftAdd = computeAddNum(ep.nv_left_sph, ep.dv_left_sph);

                      const isPlausibleAdd = (addNum) => {
                        // Addition power is typically positive; negative values usually indicate bad/partial data.
                        return addNum != null && Number.isFinite(addNum) && addNum >= 0;
                      };

                      const rightAddOk = isPlausibleAdd(directRightAdd);
                      const leftAddOk = isPlausibleAdd(directLeftAdd);
                      const EPSILON = 0.01;

                      // If both eyes produce plausible but different ADD values, keep them as-is (rare case).
                      // Otherwise, use a common ADD for both eyes (usual rule).
                      const hasDifferentAdds =
                        rightAddOk &&
                        leftAddOk &&
                        Math.abs(directRightAdd - directLeftAdd) > EPSILON;

                      const commonAdd = rightAddOk ? directRightAdd : leftAddOk ? directLeftAdd : null;
                      const resolvedRightAdd = hasDifferentAdds ? directRightAdd : commonAdd;
                      const resolvedLeftAdd = hasDifferentAdds ? directLeftAdd : commonAdd;

                      const rightHasNvRow = hasRightNv;
                      const leftHasNvRow = hasLeftNv;

            return (
              <div className="mb-6">
                <h3 className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-2">POWER</h3>
                <div className="overflow-hidden border border-slate-200 rounded-lg">
                  <table className="w-full text-xs text-center">
                    <thead className="bg-[#f8f9fc] border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 font-semibold text-slate-600 text-left">Eye</th>
                        <th className="py-2 px-3 font-semibold text-slate-600">SPH</th>
                        <th className="py-2 px-3 font-semibold text-slate-600">CYL</th>
                        <th className="py-2 px-3 font-semibold text-slate-600">Axis</th>
                        {hasBothVision ? (
                          <th className="py-2 px-3 font-bold text-gray-500 italic border-l border-slate-200">ADD</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 italic">
                      {/* Right Eye Group */}
                      {hasRE && (
                        <>
                          <tr className="bg-white">
                            <td className="py-1.5 px-3 font-bold text-slate-800 text-left border-r border-slate-100">RE (DV)</td>
                            <td className="py-1.5 px-3 text-slate-600">{formatOptical(ep.dv_right_sph, { kind: 'sph' })}</td>
                            <td className="py-1.5 px-3 text-slate-500">{formatOptical(ep.dv_right_cyl, { kind: 'cyl' })}</td>
                            <td className="py-1.5 px-3 text-slate-500">{formatOptical(ep.dv_right_axis, { kind: 'axis' })}</td>
                            {hasBothVision && (
                              <td rowSpan={rightHasNvRow ? 2 : 1} className="py-1.5 px-3 text-gray-500 font-bold border-l border-slate-100 bg-gray-50 text-center align-middle">
                                {formatAdd(resolvedRightAdd)}
                              </td>
                            )}
                          </tr>
                          {rightHasNvRow && (
                            <tr className="bg-gray-50">
                              <td className="py-1.5 px-3 font-bold text-black text-left border-r border-slate-100">RE (NV)</td>
                              <td className="py-1.5 px-3 text-slate-600 font-medium">{formatOptical(ep.nv_right_sph, { kind: 'sph' })}</td>
                              <td className="py-1.5 px-3 text-slate-400 opacity-50">{formatOptical(ep.nv_right_cyl ?? ep.dv_right_cyl, { kind: 'cyl' })}</td>
                              <td className="py-1.5 px-3 text-slate-400 opacity-50">{formatOptical(ep.nv_right_axis ?? ep.dv_right_axis, { kind: 'axis' })}</td>
                            </tr>
                          )}
                        </>
                      )}

                      {/* Left Eye Group */}
                      {hasLE && (
                        <>
                          <tr className="bg-white border-t border-slate-200">
                            <td className="py-1.5 px-3 font-bold text-slate-800 text-left border-r border-slate-100">LE (DV)</td>
                            <td className="py-1.5 px-3 text-slate-600">{formatOptical(ep.dv_left_sph, { kind: 'sph' })}</td>
                            <td className="py-1.5 px-3 text-slate-500">{formatOptical(ep.dv_left_cyl, { kind: 'cyl' })}</td>
                            <td className="py-1.5 px-3 text-slate-500">{formatOptical(ep.dv_left_axis, { kind: 'axis' })}</td>
                            {hasBothVision && (
                              <td rowSpan={leftHasNvRow ? 2 : 1} className="py-1.5 px-3 text-gray-500 font-bold border-l border-slate-100 bg-gray-50 text-center align-middle">
                                {formatAdd(resolvedLeftAdd)}
                              </td>
                            )}
                          </tr>
                          {leftHasNvRow && (
                            <tr className="bg-gray-50">
                              <td className="py-1.5 px-3 font-bold text-black text-left border-r border-slate-100">LE (NV)</td>
                              <td className="py-1.5 px-3 text-slate-600 font-medium">{formatOptical(ep.nv_left_sph, { kind: 'sph' })}</td>
                              <td className="py-1.5 px-3 text-slate-400 opacity-50">{formatOptical(ep.nv_left_cyl ?? ep.dv_left_cyl, { kind: 'cyl' })}</td>
                              <td className="py-1.5 px-3 text-slate-400 opacity-50">{formatOptical(ep.nv_left_axis ?? ep.dv_left_axis, { kind: 'axis' })}</td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="w-[300px] bg-[#f8f9fc] rounded-xl p-4 border border-slate-200">
          <div className="space-y-2">
            <div className="flex justify-between text-[14px]">
              <span className="text-slate-600 font-medium">Total Paid</span>
              <span className="text-black font-medium">₹{Number(totals.paid).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-slate-900 font-bold uppercase">TOTAL DUE</span>
              <span className="text-black font-medium">₹{Number(totals.due).toLocaleString()}</span>
            </div>
            <div className="w-full h-px bg-slate-200 my-1"></div>
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-slate-600 font-medium">Total Amount</span>
              <span className="text-[14px] font-bold text-slate-900">₹{Number(totals.total).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* NEW REFERENCES SECTIONS */}
      <div className="grid grid-cols-2 gap-6 px-8 mb-4 mt-2">
        {/* Left Column: Amount in Words & Terms */}
        <div className="space-y-3">
          <div>
            <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">AMOUNT IN WORDS</h3>
            <p className="text-[12px] font-bold text-slate-900 italic leading-tight">
              Rupees {numberToWords(Math.round(Number(totals.total)))} Only
            </p>
          </div>
          <div>
            <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">TERMS & CONDITIONS</h3>
            <div className="text-[10px] text-slate-500 leading-tight space-y-0.5">
              <p>1. Goods once sold will not be exchanged or returned.</p>
              <p>2. Subject to local jurisdiction only.</p>
              <p>3. Delivery against original invoice only.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Signatures */}
        <div className="flex flex-col justify-end items-end text-right">
          <div className="mt-4 flex flex-col items-center">
            <p className="text-[11px] font-bold text-slate-900 mb-6 lowercase first-letter:uppercase">For"The Lenscare" {storeName}</p>
            <div className="w-40 h-[1px] bg-slate-400 mb-1"></div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Authorized Signatory</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mx-8 border-t border-slate-100 pt-6 pb-8 flex flex-col items-center justify-center gap-3">
        <div className="w-16 h-1.5 bg-slate-100 rounded-full"></div>
        <p className="text-[14px] font-bold text-slate-800">Thank you for your business!</p>
        <div className="px-5 py-1.5 border border-slate-200 rounded-full">
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              © {new Date().getFullYear()} {(storeName || '').toUpperCase()}
            </p>
        </div>
      </div>
    </div>
  );
});

export default PdfInvoiceLayout;
