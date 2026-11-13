import { Navigate, Route, Routes } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import Home from './pages/Home';
import Booking from './pages/Booking';
import Panel from './panel/Panel';

export default function App() {
  return (
    <Routes>
      {/* Vista de la clienta */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/reservar" element={<Booking />} />
      </Route>

      {/* Vista de la dueña */}
      <Route path="/panel" element={<Panel />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
