import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../server/supabase/supabase';
import { sendWhatsAppInvoice } from '../server/supabase/whatsappApi';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import InvoiceLayout from '../components/layout/InvoiceLayout';
import PdfInvoiceLayout from '../components/layout/PdfInvoiceLayout';
import { Copy, MessageCircle, Download, Eye, Share2 } from 'lucide-react';
import { INVOICE_BRAND } from '../constants/brand';



export default function InvoiceView({ userProfile }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [storeDetails, setStoreDetails] = useState(null);
  const [waSending, setWASending] = useState(false);
  const [waSent, setWASent] = useState(false);
  const [waError, setWAError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [showExportTarget, setShowExportTarget] = useState(false);
  const shareMenuRef = useRef(null);
  const exportInvoiceRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const updateScale = () => {
      const parentWidth = window.innerWidth - 32;
      const invoiceWidth = 800;
      if (parentWidth < invoiceWidth) {
        setScale(parentWidth / invoiceWidth);
      } else {
        setScale(1);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [order]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) {
        setShowShareMenu(false);
      }
    }

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);

  // Poll for order status changes (e.g., when status changes from Processing to Delivered)
  useEffect(() => {
    if (!id) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data: freshData, error } = await supabase
          .from('orders')
          .select('status')
          .eq('id', id)
          .single();

        if (!error && freshData) {
          setOrder((prevOrder) => {
            if (prevOrder && prevOrder.status !== freshData.status) {
              return { ...prevOrder, status: freshData.status };
            }
            return prevOrder;
          });
        }
      } catch (err) {
        console.error('Error polling for status changes:', err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [id]);

  // WhatsApp Business API credentials - LOAD FROM ENVIRONMENT ONLY
  const WA_PHONE_NUMBER_ID = process.env.REACT_APP_WA_PHONE_NUMBER_ID;
  const WA_ACCESS_TOKEN = process.env.REACT_APP_WA_ACCESS_TOKEN;
  
  // Validate credentials are configured
  if (!WA_PHONE_NUMBER_ID || !WA_ACCESS_TOKEN) {
    console.error('WhatsApp credentials not configured in environment variables');
  }

  async function handleWhatsAppApiSend() {
    setWASending(true);
    setWAError("");
    setWASent(false);

    try {
      let to = order?.customers?.phone || "";
      to = to.replace(/\D/g, "");
      if (to.startsWith("0")) to = "91" + to.slice(1);
      if (!to.startsWith("91")) to = "91" + to;
      if (!to || to.length < 10) throw new Error("No valid customer phone number");

      const template = "invoice_template_v2";
      const invoiceId = order?.id ? String(order.id) : "";
      const customerName = order?.customers?.name || "Customer";
      const supportNo = "+91 9000028168";

      const components = [
        {
          type: "body",
          parameters: [
            { type: "text", text: invoiceId },
            { type: "text", text: customerName },
            { type: "text", text: supportNo }
          ]
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [
            {
              type: "text",
              text: invoiceId
            }
          ]
        }
      ];

      await sendWhatsAppInvoice({
        phoneNumberId: WA_PHONE_NUMBER_ID,
        to,
        template,
        accessToken: WA_ACCESS_TOKEN,
        components,
        languageCode: 'en'
      });

      setWASent(true);
    } catch (err) {
      setWAError(err.message || "Failed to send WhatsApp message");
    } finally {
      setWASending(false);
    }
  }

  const fetchOrder = useCallback(async (orderId) => {
    setLoading(true);
    try {
      setStoreDetails(null);

      // 1. Fetch Order + Items + Customer with product category details
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers(*),
          eye_power(*),
          order_items(
            *,
            products_list(
              id,
              name, 
              price,
              category_id,
              products_category(id, name, sgst, cgst)
            )
          )
        `)
        .eq('id', orderId)
        .single();
      
      if (error) throw error;
      
      console.log('Fetched order with categories:', JSON.stringify(data?.order_items?.[0], null, 2));
      
      setOrder(data);

      // 2. Fetch Store Details 
      if (data.store_id) {
        const { data: storeData } = await supabase
          .from('store')
          .select('*')
          .eq('id', data.store_id)
          .single();
        
        console.log('Store Data:', storeData);
        
        if (storeData) {
          setStoreDetails(storeData);
        }
      }
    } catch (err) {
      console.error('Invoice Debug - Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) fetchOrder(id);
  }, [id, fetchOrder]);

  const totals = useMemo(() => {
    if (!order?.order_items?.length) {
      const g = Number(order?.gross_amount || 0);
      const d = Number(order?.due_amount || 0);
      return {
        isLegacy: false,
        itemsSubtotal: "0.00", itemDiscount: "0.00", taxableAmount: g.toFixed(2),
        cgst: "0.00", sgst: "0.00", total: g.toFixed(2),
        paid: (g - d).toFixed(2), due: d.toFixed(2)
      };
    }

    // 1. Calculate the inclusive sum of items (current standard)
    const inclusiveItemSum = order.order_items.reduce((sum, item) => {
      return sum + (Number(item.qty || 0) * Number(item.price || 0)) - Number(item.discount_amt || 0);
    }, 0);

    // 2. Detect if this is a legacy order where tax was added ON TOP of the prices
    // We allow a small tolerance for rounding differences
    const isLegacy = Number(order?.gross_amount || 0) > (inclusiveItemSum + 5);

    let tCgst = 0, tSgst = 0, tTaxable = 0, tSub = 0, tDisc = 0;

    order.order_items.forEach(item => {
      const q = Number(item.qty || 0);
      const p = Number(item.price || 0);
      const d = Number(item.discount_amt || 0);
      
      const sub = q * p;
      const sgstRate = Number(item.products_list?.products_category?.sgst || 0);
      const cgstRate = Number(item.products_list?.products_category?.cgst || 0);
      const totalTaxRate = sgstRate + cgstRate;

      let taxable, sgstAmt, cgstAmt, lineTotal;

      if (isLegacy) {
        // LEGACY MODE: Price is ex-tax. Total = (P*Q - D) + Tax
        taxable = sub - d;
        sgstAmt = (taxable * sgstRate) / 100;
        cgstAmt = (taxable * cgstRate) / 100;
        lineTotal = taxable + sgstAmt + cgstAmt;
      } else {
        // STANDRD MODE: Price is inc-tax. Taxable = (P*Q - D) / (1 + TaxRate/100)
        lineTotal = sub - d;
        taxable = lineTotal / (1 + totalTaxRate / 100);
        sgstAmt = (taxable * sgstRate) / 100;
        cgstAmt = (taxable * cgstRate) / 100;
      }

      tSub += sub;
      tDisc += d;
      tTaxable += taxable;
      tCgst += cgstAmt;
      tSgst += sgstAmt;
    });
    
    // Master Totals
    const finalGrossTotal = Math.round(isLegacy ? (tTaxable + tSgst + tCgst) : (tSub - tDisc));
    const roundedDue = Math.round(Number(order?.due_amount || 0));
    const roundedPaid = Math.max(0, finalGrossTotal - roundedDue);

    return {
      isLegacy, // Pass this to layouts so they know how to handle rows
      itemsSubtotal: tSub.toFixed(2),
      itemDiscount: tDisc.toFixed(2),
      taxableAmount: tTaxable.toFixed(2),
      cgst: tCgst.toFixed(2),
      sgst: tSgst.toFixed(2),
      total: finalGrossTotal.toString(), 
      paid: roundedPaid.toString(),
      due: roundedDue.toString()
    };
  }, [order]);

  const waitForExportAssets = useCallback(async (rootEl) => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const images = Array.from(rootEl.querySelectorAll('img'));
    if (!images.length) return;

    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) {
          if (typeof img.decode === 'function') {
            return img.decode().catch(() => undefined);
          }
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        });
      })
    );
  }, []);

  async function handleDownload() {
    if (isGenerating) return;
    if (!order) return;

    setDownloadError('');
    setShowExportTarget(true);
    setIsGenerating(true);

    try {
      // Mount export node and let browser paint before capture.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const exportElement = exportInvoiceRef.current;
      if (!exportElement) {
        throw new Error('Export target not available');
      }

      await waitForExportAssets(exportElement);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(exportElement, {
        scale: Math.min(window.devicePixelRatio || 1, 2),
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: exportElement.scrollWidth,
        height: exportElement.scrollHeight,
        windowWidth: exportElement.scrollWidth,
        windowHeight: exportElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const imgData = canvas.toDataURL('image/png');

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 6;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const renderedImageHeight = (canvas.height * printableWidth) / canvas.width;

      let renderedOffset = 0;
      let pageIndex = 0;

      while (renderedOffset < renderedImageHeight - 0.01) {
        if (pageIndex > 0) {
          doc.addPage();
        }

        const yPosition = margin - renderedOffset;
        doc.addImage(imgData, 'PNG', margin, yPosition, printableWidth, renderedImageHeight, undefined, 'FAST');
        renderedOffset += printableHeight;
        pageIndex += 1;
      }

      doc.save(`invoice-${order?.id || 'document'}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      setDownloadError('Failed to generate PDF. Please try again.');
    } finally {
      setShowExportTarget(false);
      setIsGenerating(false);
    }
  }

  function handleCopyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleWhatsApp() {
    const text = `Invoice ${order?.id || ''}\nAmount: ₹${totals.total}\nView: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading invoice...</div>;

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Eye className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600">Invoice not found</p>
          {userProfile && <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-black text-white rounded">Back</button>}
        </div>
      </div>
    );
  }


  const storeName = INVOICE_BRAND.billedFromName;
  const headerTitle = INVOICE_BRAND.headerTitle;
  const customerName = order?.customers?.name || 'Customer';
  const customerPhone = order?.customers?.phone || 'N/A';

  const displayAddress = storeDetails?.address || 'No Address Provided';
  const displayGstin = storeDetails?.gst_no || storeDetails?.gstin || 'Not Available';
  const displayPhone = storeDetails?.phone_no || storeDetails?.phone || 'No Contact Provided';
  
  // If order status is "Delivered", treat payment as successful.
  const isDelivered = String(order?.status || '').toLowerCase() === 'delivered';
  const displayPaymentStatus = isDelivered ? 'Success' : 'Pending';
  const invoiceLayoutProps = {
    order,
    storeName,
    headerTitle,
    displayGstin,
    displayPhone,
    displayAddress,
    customerName,
    customerPhone,
    totals,
    isDelivered,
    displayPaymentStatus,
    storeDetails,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-gray-50 to-slate-100 py-8 sm:py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Action Bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Invoice {order?.id}</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition min-h-[44px] ${
                isGenerating 
                  ? 'bg-gray-400 cursor-not-allowed text-white' 
                  : 'bg-black hover:shadow-lg text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20'
              }`}
              aria-label={isGenerating ? "Generating PDF..." : "Download invoice as PDF"}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={18} /> Download PDF
                </>
              )}
            </button>
            <div className="relative" ref={shareMenuRef}>
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-lg hover:scale-105 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 min-h-[44px]"
                aria-expanded={showShareMenu}
                aria-label="Open share options"
              >
                <Share2 size={18} /> Share
              </button>
              {showShareMenu && (
                <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-lg z-10 border border-gray-200 min-w-[260px] overflow-hidden">
                  <button onClick={handleCopyLink} className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-gray-100 min-h-[44px]">
                    <Copy size={16} /> {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <button onClick={handleWhatsApp} className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-gray-100 min-h-[44px]">
                    <MessageCircle size={16} /> WhatsApp (Share Link)
                  </button>
                  <button onClick={handleWhatsAppApiSend} disabled={waSending} className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-gray-50 min-h-[44px]">
                    <MessageCircle size={16} />
                    {waSending ? "Sending..." : waSent ? "Sent via WhatsApp API" : "Send via WhatsApp API"}
                  </button>
                  {waError && <div className="px-4 py-2 text-black text-xs">{waError}</div>}
                </div>
              )}
            </div>
            {userProfile && (
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Back
              </button>
            )}
          </div>
        </div>

        {downloadError && (
          <div className="mb-4 rounded-2xl border border-black bg-black px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white text-center shadow-xl">
            {downloadError}
          </div>
        )}

        {/* On-screen invoice preview */}
        <div className="w-full flex justify-center pb-20 mb-10 px-4 overflow-visible">
          <InvoiceLayout
            id="invoice-content-preview"
            {...invoiceLayoutProps}
            style={{
              width: '800px',
              minWidth: '800px',
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              marginBottom: scale < 1 ? `-${(1 - scale) * 100}%` : '0'
            }}
          />
        </div>

        {showExportTarget && (
          <div className="fixed inset-0 pointer-events-none z-[9000]" aria-hidden="true">
            <div className="absolute left-0 top-0">
              <PdfInvoiceLayout
                id="invoice-content-export"
                ref={exportInvoiceRef}
                {...invoiceLayoutProps}
                style={{
                  width: '800px',
                  minWidth: '800px',
                  transform: 'none',
                  transformOrigin: 'top left',
                  marginBottom: '0'
                }}
              />
            </div>
          </div>
        )}

      {/* Full-Screen Processing Overlay - Prevents "Frozen" perception during heavy CPU tasks */}
      {isGenerating && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-xs text-center border border-slate-100">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Generating Invoice</h3>
              <p className="text-sm text-slate-500 mt-1">Please wait while we prepare your high-quality PDF. This may take a few seconds.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
