/**
 * Vitest setup for Wire and Bead
 */
import React from 'react';
import { beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';

/**
 * next/image validates remote hosts against next.config — tests use arbitrary
 * URLs (e.g. example.com) and should not depend on remotePatterns.
 */
vi.mock('next/image', () => ({
  default: function MockImage({
    src,
    alt,
    onError,
    className,
    ...rest
  }: {
    src?: string | { src: string };
    alt?: string;
    onError?: React.ReactEventHandler<HTMLImageElement>;
    className?: string;
    fill?: boolean;
    sizes?: string;
    priority?: boolean;
    quality?: number;
    placeholder?: string;
    blurDataURL?: string;
  }) {
    const resolved =
      typeof src === 'object' && src !== null && 'src' in src
        ? (src as { src: string }).src
        : typeof src === 'string'
          ? src
          : '';
    return React.createElement('img', {
      alt: alt ?? '',
      src: resolved,
      className,
      onError,
      'data-testid': (rest as { 'data-testid'?: string })['data-testid'],
    });
  },
}));

beforeEach(() => {
  localStorage.clear();
});
