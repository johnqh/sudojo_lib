/**
 * Generic localStorage hook with type safety
 */

import { useCallback, useEffect, useState } from 'react';

/**
 * Hook for persisting state to localStorage
 *
 * @param key - localStorage key
 * @param initialValue - Default value if nothing in storage
 * @returns [value, setValue, removeValue]
 *
 * @example
 * ```tsx
 * const [settings, setSettings, removeSettings] = useLocalStorage('app-settings', defaultSettings);
 *
 * // Update settings
 * setSettings({ ...settings, theme: 'dark' });
 *
 * // Or use updater function
 * setSettings(prev => ({ ...prev, theme: 'dark' }));
 *
 * // Clear settings
 * removeSettings();
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Get initial value from localStorage or use default
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when value changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`Error writing localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Set value (supports updater function pattern)
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const newValue = value instanceof Function ? value(prev) : value;
      return newValue;
    });
  }, []);

  // Remove from localStorage
  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
