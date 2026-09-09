import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import { useAuthStore, parseAccessToken } from '../../store/authStore';

/**
 * Landing for a client access link (`#/acceso/<token>`). Signs the visitor in as the cliente
 * the token names and forwards them to the portal. See `buildAccessToken` for why this is a
 * POC convenience rather than real authentication.
 */
export default function AccesoClientePage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const loginConEnlace = useAuthStore((s) => s.loginConEnlace);
  /*
   * Whether the token is well-formed is a pure function of the URL, so it is derived rather
   * than stored. Signing in touches the auth store, which must happen in an effect — doing it
   * during render would update another component mid-render.
   */
  const clienteKey = token ? parseAccessToken(token) : null;
  const error = !clienteKey;

  useEffect(() => {
    if (!token || !clienteKey) return;
    loginConEnlace(token);
    navigate('/portal', { replace: true });
  }, [token, clienteKey, loginConEnlace, navigate]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Card sx={{ width: 420, mx: 2 }}>
        <CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Aduana</Typography>
          {error ? (
            <>
              <Alert severity="error" sx={{ mb: 2 }}>{t('portal.enlaceInvalido')}</Alert>
              <Button variant="contained" onClick={() => navigate('/login')}>{t('auth.login')}</Button>
            </>
          ) : (
            <>
              <CircularProgress size={28} sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">{t('portal.verificandoEnlace')}</Typography>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
