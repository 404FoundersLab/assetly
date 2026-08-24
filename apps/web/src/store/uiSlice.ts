import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { isApiEnabled } from '../services/api/config';

interface UiState {
  loadingCount: number;
  loadingMessage: string;
  bootstrapReady: boolean;
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    loadingCount: 0,
    loadingMessage: '',
    bootstrapReady: !isApiEnabled(),
  } satisfies UiState,
  reducers: {
    startLoading(state, action: PayloadAction<string | undefined>) {
      state.loadingCount += 1;
      if (action.payload) state.loadingMessage = action.payload;
    },
    stopLoading(state) {
      state.loadingCount = Math.max(0, state.loadingCount - 1);
      if (state.loadingCount === 0) state.loadingMessage = '';
    },
    setBootstrapReady(state, action: PayloadAction<boolean>) {
      state.bootstrapReady = action.payload;
    },
  },
});

export const { startLoading, stopLoading, setBootstrapReady } = uiSlice.actions;
export default uiSlice.reducer;
