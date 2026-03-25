import axios from 'axios';
import { getAuthToken, removeAuthToken } from './auth';

// Use environment variable for API URL in production, or relative path in development
const apiBaseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

function getUiLanguage() {
  const lang = localStorage.getItem('language') || 'es';
  return ['es', 'en', 'fr', 'it', 'pt'].includes(lang) ? lang : 'es';
}

function friendlyMessage(message) {
  const raw = String(message || '').trim();
  if (!raw) return raw;

  const lang = getUiLanguage();
  const isSpanish = lang === 'es';
  const lower = raw.toLowerCase();

  const map = (es, en) => (isSpanish ? es : en);

  if (lower.includes('invalid credentials')) {
    return map(
      'Correo o contrasena incorrectos. Verifica tus datos e intentalo de nuevo.',
      'Incorrect email or password. Please check your credentials and try again.'
    );
  }
  if (lower.includes('email not verified')) {
    return map(
      'Tu correo aun no esta verificado. Revisa tu bandeja de entrada y confirma tu cuenta.',
      'Your email is not verified yet. Please check your inbox and verify your account.'
    );
  }
  if (lower.includes('access token required') || lower.includes('authentication required')) {
    return map(
      'Tu sesion expiro. Inicia sesion nuevamente para continuar.',
      'Your session has expired. Please sign in again to continue.'
    );
  }
  if (lower.includes('invalid or expired token')) {
    return map(
      'Tu sesion no es valida o vencio. Inicia sesion nuevamente.',
      'Your session is invalid or expired. Please sign in again.'
    );
  }
  if (lower.includes('access denied')) {
    return map(
      'No tienes permiso para realizar esta accion en este escenario.',
      'You do not have permission to perform this action for this scenario.'
    );
  }
  if (lower.includes('feature access required') || lower.includes('requires a plan')) {
    return map(
      'Esta funcion esta disponible en PRO. Actualiza tu plan para desbloquearla.',
      'This feature is available in PRO. Upgrade your plan to unlock it.'
    );
  }
  if (lower.includes('database connection failed')) {
    return map(
      'No pudimos conectar con la base de datos. Intentalo nuevamente en unos minutos.',
      'We could not connect to the database. Please try again in a few minutes.'
    );
  }
  if (lower.includes('internal server error')) {
    return map(
      'Ocurrio un problema interno. Intentalo nuevamente en unos minutos.',
      'An internal error occurred. Please try again in a few minutes.'
    );
  }
  if (lower.includes('invalid verification token')) {
    return map(
      'El enlace de verificacion no es valido. Solicita uno nuevo.',
      'The verification link is not valid. Please request a new one.'
    );
  }
  if (lower.includes('verification token expired')) {
    return map(
      'El enlace de verificacion vencio. Solicita uno nuevo.',
      'The verification link has expired. Please request a new one.'
    );
  }
  if (lower.includes('invalid or expired password reset token')) {
    return map(
      'El enlace para restablecer contrasena no es valido o ya vencio. Solicita uno nuevo.',
      'The password reset link is invalid or expired. Please request a new one.'
    );
  }
  if (lower.includes('terms and conditions must be accepted')) {
    return map(
      'Debes aceptar los terminos y condiciones para continuar.',
      'You must accept terms and conditions to continue.'
    );
  }
  if (lower.includes('country is required')) {
    return map('Debes seleccionar un pais.', 'Please select a country.');
  }
  if (lower.includes('city is required')) {
    return map('Debes indicar una ciudad.', 'Please provide a city.');
  }
  if (lower.includes('number of goats is required')) {
    return map('Debes indicar la cantidad de cabras.', 'Please enter the number of goats.');
  }
  if (lower.includes('transforms products selection is required')) {
    return map('Debes indicar si transformas productos.', 'Please indicate whether you process products.');
  }
  if (lower.includes('age is required')) {
    return map('Debes indicar la edad.', 'Please enter age.');
  }
  if (lower.includes('sex is required')) {
    return map('Debes seleccionar el sexo.', 'Please select sex.');
  }
  if (lower.includes('sex must be one of')) {
    return map(
      'El valor de sexo no es valido. Selecciona una opcion de la lista.',
      'Sex value is invalid. Please choose one option from the list.'
    );
  }
  if (lower.includes('invalid overrides')) {
    return map(
      'Algunos valores ingresados estan fuera de rango. Revisa esos campos o dejalos vacios para usar valores recomendados.',
      'Some entered values are out of range. Please review them, or leave those fields empty to use recommended defaults.'
    );
  }
  if (lower.includes('must be between')) {
    return map(
      'Uno o mas valores estan fuera del rango permitido. Corrige los campos marcados e intentalo nuevamente.',
      'One or more values are outside the allowed range. Please correct them and try again.'
    );
  }
  if (lower.includes('not found')) {
    return map(
      'No encontramos el registro solicitado. Actualiza la pagina e intentalo nuevamente.',
      'We could not find the requested record. Refresh the page and try again.'
    );
  }

  return raw;
}

// Add token to requests
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const backendError = String(error.response?.data?.error || '').toLowerCase();
    const backendMessage = String(error.response?.data?.message || '').toLowerCase();
    const invalidToken403 =
      status === 403 &&
      (
        backendError.includes('invalid or expired token') ||
        backendMessage.includes('invalid or expired token') ||
        backendError.includes('access token required') ||
        backendMessage.includes('access token required') ||
        backendError.includes('authentication required') ||
        backendMessage.includes('authentication required')
      );

    // 401 means session is invalid. Only selected 403 token errors should force logout.
    if (status === 401 || invalidToken403) {
      removeAuthToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    const sourceMessage = error.response?.data?.message || error.response?.data?.error || error.message;
    const uiMessage = friendlyMessage(sourceMessage);

    if (error.response?.data && typeof error.response.data === 'object') {
      if (typeof error.response.data.error === 'string') {
        error.response.data.error = uiMessage;
      } else if (typeof error.response.data.message === 'string') {
        error.response.data.message = uiMessage;
      }
    }
    error.userMessage = uiMessage;
    error.message = uiMessage;

    return Promise.reject(error);
  }
);

export default api;

