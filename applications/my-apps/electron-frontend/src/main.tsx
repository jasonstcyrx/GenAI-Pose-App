import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Recorder from './app/pages/Recorder'
import { createTheme, ThemeProvider } from '@mui/material';

import App from './app/app';
import Shell from './app/layout/Shell';

const theme = createTheme({
  components: {
    // Name of the component
    MuiButtonBase: {
      defaultProps: {
        // The props to change the default for.
        disableRipple: true, // No more ripple, on the whole application 💣!
      },
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <Shell>
    <BrowserRouter basename={process.env.PUBLIC_URL}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/recorder" element={<Recorder />} />
      </Routes>
    </BrowserRouter>
    </Shell>
    </ThemeProvider>
  </StrictMode>
);
