import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        mobileOpen={sidebarOpen}
        setMobileOpen={setSidebarOpen}
      />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="main-content">
        <Navbar
          onMenuToggle={() => setSidebarOpen((o) => !o)}
          setMobileOpen={setSidebarOpen}
        />
        <Outlet />
      </div>
    </div>
  );
}