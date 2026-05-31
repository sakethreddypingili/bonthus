import React from"react";
import ReactDOM from"react-dom/client";
import"./index.css";
import App from"./App";
import { BrowserRouter } from"react-router-dom";

const setFavicon = (href) => {
  const head = document.head || document.getElementsByTagName("head")[0];
  let link = head.querySelector("link[rel*='icon']");

  if (!link) {
    link = document.createElement("link");
    link.rel ="icon";
    head.appendChild(link);
  }
  link.type ="image/x-icon";
  link.href = href;
};

// Use public path for favicon
setFavicon("/assets/images/favicon.ico");
document.title ="The Lenscare - Admin";

const root = ReactDOM.createRoot(document.getElementById("root"));

// In development, disable StrictMode for camera/scanner components to work properly
// StrictMode runs effects twice which breaks camera initialization
const isDev = process.env.NODE_ENV === 'development';

root.render(
  isDev ? (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  ) : (
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  )
);
