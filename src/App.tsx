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
    mode: 'light',
    primary: {
      main: '#6366f1', // Vibrant modern indigo
      light: '#818cf8',
      dark: '#4f46e5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f43f5e', // Modern indigo-pink secondary
      light: '#fb7185',
      dark: '#e11d48',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc', // Soft slate background
      paper: '#ffffff',
    },
    error: { main: '#ef4444' },
    warning: { main: '#f59e0b' },
    info: { main: '#3b82f6' },
    success: { main: '#10b981' },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
  },
  shape: {
    borderRadius: 16, // Smoother heavily rounded corners
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: {
      textTransform: 'none', // Remove corporate all-caps
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          px: 3,
          py: 1,
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            transform: 'translateY(-1px)',
            transition: 'all 0.2s ease-in-out',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgb(99 102 241 / 0.4)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
          border: '1px solid #f1f5f9',
          overflow: 'visible',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 0.2s',
            backgroundColor: '#ffffff',
            '&:hover': {
              backgroundColor: '#f8fafc',
            },
            '&.Mui-focused': {
              backgroundColor: '#ffffff',
              boxShadow: '0 0 0 3px rgb(99 102 241 / 0.2)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: 'none',
          padding: '4px',
          backgroundColor: '#f1f5f9',
          borderRadius: 12,
          minHeight: 48,
        },
        indicator: {
          display: 'none', // Remove the bottom indicator for a segmented control look
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          minHeight: 40,
          margin: '0 4px',
          color: '#64748b',
          transition: 'all 0.2s',
          '&.Mui-selected': {
            color: '#0f172a',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 4px rgb(0 0 0 / 0.05)',
          },
          '&:hover:not(.Mui-selected)': {
            color: '#0f172a',
            backgroundColor: '#e2e8f0',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#0f172a',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        },
      },
    },
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
