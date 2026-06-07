import React from 'react';
import { Phone, MapPin } from 'lucide-react';
import { INVOICE_BRAND } from '../../constants/brand';
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

const InvoiceLayout = React.forwardRef(({ 
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
      className="bg-white shadow-2xl rounded-xl p-10 font-sans border border-gray-100 shrink-0"
      style={style}
    >
      {/* Header / Business Identity */}
      <div className="flex flex-col gap-4 mb-4">
        {/* Top: Branding - Logo & Company Name */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 flex items-center justify-center rounded-xl overflow-hidden shadow-sm ring-1 ring-slate-200">
            <img src={logoImg} alt="Company logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-extrabold text-black tracking-widest uppercase mb-0.5">THE LENSCARE</span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">{INVOICE_BRAND.headerTitle}</h1>
            <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase mt-0.5">{INVOICE_BRAND.headerSubtitle}</p>
          </div>
        </div>

        {/* Middle: Invoice Meta (Left) & Company Contact (Right) */}
        <div className="flex flex-row items-stretch gap-6">
          {/* Left: Company Details */}
          <div className="w-1/2 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-center gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <Phone size={14} className="text-slate-400" />
              <span className="text-xs font-medium">Mobile: <span className="text-slate-900">{displayPhone}</span></span>
            </div>
            <div className="flex items-start gap-2 text-slate-600">
              <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
              <div className="text-xs leading-relaxed">
                <p>{displayAddress}</p>
              </div>
            </div>
            {displayGstin && (
              <div className="flex items-center gap-2 text-slate-600 border-t border-slate-100 pt-2 mt-2">
                <span className="text-xs font-medium">GST No: <span className="text-slate-900 font-semibold">{displayGstin}</span></span>
              </div>
            )}
          </div>

          {/* Right: Invoice Block */}
          <div className="w-1/2 flex flex-col bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase mb-4">Invoice</h2>
            <div className="w-full flex justify-between items-center gap-8 mb-3 border-b border-slate-200/60 pb-3">
              <span className="text-sm font-medium text-slate-500">Invoice No.</span>
              <span className="text-sm font-bold text-slate-900">{order?.id || '-'}</span>
            </div>
            <div className="w-full flex justify-between items-center gap-8">
              <span className="text-sm font-medium text-slate-500">Issue Date</span>
              <span className="text-sm font-bold text-slate-900">{new Date(order?.created_at || new Date()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-slate-300 mb-4" />

      {/* Company & Customer Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-500">
              <MapPin size={12} />
            </div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Billed From</p>
          </div>
          <p className="font-extrabold text-black text-lg mb-0.5">{INVOICE_BRAND.billedFromName}</p>
          <p className="text-slate-600 text-xs font-medium">Phone: {displayPhone}</p>
          <p className="text-slate-600 text-xs leading-tight">{displayAddress}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-black">
              <span className="font-bold text-xs font-black">To</span>
            </div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Billed To</p>
          </div>
          <p className="font-bold text-slate-900 text-base mb-0.5">{customerName}</p>
          <p className="text-slate-600 text-sm font-medium leading-none">{customerPhone}</p>
          {order?.customers?.email && <p className="text-slate-500 text-xs mt-0.5 lowercase">{order?.customers?.email}</p>}
        </div>
      </div>

      {/* Items Table - No scroll, fits page width */}
      <div className="border border-slate-400 rounded-2xl mb-4 overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-400 text-slate-600 font-semibold">
              <th className="text-left py-4 px-4 uppercase tracking-wider text-[10px] w-[25%] border-r border-slate-400">Product</th>
              <th className="text-center py-4 px-1 uppercase tracking-wider text-[10px] w-[5%] whitespace-nowrap border-r border-slate-400">Qty</th>
              <th className="text-right py-4 px-1 uppercase tracking-wider text-[10px] w-[9%] whitespace-nowrap border-r border-slate-400">Price</th>
              <th className="text-right py-4 px-1 uppercase tracking-wider text-[10px] w-[9%] whitespace-nowrap border-r border-slate-400">Disc.</th>
              <th className="text-right py-4 px-1 uppercase tracking-wider text-[10px] w-[10%] whitespace-nowrap border-r border-slate-400">Taxable</th>
              <th className="text-center py-4 px-1 uppercase tracking-wider text-[10px] w-[6%] whitespace-nowrap border-r border-slate-400">SGST%</th>
              <th className="text-right py-4 px-1 uppercase tracking-wider text-[10px] w-[8%] whitespace-nowrap border-r border-slate-400">SGST</th>
              <th className="text-center py-4 px-1 uppercase tracking-wider text-[10px] w-[6%] whitespace-nowrap border-r border-slate-400">CGST%</th>
              <th className="text-right py-4 px-1 uppercase tracking-wider text-[10px] w-[8%] whitespace-nowrap border-r border-slate-400">CGST</th>
              <th className="text-right py-4 px-4 uppercase tracking-wider text-[10px] w-[14%] text-slate-900 whitespace-nowrap">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-400">
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
                <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-4 font-bold text-slate-900 text-xs border-r border-slate-400">
                    {item.products_list?.name || 'Custom Product'}
                  </td>
                  <td className="py-2 px-1 text-center font-medium text-slate-900 border-r border-slate-400">{q}</td>
                  <td className="py-2 px-1 text-right font-medium text-slate-900 border-r border-slate-400">₹{p.toLocaleString()}</td>
                  <td className="py-2 px-1 text-right font-medium text-black border-r border-slate-400">-₹{d.toLocaleString()}</td>
                  <td className="py-2 px-1 text-right font-medium text-slate-900 text-[10px] border-r border-slate-400">₹{taxable.toFixed(2)}</td>
                  <td className="py-2 px-1 text-center font-medium text-slate-500 text-[10px] border-r border-slate-400">{sgstR.toFixed(1)}%</td>
                  <td className="py-2 px-1 text-right font-medium text-slate-500 text-[10px] border-r border-slate-400">₹{sgstA.toFixed(2)}</td>
                  <td className="py-2 px-1 text-center font-medium text-slate-500 text-[10px] border-r border-slate-400">{cgstR.toFixed(1)}%</td>
                  <td className="py-2 px-1 text-right font-medium text-slate-500 text-[10px] border-r border-slate-400">₹{cgstA.toFixed(2)}</td>
                  <td className="py-2 px-4 text-right font-black text-slate-900 text-xs">₹{Math.round(total).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-400 font-bold text-slate-900 text-xs">
              <td className="py-2 px-4 text-left border-r border-slate-400 uppercase tracking-tighter">Total</td>
              <td className="py-2 px-1 text-center border-r border-slate-400">{order?.order_items?.reduce((sum, item) => sum + Number(item.qty || 0), 0)}</td>
              <td className="py-2 px-1 border-r border-slate-400"></td>
              <td className="py-2 px-1 text-right border-r border-slate-400 text-black">₹{Number(totals.itemDiscount || 0).toLocaleString()}</td>
              <td className="py-2 px-1 text-right border-r border-slate-400 text-[10px]">₹{Number(totals.taxableAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className="py-2 px-1 border-r border-slate-400"></td>
              <td className="py-2 px-1 text-right border-r border-slate-400 text-[10px]">₹{Number(totals.sgst || 0).toFixed(2)}</td>
              <td className="py-2 px-1 border-r border-slate-400"></td>
              <td className="py-2 px-1 text-right border-r border-slate-400 text-[10px]">₹{Number(totals.cgst || 0).toFixed(2)}</td>
              <td className="py-2 px-4 text-right">₹{Math.round(Number(totals.total || 0)).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex flex-row justify-between items-start gap-8 mb-4">
        <div className="w-1/2">
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
                <div className="overflow-hidden border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-center">
                    <thead className="bg-slate-50 border-b border-slate-200">
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
                            <tr className="bg-slate-50/30">
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
                            <tr className="bg-slate-50/30">
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

        <div className="w-80 bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div className="space-y-3">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-500 font-medium">Total Paid</span>
              <span className="text-black font-bold">₹{Number(totals.paid).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-900 font-bold uppercase tracking-tight">Total Due</span>
              <span className="text-lg font-black text-black tracking-tight">₹{Number(totals.due).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-1">
              <span className="text-xs text-slate-500 font-bold">Total Amount</span>
              <span className="text-lg font-black text-slate-900 tracking-tight">₹{Number(totals.total).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* NEW REFERENCES SECTIONS */}
      <div className="grid grid-cols-2 gap-8 mb-2">
        {/* Left Col: Amount in Words & Terms */}
        <div className="space-y-4">
          <div className="text-left">
            <h3 className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mb-1">Amount in words</h3>
            <p className="text-[11px] font-bold text-slate-900 italic leading-tight">
              Rupees {numberToWords(Math.round(Number(totals.total)))} Only
            </p>
          </div>

          <div>
            <h3 className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mb-2">Terms & Conditions</h3>
            <ul className="text-[9px] text-slate-500 space-y-0.5 list-decimal pl-4 leading-tight">
              <li>Goods once sold will not be taken back or exchanged.</li>
              <li>Delivery will be made only on production of this invoice.</li>
              <li>Subject to local jurisdiction only.</li>
            </ul>
          </div>
        </div>

        {/* Right Col: Signatures */}
        <div className="flex flex-col justify-end items-end">
          <div className="flex flex-col items-center gap-6 mt-4">
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-900 mb-6 lowercase first-letter:uppercase">For "The Lenscare" {storeName}</p>
              <div className="w-40 h-[1px] bg-slate-300 mb-1"></div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-300 mt-6 pt-6 flex flex-col items-center justify-center gap-2">
        <div className="w-12 h-1 bg-slate-200 rounded-full mb-2"></div>
        <p className="text-sm font-semibold text-slate-800">Thank you for your business!</p>
        <p className="text-xs text-slate-400 font-medium tracking-wide border px-3 py-1 rounded-full border-slate-200">
          © {new Date().getFullYear()} {INVOICE_BRAND.headerTitle}
        </p>
      </div>
    </div>
  );
});

export default InvoiceLayout;
