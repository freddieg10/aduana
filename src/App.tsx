import { HashRouter, Routes, Route, Navigate } from 'react-router';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Layout from './components/Layout';
import ProtectedRoute from './routes/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import ExpedienteListPage from './features/expedientes/ExpedienteListPage';
import ExpedienteDetailPage from './features/expedientes/ExpedienteDetailPage';
import ExpedienteCreatePage from './features/expedientes/ExpedienteCreatePage';
import ImportExportPage from './features/import-export/ImportExportPage';
import ReportsPage from './features/reports/ReportsPage';

const theme = createTheme({
  palette: {
    primary: { main: '#1565c0' },
    secondary: { main: '#ff8f00' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/expedientes" element={<ExpedienteListPage />} />
              <Route path="/expedientes/new" element={<ExpedienteCreatePage />} />
              <Route path="/expedientes/:id" element={<ExpedienteDetailPage />} />
              <Route path="/import-export" element={<ImportExportPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
