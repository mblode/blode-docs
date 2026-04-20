"use client";

import { useCallback, useState } from "react";

interface UseControlledStateOptions<T> {
  defaultValue?: T;
  onChange?: (value: T) => void;
  value?: T;
}

export const useControlledState = <T>({
  defaultValue,
  onChange,
  value,
}: UseControlledStateOptions<T>): [T | undefined, (value: T) => void] => {
  const [internalValue, setInternalValue] = useState<T | undefined>(
    defaultValue
  );

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const setValue = useCallback(
    (newValue: T) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);
    },
    [isControlled, onChange]
  );

  return [currentValue, setValue];
};
