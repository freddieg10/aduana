import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Menu,
  MenuItem,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard,
  Description,
  Assessment,
  ImportExport,
  Notifications,
  AccountCircle,
  Logout,
  DarkMode,
  LightMode,
  People,
  Inventory2,
} from "@mui/icons-material";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";
import { useExpedientesStore } from "../store/expedientesStore";
import { useThemeStore } from "../store/themeStore";
import type { UserRole } from "../types";

const DRAWER_WIDTH = 280;

const STAFF: UserRole[] = ["admin", "agent"];

const NAV_ITEMS: { key: string; path: string; icon: React.ReactNode; roles: UserRole[] }[] = [
  { key: "dashboard", path: "/dashboard", icon: <Dashboard />, roles: STAFF },
  { key: "expedientes", path: "/expedientes", icon: <Description />, roles: STAFF },
  { key: "relacionados", path: "/relacionados", icon: <People />, roles: STAFF },
  { key: "reports", path: "/reports", icon: <Assessment />, roles: STAFF },
  { key: "importExport", path: "/import-export", icon: <ImportExport />, roles: STAFF },
  { key: "portal", path: "/portal", icon: <Inventory2 />, roles: ["client"] },
];

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
  const themeMode = useThemeStore((s) => s.mode);
  const toggleThemeMode = useThemeStore((s) => s.toggleMode);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [userAnchor, setUserAnchor] = useState<null | HTMLElement>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const isClient = user?.role === "client";
  const navItems = NAV_ITEMS.filter((n) => user && n.roles.includes(user.role));

  /** Logging out wipes the data persisted for the session, so it is confirmed first. */
  const handleLogout = () => {
    setLogoutConfirmOpen(false);
    logout();
    navigate("/login");
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
          Aduana
        </Typography>
      </Toolbar>
      <Divider sx={{ mb: 2, borderStyle: "dashed" }} />
      <List sx={{ px: 2 }}>
        {navItems.map(({ key, path, icon }) => (
          <ListItemButton
            key={key}
            selected={location.pathname.startsWith(path)}
            onClick={() => {
              navigate(path);
              setMobileOpen(false);
            }}
            sx={{
              borderRadius: 3,
              mb: 1,
              "&.Mui-selected": {
                bgcolor: "primary.main",
                color: "primary.contrastText",
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)",
                "& .MuiListItemIcon-root": {
                  color: "primary.contrastText",
                },
                "&:hover": {
                  bgcolor: "primary.dark",
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{icon}</ListItemIcon>
            <ListItemText
              primary={
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: location.pathname.startsWith(path) ? 700 : 500,
                  }}
                >
                  {t(`nav.${key}`)}
                </Typography>
              }
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {isClient ? t("portal.title") : t("app.title")}
          </Typography>

          {/* Language toggle */}
          <ToggleButtonGroup
            size="small"
            exclusive
            value={i18n.language}
            onChange={(_, lang) => lang && i18n.changeLanguage(lang)}
            sx={{
              mr: 2,
              "& .MuiToggleButton-root": {
                color: "inherit",
                borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.1)' : "rgba(0,0,0,0.1)",
              },
            }}
          >
            <ToggleButton value="es">ES</ToggleButton>
            <ToggleButton value="en">EN</ToggleButton>
          </ToggleButtonGroup>

          {/* Theme mode toggle */}
          <Tooltip title={themeMode === 'light' ? 'Dark Mode' : 'Light Mode'}>
            <IconButton color="inherit" onClick={toggleThemeMode} sx={{ mr: 1 }}>
              {themeMode === 'dark' ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>

          {/* Notifications (staff only) */}
          {!isClient && (
            <>
              <Tooltip title={t("notifications.title")}>
                <IconButton
                  color="inherit"
                  onClick={(e) => setNotifAnchor(e.currentTarget)}
                >
                  <Badge badgeContent={unreadCount} color="error">
                    <Notifications />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={notifAnchor}
                open={Boolean(notifAnchor)}
                onClose={() => setNotifAnchor(null)}
                slotProps={{ paper: { sx: { maxWidth: 360, maxHeight: 400 } } }}
              >
                <MenuItem dense disabled>
                  <Typography variant="subtitle2">
                    {t("notifications.title")}
                  </Typography>
                </MenuItem>
                <Divider />
                {notifications.length === 0 && (
                  <MenuItem disabled>{t("notifications.noNotifications")}</MenuItem>
                )}
                {notifications.slice(0, 8).map((n) => {
                  const exp = getExpById(n.expedienteId);
                  return (
                    <MenuItem
                      key={n.id}
                      dense
                      sx={{ whiteSpace: "normal", opacity: n.read ? 0.6 : 1 }}
                      onClick={() => {
                        markRead(n.id);
                        setNotifAnchor(null);
                        if (exp) navigate(`/expedientes/${exp.id}`);
                      }}
                    >
                      <Box>
                        <Typography variant="body2">{n.message}</Typography>
                        {exp && (
                          <Typography variant="caption" color="primary">
                            {exp.reference} — {exp.importador.nombre}
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  );
                })}
                {notifications.length > 0 && (
                  <>
                    <Divider />
                    <MenuItem
                      dense
                      onClick={() => {
                        markAllRead();
                        setNotifAnchor(null);
                      }}
                    >
                      <Typography variant="body2" color="primary">
                        {t("notifications.markAllRead")}
                      </Typography>
                    </MenuItem>
                  </>
                )}
              </Menu>
            </>
          )}

          {/* User menu */}
          <Tooltip title={user?.name ?? ""}>
            <IconButton
              color="inherit"
              onClick={(e) => setUserAnchor(e.currentTarget)}
            >
              <AccountCircle />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={userAnchor}
            open={Boolean(userAnchor)}
            onClose={() => setUserAnchor(null)}
          >
            <MenuItem disabled>
              <Typography variant="body2">
                {user?.name} ({user?.role})
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => { setUserAnchor(null); setLogoutConfirmOpen(true); }}
              data-testid="logout"
            >
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              {t("nav.logout")}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar (responsive) */}
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH, borderRight: "none" },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
              borderRight: "1px dashed rgba(148, 163, 184, 0.4)",
              bgcolor: "background.paper",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          bgcolor: "background.default",
          minHeight: "100vh",
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      <Dialog open={logoutConfirmOpen} onClose={() => setLogoutConfirmOpen(false)}>
        <DialogTitle>{t("auth.logoutTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("auth.logoutWarning")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutConfirmOpen(false)}>{t("common.cancel")}</Button>
          <Button color="error" variant="contained" onClick={handleLogout} data-testid="logout-confirm">
            {t("nav.logout")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
