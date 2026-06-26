import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../server/supabase/supabase';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanBarcode, Wifi, Loader2, AlertCircle } from 'lucide-react';

export default function MobileScan() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState('auth'); // 'auth', 'authenticating', 'connected', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedHistory, setScannedHistory] = useState([]);
  const html5QrCodeRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setErrorMessage('Missing session identifier in URL.');
      return;
    }

    const channel = supabase.channel(sessionId);
    channelRef.current = channel;

    // Listen for auth-success from desktop
    channel.on('broadcast', { event: 'auth-success' }, ({ payload }) => {
      if (payload.success) {
        setStatus('connected');
      } else {
        setStatus('auth');
        setErrorMessage('Authentication rejected. Please check OTP.');
      }
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, [sessionId]);

  const handleAuthenticate = async (e) => {
    e.preventDefault();
    if (otp.length !== 4) {
      setErrorMessage('Please enter a valid 4-digit OTP.');
      return;
    }
    setStatus('authenticating');
    setErrorMessage('');

    try {
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'auth-request',
          payload: { otp: otp.trim() }
        });
      } else {
        throw new Error('Realtime connection not established.');
      }
    } catch (err) {
      setStatus('auth');
      setErrorMessage('Failed to send authentication request: ' + err.message);
    }
  };

  const stopScanning = useCallback(async () => {
    if (!isScanning) return;
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      }
    } catch (err) {
      console.error('Stop scanner failed:', err);
    }
    setIsScanning(false);
  }, [isScanning]);

  const sendBarcode = useCallback(async (barcode) => {
    try {
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'barcode-scanned',
          payload: { barcode }
        });
      } else {
        throw new Error('Realtime connection lost.');
      }

      // Add to local history list with timestamp
      setScannedHistory(prev => [
        { barcode, time: new Date().toLocaleTimeString(), id: Math.random() },
        ...prev.slice(0, 4)
      ]);

      // Vibrate phone to notify success
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    } catch (err) {
      console.error('Failed to transmit barcode:', err);
    }
  }, []);

  const startScanning = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);
    setErrorMessage('');

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode('mobile-reader');
        html5QrCodeRef.current = html5QrCode;

        const config = { 
          fps: 15, 
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size * 0.5 }; // wide box for barcodes
          }
        };

        await html5QrCode.start(
          { facingMode: 'environment' }, 
          config,
          (decodedText) => {
            // Success callback
            sendBarcode(decodedText);
          },
          () => {
            // Keep scanning, ignore frame scan errors
          }
        );
      } catch (err) {
        setIsScanning(false);
        setErrorMessage('Failed to start camera: ' + err.message);
      }
    }, 100);
  }, [isScanning, sendBarcode]);

  // Automatically start scanner once connected
  useEffect(() => {
    if (status === 'connected') {
      startScanning();
    } else {
      stopScanning();
    }
    return () => {
      stopScanning();
    };
  }, [status, startScanning, stopScanning]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-white/10">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <ScanBarcode className="text-white" size={20} />
            <span>Aster Remote Scanner</span>
          </h2>
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
            Synchronized Vector Auditing
          </p>
        </div>
        {status === 'connected' && (
          <div className="flex items-center gap-1.5 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
            <Wifi size={10} className="animate-pulse" />
            <span>Live</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center my-6">
        {status === 'auth' && (
          <form onSubmit={handleAuthenticate} className="space-y-6 max-w-sm mx-auto w-full">
            <div className="text-center space-y-2">
              <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">
                Authenticate Remote Connection
              </p>
              <h3 className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-normal">
                Enter 4-Digit Security PIN displayed on Desktop
              </h3>
            </div>

            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-2.5 text-red-400">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <p className="text-[10px] font-bold uppercase tracking-wider">{errorMessage}</p>
              </div>
            )}

            <div className="flex justify-center">
              <input
                type="text"
                pattern="[0-9]*"
                maxLength="4"
                required
                placeholder="0000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-48 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center text-3xl font-black tracking-[0.4em] focus:border-white focus:bg-white/10 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-white text-black py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Link Device
            </button>
          </form>
        )}

        {status === 'authenticating' && (
          <div className="text-center space-y-4">
            <Loader2 className="animate-spin text-white mx-auto" size={32} />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Validating Link Code...
            </p>
          </div>
        )}

        {status === 'connected' && (
          <div className="space-y-6 w-full max-w-md mx-auto">
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-2.5 text-red-400">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <p className="text-[10px] font-bold uppercase tracking-wider">{errorMessage}</p>
              </div>
            )}

            {/* Camera Viewfinder Box */}
            <div className="relative rounded-3xl overflow-hidden bg-white/5 border border-white/10 aspect-video flex items-center justify-center">
              <div id="mobile-reader" className="absolute inset-0 w-full h-full object-cover" />
              {!isScanning && (
                <button
                  onClick={startScanning}
                  className="bg-white text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest z-10 shadow-lg hover:scale-105"
                >
                  Start Camera
                </button>
              )}
            </div>

            {/* History List */}
            {scannedHistory.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block ml-1">
                  Transmit Log
                </span>
                <div className="bg-white/5 rounded-2xl p-4 divide-y divide-white/5 border border-white/5">
                  {scannedHistory.map(item => (
                    <div key={item.id} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0">
                      <span className="font-mono text-xs font-bold text-white">{item.barcode}</span>
                      <span className="text-[9px] text-gray-500 font-bold">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <AlertCircle className="text-red-500 mx-auto" size={32} />
            <p className="text-sm font-bold text-red-400">{errorMessage}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[8px] font-black text-gray-600 uppercase tracking-[0.2em] pt-6 border-t border-white/10">
        Aster Remote Terminal • Secure SSL Encrypted Link
      </div>
    </div>
  );
}
