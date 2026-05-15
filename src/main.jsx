// src/main.jsx
import "./sentry.js";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { enableGlobalServerLogging } from "./lib/serverLogger";

// // Enable global server logging to show all server logs in browser console
// enableGlobalServerLogging();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
