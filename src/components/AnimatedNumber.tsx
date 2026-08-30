/**
 * AnimatedNumber — counts from 0 to target on mount.
 * Uses 20 discrete steps instead of 60fps polling — no jank, no lag.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle } from 'react-native';

interface Props {
  value: number;
  formatter?: (n: number) => string;
  duration?: number;
  delay?: number;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
}

const STEPS = 20;

export function AnimatedNumber({
  value,
  formatter,
  duration = 900,
  delay = 0,
  style,
  numberOfLines,
}: Props) {
  const [display, setDisplay] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Clear any running animation
    timers.current.forEach(clearTimeout);
    timers.current = [];

    const stepDuration = duration / STEPS;

    for (let i = 1; i <= STEPS; i++) {
      const t = setTimeout(() => {
        const progress = i / STEPS;
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        if (i === STEPS) {
          setDisplay(value);   // snap exact on last step
        } else {
          setDisplay(value * eased);
        }
      }, delay + i * stepDuration);

      timers.current.push(t);
    }

    return () => timers.current.forEach(clearTimeout);
  }, [value, duration, delay]);

  const text = formatter ? formatter(display) : display.toFixed(2);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {text}
    </Text>
  );
}
