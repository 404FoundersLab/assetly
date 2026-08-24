import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { store, persistor } from './store';
import { PersistGate } from 'redux-persist/integration/react';
import { AppThemeProvider } from './context/ThemeModeContext';
import { registerServiceWorker } from './utils/pwa';

registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <AppThemeProvider>
            <App />
          </AppThemeProvider>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>,
);
