import { NavLink, Route, Routes } from 'react-router-dom';

import HomePage from '@/pages/HomePage';
import ListPage from '@/pages/ListPage';
import ReviewPage from '@/pages/ReviewPage';
import ShopPage from '@/pages/ShopPage';
import TripDetailPage from '@/pages/TripDetailPage';

export default function App() {
  return (
    <div className="app">
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
    </div>
  );
}
