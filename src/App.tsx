import { NavLink, Route, Routes } from 'react-router-dom';

import MigrationModal from '@/components/MigrationModal';
import SyncStatusPanel from '@/components/SyncStatusPanel';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import HomePage from '@/pages/HomePage';
import ListPage from '@/pages/ListPage';
import LoginPage from '@/pages/LoginPage';
import ReviewPage from '@/pages/ReviewPage';
import ShopPage from '@/pages/ShopPage';
import TripDetailPage from '@/pages/TripDetailPage';

function AuthenticatedApp() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="page">
        <p className="empty">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <>
      <MigrationModal />
      <SyncStatusPanel />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/list" element={<ListPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/trip/:id/review" element={<ReviewPage />} />
          <Route path="/trip/:id" element={<TripDetailPage />} />
        </Routes>
      </main>

      <nav className="bottom-nav bottom-nav-three">
        <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} end>
          Trips
        </NavLink>
        <NavLink to="/list" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          List
        </NavLink>
        <NavLink to="/shop" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Shop
        </NavLink>
      </nav>
    </>
  );
}

export default function App() {
  return (
    <div className="app">
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </div>
  );
}
