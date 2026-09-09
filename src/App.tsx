import { HashRouter, Routes, Route, Navigate } from "react-router";
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import type { PaletteMode } from '@mui/material';
import { useMemo } from 'react';
import { useThemeStore } from './store/themeStore';
import Layout from "./components/Layout";
import ProtectedRoute from "./routes/ProtectedRoute";
import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import ExpedienteListPage from "./features/expedientes/ExpedienteListPage";
import ExpedienteDetailPage from "./features/expedientes/ExpedienteDetailPage";
import ExpedienteCreatePage from "./features/expedientes/ExpedienteCreatePage";
import ImportExportPage from "./features/import-export/ImportExportPage";
import ReportsPage from "./features/reports/ReportsPage";
import RelacionadosPage from "./features/relacionados/RelacionadosPage";
import ClientPortalPage from "./features/portal/ClientPortalPage";
import ClientPortalDetailPage from "./features/portal/ClientPortalDetailPage";
import AccesoClientePage from "./features/portal/AccesoClientePage";
import SettingsPage from "./features/settings/SettingsPage";

const createAppTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: "#6366f1",
        light: "#818cf8",
        dark: "#4f46e5",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#f43f5e",
        light: "#fb7185",
        dark: "#e11d48",
        contrastText: "#ffffff",
      },
      background: {
        default: mode === 'dark' ? '#0f172a' : '#f8fafc',
        paper: mode === 'dark' ? '#1e293b' : '#ffffff',
      },
      error: { main: "#ef4444" },
      warning: { main: "#f59e0b" },
      info: { main: "#3b82f6" },
      success: { main: "#10b981" },
      text: {
        primary: mode === 'dark' ? '#f8fafc' : '#0f172a',
        secondary: mode === 'dark' ? '#cbd5e1' : '#475569',
      },
      divider: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    },
    shape: {
      borderRadius: 16,
    },
    typography: {
      fontFamily:
        '"Plus Jakarta Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 800 },
      h2: { fontWeight: 800 },
      h3: { fontWeight: 700 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: {
        textTransform: "none",
        fontWeight: 600,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: "none",
            px: 3,
            py: 1,
            "&:hover": {
              boxShadow: mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
              transform: "translateY(-1px)",
              transition: "all 0.2s ease-in-out",
            },
          },
          contained: {
            "&:hover": {
              boxShadow: mode === 'dark' ? '0 6px 16px rgba(99, 102, 241, 0.6)' : '0 10px 15px -3px rgb(99 102 241 / 0.4)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            boxShadow: mode === 'dark' ? '0 10px 25px -5px rgba(0,0,0,0.5)' : '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
            border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'}`,
            overflow: "visible",
            backgroundColor: mode === 'dark' ? '#1e293b' : '#ffffff',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: mode === 'dark' ? '#1e293b' : '#ffffff',
          },
          elevation1: {
            boxShadow: mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 6px -1px rgb(0 0 0 / 0.05)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 12,
              transition: "all 0.2s",
              backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#ffffff',
              "&:hover": {
                backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.3)' : '#f8fafc',
              },
              "&.Mui-focused": {
                backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.4)' : '#ffffff',
                boxShadow: "0 0 0 3px rgb(99 102 241 / 0.2)",
              },
              "& fieldset": {
                borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.23)',
              }
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
            borderBottom: "none",
            padding: "4px",
            backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#f1f5f9',
            borderRadius: 12,
            minHeight: 48,
          },
          indicator: {
            display: "none",
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            borderRadius: 8,
            minHeight: 40,
            margin: "0 4px",
            color: mode === 'dark' ? '#94a3b8' : '#64748b',
            transition: "all 0.2s",
            "&.Mui-selected": {
              color: mode === 'dark' ? '#ffffff' : '#0f172a',
              backgroundColor: mode === 'dark' ? '#334155' : '#ffffff',
              boxShadow: mode === 'dark' ? '0 2px 6px rgba(0,0,0,0.3)' : '0 2px 4px rgb(0 0 0 / 0.05)',
            },
            "&:hover:not(.Mui-selected)": {
              color: mode === 'dark' ? '#f8fafc' : '#0f172a',
              backgroundColor: mode === 'dark' ? '#1e293b' : '#e2e8f0',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#1e293b' : '#ffffff',
            color: mode === 'dark' ? '#f8fafc' : '#0f172a',
            boxShadow: mode === 'dark' ? '0 1px 10px rgba(0,0,0,0.4)' : '0 1px 3px 0 rgb(0 0 0 / 0.1)',
            backgroundImage: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: mode === 'dark' ? '#1e293b' : '#ffffff',
          }
        }
      }
    },
  });

function App() {
  const mode = useThemeStore((state) => state.mode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Client access link generated by an admin */}
          <Route path="/acceso/:token" element={<AccesoClientePage />} />

          {/* Staff (admin / digitador) */}
          <Route element={<ProtectedRoute roles={['admin', 'digitador']} />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/expedientes" element={<ExpedienteListPage />} />
              <Route path="/expedientes/new" element={<ExpedienteCreatePage />} />
              <Route path="/expedientes/:id" element={<ExpedienteDetailPage />} />
              <Route path="/relacionados" element={<RelacionadosPage />} />
              <Route path="/import-export" element={<ImportExportPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>
          </Route>

          {/* Admin only */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route element={<Layout />}>
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Client portal */}
          <Route element={<ProtectedRoute roles={['cliente']} />}>
            <Route element={<Layout />}>
              <Route path="/portal" element={<ClientPortalPage />} />
              <Route path="/portal/:id" element={<ClientPortalDetailPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
