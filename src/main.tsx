import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./pages/App";
import "./global.css";
import "./i18n";
import { Toaster } from "./components/ui/sonner";
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
    <Toaster richColors position="top-center" />
  </BrowserRouter>
);
