import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import { Middleware, useAuth } from './middleware'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import NewNote from './pages/NewNote'
import Dashboard from './pages/Dashboard'
import Note from './pages/Note'

import Footer from './components/ui/Footer'
import Navbar from './components/ui/Navbar'
import Reset from './pages/Reset'
import NotFound from './pages/NotFound'
import AI from './pages/AI'


interface ProtectedRouteProps {
  Component: React.ComponentType<any>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ Component }) => {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to="/login" />
  }

  return <Component />
}

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
          <Route path="/ai" Component={AI} />


          <Route path="/*" Component={NotFound} />
          {/* Protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute Component={Dashboard} />} />

          {/* Protected routes */}
          <Route path="/ai" element={<ProtectedRoute Component={AI} />} />
          <Route path="/note/*" element={<ProtectedRoute Component={Note} />} />
          <Route path="/new" element={<ProtectedRoute Component={NewNote} />} />
        </Routes>
        <Footer />
      </Router>
    </Middleware>
  )
}

export default App
