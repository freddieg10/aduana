import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Badge, Menu, MenuItem,
  Divider, ToggleButtonGroup, ToggleButton, Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, Description, Assessment,
  ImportExport, Notifications, AccountCircle, Logout,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useExpedientesStore } from '../store/expedientesStore';

const DRAWER_WIDTH = 280;

const NAV_ITEMS = [
  { key: 'dashboard', path: '/dashboard', icon: <Dashboard /> },
  { key: 'expedientes', path: '/expedientes', icon: <Description /> },
  { key: 'reports', path: '/reports', icon: <Assessment /> },
  { key: 'importExport', path: '/import-export', icon: <ImportExport /> },
] as const;

export default function Layout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const unreadCount = useNotificationStore((s) => s.unreadCount());
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const getExpById = useExpedientesStore((s) => s.getById);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [userAnchor, setUserAnchor] = useState<null | HTMLElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
          Aduana
        </Typography>
      </Toolbar>
      <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />
      <List sx={{ px: 2 }}>
        {NAV_ITEMS.map(({ key, path, icon }) => (
          <ListItemButton
            key={key}
            selected={location.pathname.startsWith(path)}
            onClick={() => { navigate(path); setMobileOpen(false); }}
            sx={{
              borderRadius: 3,
              mb: 1,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                },
                '&:hover': {
                  bgcolor: 'primary.dark',
                }
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{icon}</ListItemIcon>
            <ListItemText
              primary={t(`nav.${key}`)}
              primaryTypographyProps={{ fontWeight: location.pathname.startsWith(path) ? 700 : 500 }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* AppBar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {t('app.title')}
          </Typography>

          {/* Language toggle */}
          <ToggleButtonGroup
            size="small"
            exclusive
            value={i18n.language}
            onChange={(_, lang) => lang && i18n.changeLanguage(lang)}
            sx={{ mr: 2, '& .MuiToggleButton-root': { color: 'inherit', borderColor: 'rgba(0,0,0,0.1)' } }}
          >
            <ToggleButton value="es">ES</ToggleButton>
            <ToggleButton value="en">EN</ToggleButton>
          </ToggleButtonGroup>

          {/* Notifications */}
          <Tooltip title={t('notifications.title')}>
            <IconButton color="inherit" onClick={(e) => setNotifAnchor(e.currentTarget)}>
              <Badge badgeContent={unreadCount} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>
          <Menu anchorEl={notifAnchor} open={Boolean(notifAnchor)} onClose={() => setNotifAnchor(null)} slotProps={{ paper: { sx: { maxWidth: 360, maxHeight: 400 } } }}>
            <MenuItem dense disabled>
              <Typography variant="subtitle2">{t('notifications.title')}</Typography>
            </MenuItem>
            <Divider />
            {notifications.length === 0 && <MenuItem disabled>{t('notifications.noNotifications')}</MenuItem>}
            {notifications.slice(0, 8).map((n) => {
              const exp = getExpById(n.expedienteId);
              return (
                <MenuItem key={n.id} dense sx={{ whiteSpace: 'normal', opacity: n.read ? 0.6 : 1 }} onClick={() => { markRead(n.id); setNotifAnchor(null); if (exp) navigate(`/expedientes/${exp.id}`); }}>
                  <Box>
                    <Typography variant="body2">{n.message}</Typography>
                    {exp && <Typography variant="caption" color="primary">{exp.reference} — {exp.importador.nombre}</Typography>}
                  </Box>
                </MenuItem>
              );
            })}
            {notifications.length > 0 && (
              <>
                <Divider />
                <MenuItem dense onClick={() => { markAllRead(); setNotifAnchor(null); }}>
                  <Typography variant="body2" color="primary">{t('notifications.markAllRead')}</Typography>
                </MenuItem>
              </>
            )}
          </Menu>

          {/* User menu */}
          <Tooltip title={user?.name ?? ''}>
            <IconButton color="inherit" onClick={(e) => setUserAnchor(e.currentTarget)}>
              <AccountCircle />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={userAnchor} open={Boolean(userAnchor)} onClose={() => setUserAnchor(null)}>
            <MenuItem disabled>
              <Typography variant="body2">{user?.name} ({user?.role})</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
              {t('nav.logout')}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar (responsive) */}
      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, borderRight: 'none' } }}>
          {drawer}
        </Drawer>
        <Drawer variant="permanent"
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: '1px dashed rgba(148, 163, 184, 0.4)', bgcolor: '#ffffff' } }}
          open>
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3, md: 4 }, width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
