import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AdminApp from "./AdminApp";
import VoteApp from "./VoteApp";
import "./index.css";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

const isAdminPage = window.location.pathname.startsWith("/admin");
const app = isAdminPage ? <AdminApp /> : <VoteApp />;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {clientId ? (
      <GoogleOAuthProvider clientId={clientId}>{app}</GoogleOAuthProvider>
    ) : (
      app
    )}
  </StrictMode>
);
