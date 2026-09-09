import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Box, Button, Card, CardContent, Divider, TextField, Typography, Alert,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { AdminPanelSettings, SupportAgent, Storefront } from '@mui/icons-material';
import { useAuthStore, homeForRole, DEMO_ACCOUNTS } from '../../store/authStore';
import type { UserRole } from '../../types';

const ROLE_ICON: Record<UserRole, React.ReactNode> = {
  admin: <AdminPanelSettings />,
  digitador: <SupportAgent />,
  cliente: <Storefront />,
};

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const doLogin = (em: string, pw: string) => {
    const ok = login(em, pw);
    if (!ok) { setError(true); return; }
    const user = useAuthStore.getState().user;
    navigate(user ? homeForRole(user.role) : '/dashboard');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    doLogin(email, password);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Card sx={{ width: 420, mx: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Aduana</Typography>
            <ToggleButtonGroup size="small" exclusive value={i18n.language} onChange={(_, l) => l && i18n.changeLanguage(l)}>
              <ToggleButton value="es">ES</ToggleButton>
              <ToggleButton value="en">EN</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Typography variant="h6" gutterBottom>{t('auth.login')}</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{t('auth.invalidCredentials')}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth margin="normal" label={t('auth.email')} type="email"
              value={email} onChange={(e) => { setEmail(e.target.value); setError(false); }}
              required autoFocus
            />
            <TextField
              fullWidth margin="normal" label={t('auth.password')} type="password"
              value={password} onChange={(e) => { setPassword(e.target.value); setError(false); }}
              required
            />
            <Button fullWidth variant="contained" type="submit" size="large" sx={{ mt: 2 }}>
              {t('auth.loginButton')}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">{t('auth.quickLogin')}</Typography>
          </Divider>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <Button
                key={acc.email}
                fullWidth
                variant="outlined"
                size="small"
                startIcon={ROLE_ICON[acc.role]}
                onClick={() => doLogin(acc.email, acc.password)}
                data-testid={`demo-login-${acc.role}`}
              >
                {t(`auth.role_${acc.role}`)}
              </Button>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
