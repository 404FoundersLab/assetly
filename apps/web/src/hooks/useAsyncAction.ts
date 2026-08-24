import { useCallback } from 'react';
import { useAppDispatch } from './storeHooks';
import { startLoading, stopLoading } from '../store/uiSlice';

export function useAsyncAction() {
  const dispatch = useAppDispatch();

  const runAsync = useCallback(
    async <T,>(message: string, action: () => Promise<T>): Promise<T> => {
      dispatch(startLoading(message));
      try {
        return await action();
      } finally {
        dispatch(stopLoading());
      }
    },
    [dispatch],
  );

  return { runAsync };
}

/** Minimum display time so loaders are visible on fast operations */
export function withMinDelay<T>(promise: Promise<T>, ms = 400): Promise<T> {
  return Promise.all([promise, new Promise((r) => setTimeout(r, ms))]).then(([result]) => result);
}
