import React, { ReactElement } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import { Middleware, useAuth } from './middleware'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import NewNote from './pages/NewNote'

import Navbar from './components/ui/Navbar'
import Reset from './pages/Reset'
import NotFound from './pages/NotFound'

// Type for your ProtectedRoute prop
interface ProtectedRouteProps {
  Component: React.ComponentType<any>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ Component }) => {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to="/login" />;
  }

  // Return the component as a JSX element
  return <Component />;
};

function App() {
  return (
    <Middleware>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" Component={Home} />
          <Route path="/login" Component={Login} />
          <Route path="/register" Component={Register} />
          <Route path="/reset" Component={Reset} />

          <Route path="/*" Component={NotFound} />

          {/* Authentication protected routes */}
          <Route path="/new" element={<ProtectedRoute Component={NewNote} />} />
        </Routes>
      </Router>
    </Middleware>
  )
}

export default App
