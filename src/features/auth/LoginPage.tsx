import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Box, Button, Card, CardContent, TextField, Typography, Alert,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const ok = login(email, password);
    if (ok) {
      navigate('/dashboard');
    } else {
      setError(true);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
      <Card sx={{ width: 400, mx: 2 }}>
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

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
            Demo: admin@aduana.com / admin123
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
