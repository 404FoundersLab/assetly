import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import authReducer from './authSlice';
import assetsReducer from './assetsSlice';
import employeesReducer from './employeesSlice';
import departmentsReducer from './departmentsSlice';
import vendorsReducer from './vendorsSlice';
import hrReducer from './hrSlice';
import auditReducer from './auditSlice';
import performanceReducer from './performanceSlice';
import attendanceReducer from './attendanceSlice';
import onboardingReducer from './onboardingSlice';
import expensesReducer from './expensesSlice';
import networkDevicesReducer from './networkDevicesSlice';
import uiReducer from './uiSlice';
import requestsReducer from './requestsSlice';
import tenantsReducer from './tenantsSlice';
import usersReducer from './usersSlice';
import ticketsReducer from './ticketsSlice';

const appReducer = combineReducers({
  auth: authReducer,
  assets: assetsReducer,
  employees: employeesReducer,
  departments: departmentsReducer,
  vendors: vendorsReducer,
  hr: hrReducer,
  audit: auditReducer,
  performance: performanceReducer,
  attendance: attendanceReducer,
  onboarding: onboardingReducer,
  expenses: expensesReducer,
  networkDevices: networkDevicesReducer,
  ui: uiReducer,
  requests: requestsReducer,
  tenants: tenantsReducer,
  users: usersReducer,
  tickets: ticketsReducer,
});

const rootReducer = (state: any, action: any) => {
  if (action.type === 'auth/logout') {
    storage.removeItem('persist:root');
    state = undefined;
  }
  return appReducer(state, action);
};

const persistConfig = {
  key: 'root',
  storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
