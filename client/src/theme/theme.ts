import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    tertiary: Palette['primary'];
    cardColors: {
      peach: string;
      yellow: string;
      gray: string;
      green: string;
      lightPurple: string;
    };
  }

  interface PaletteOptions {
    tertiary?: PaletteOptions['primary'];
    cardColors?: {
      peach: string;
      yellow: string;
      gray: string;
      green: string;
      lightPurple: string;
    };
  }
}

const baseTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1E89E0', // Bright blue like game background
      light: '#DAEEFF', // Lighter blue
      dark: '#005DA8', // Darker blue
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#EF4444', // Vibrant red like buzzer buttons
      light: '#F87171',
      dark: '#DC2626',
      contrastText: '#FFFFFF',
    },
    tertiary: {
      main: '#F59E0B', // Orange/amber for warnings
      light: '#FBBF24',
      dark: '#D97706',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#10B981', // Bright green for correct answers
      light: '#34D399',
      dark: '#059669',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#EF4444', // Red for incorrect answers
      light: '#F87171',
      dark: '#DC2626',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#F59E0B', // Orange for timeouts/warnings
      light: '#FBBF24',
      dark: '#D97706',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8FAFC', // Light blue-gray background
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1E293B', // Dark slate text
      secondary: '#64748B', // Medium slate
    },
    divider: '#E2E8F0',
    cardColors: {
      peach: '#FED7AA', // Keep for team colors
      yellow: '#FEF08A', // Brighter yellow
      gray: '#F1F5F9', // Light slate
      green: '#BBF7D0', // Light green
      lightPurple: '#DDD6FE', // Light purple for teams
    },
  },
  typography: {
    fontFamily: '"Quicksand", sans-serif',
    fontSize: 16,
    h1: {
      fontWeight: 800,
      fontSize: '36px',
      // lineHeight: 1.2,
      // color: '#1E293B',
    },
    h2: {
      fontWeight: 700,
      fontSize: '30px',
      // lineHeight: 1.3,
      // color: '#1E293B',
    },
    h3: {
      fontWeight: 700,
      fontSize: '24px',
      // lineHeight: 1.4,
      // color: '#1E293B',
    },
    h4: {
      fontWeight: 600,
      fontSize: '20px',
      // lineHeight: 1.4,
      // color: '#1E293B',
    },
    h5: {
      fontWeight: 600,
      fontSize: '18px',
      // lineHeight: 1.4,
      // color: '#1E293B',
    },
    h6: {
      fontWeight: 600,
      fontSize: '16px',
      // lineHeight: 1.4,
      // color: '#1E293B',
    },
    subtitle1: {
      fontSize: '16px',
      fontWeight: 500,
      // lineHeight: 1.5,
      color: '#64748B',
    },
    subtitle2: {
      fontSize: '14px',
      fontWeight: 500,
      // lineHeight: 1.5,
      color: '#64748B',
    },
    body1: {
      fontWeight: 400,
      fontSize: '16px',
      // lineHeight: 1.6,
      color: '#1E293B',
    },
    body2: {
      fontWeight: 400,
      fontSize: '14px',
      // lineHeight: 1.6,
      color: '#64748B',
    },
    button: {
      fontWeight: 600,
      fontSize: '16px',
      textTransform: 'none',
      letterSpacing: '0.01em',
      // lineHeight: 1.4,
    },
    caption: {
      fontSize: '12px',
      fontWeight: 500,
      // lineHeight: 1.5,
      color: '#64748B',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          fontWeight: 700,
          padding: '14px 28px',
          fontSize: '16px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
          },
          '&:active': {
            transform: 'translateY(0px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          },
        },
        containedPrimary: {
          backgroundColor: '#3B82F6',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#2563EB',
          },
        },
        containedSecondary: {
          backgroundColor: '#EF4444',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#DC2626',
          },
        },
        outlined: {
          borderColor: '#CBD5E1',
          color: '#1E293B',
          backgroundColor: '#FFFFFF',
          '&:hover': {
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
          },
        },
        // Special buzzer button style
        sizeLarge: {
          minWidth: '120px',
          minHeight: '120px',
          borderRadius: '50%',
          fontSize: '18px',
          fontWeight: 800,
          boxShadow: '0 8px 25px rgba(239, 68, 68, 0.3)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
          border: '2px solid #F1F5F9',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            '& fieldset': {
              borderColor: '#CBD5E1',
              borderWidth: '2px',
            },
            '&:hover fieldset': {
              borderColor: '#3B82F6',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#3B82F6',
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontWeight: 700,
          fontSize: '14px',
          height: '32px',
        },
        colorPrimary: {
          backgroundColor: '#DBEAFE',
          color: '#1D4ED8',
        },
        colorSecondary: {
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#1E293B',
          boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.08)',
          borderBottom: '1px solid #E2E8F0',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: '16px',
          border: '3px solid #FFFFFF',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#E2E8F0',
          height: '8px',
        },
        bar: {
          backgroundColor: '#10B981',
          borderRadius: 8,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#E2E8F0',
        },
      },
    },
    // Custom component for countdown/timer
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          '&.countdown-timer': {
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          },
        },
      },
    },
  },
});

export default baseTheme;