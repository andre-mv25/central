import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './features/auth/LoginPage';
import { RegistrosPage } from './features/registros/RegistrosPage';
import { EntradasPage } from './features/entradas/EntradasPage';
import HistorialPage from './features/historial/HistorialPage';
import { useAuthStore } from './store/auth.store';

export default function App() {
  const autenticado = useAuthStore((state) => state.autenticado);

  return (
    <Routes>
      <Route path="/login" element={autenticado ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={autenticado ? <AppLayout /> : <Navigate to="/login" replace />}>
        <Route index element={<RegistrosPage />} />
        <Route path="entradas" element={<EntradasPage />} />
        <Route path="historial" element={<HistorialPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
