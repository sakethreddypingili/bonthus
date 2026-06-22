import React, { createContext, useContext, useState, useCallback } from "react";

const PopupContext = createContext(null);

export function usePopup() {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error("usePopup must be used within a PopupProvider");
  }
  return context;
}

export function PopupProvider({ children }) {
  const [popupState, setPopupState] = useState({
    isOpen: false,
    message: "",
    title: "",
    type: "alert", // "alert" | "confirm"
    resolve: null,
  });

  const showAlert = useCallback((message, title = "Alert") => {
    return new Promise((resolve) => {
      setPopupState({
        isOpen: true,
        message,
        title,
        type: "alert",
        resolve,
      });
    });
  }, []);

  const showConfirm = useCallback((message, title = "Confirm") => {
    return new Promise((resolve) => {
      setPopupState({
        isOpen: true,
        message,
        title,
        type: "confirm",
        resolve,
      });
    });
  }, []);

  const handleClose = (value) => {
    if (popupState.resolve) {
      popupState.resolve(value);
    }
    setPopupState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <PopupContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {popupState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-[fade-in_0.2s_ease-out]">
          {/* Backdrop with premium blur */}
          <div
            className="absolute inset-0 bg-[#000000]/60 backdrop-blur-md transition-opacity duration-300"
            onClick={() => {
              if (popupState.type === "alert") {
                handleClose(true);
              }
            }}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 text-center flex flex-col border border-gray-100 animate-[bounce-scale_0.25s_ease-out] overflow-hidden">
            {/* Message */}
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed mt-2 mb-6 whitespace-pre-line">
              {popupState.message}
            </p>

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              {popupState.type === "confirm" ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClose(true)}
                    className="flex-1 py-3 px-4 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleClose(true)}
                  className="w-full py-3 px-4 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  );
}
