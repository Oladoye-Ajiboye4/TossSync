import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, Navigate } from "react-router";
import { RouterProvider } from "react-router/dom";
import Homepage from './pages/homepage/Homepage.jsx';
import Signup from './pages/auth/signup/Signup.jsx';
import Signin from './pages/auth/signin/Signin.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';
import Invite from './pages/invite/Invite.jsx';
import ForgotPassword from './pages/auth/forgotPassword/ForgotPassword.jsx';
import ResetPassword from './pages/auth/resetPassword/ResetPassword.jsx';


const router = createBrowserRouter([
  {
    path: "/",
    element: <Homepage />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/signin",
    element: <Signin />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    // Dedicated self-service resident onboarding via a provider's custom invite link.
    path: "/invite",
    element: <Invite />,
  },
  {
    // Friendly alias so both /invite?ref= and /join?ref= resolve to the same flow.
    path: "/join",
    element: <Invite />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },

  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

// Register the service worker for Web Push notifications.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Registered:', registration.scope)
      })
      .catch((error) => {
        console.error('[SW] Registration failed:', error)
      })
  })
}
