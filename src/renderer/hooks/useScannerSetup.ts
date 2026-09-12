/**
 * React hook for scanner initialization and management
 */

import { useEffect } from 'react';
import { createScanner, useBarcodeScanner, type ScannerOptions } from '../../hardware/scanner';
import { useAppStore } from '../store';
import type { ScanEvent } from '../../hardware/scanner';

export interface UseScannerSetupOptions extends ScannerOptions {
  enabled?: boolean;
  onItemScanned?: (code: string) => void;
  onScanError?: (error: Error) => void;
}

export function useScannerSetup(options: UseScannerSetupOptions = {}): void {
  const { enabled = true, onItemScanned, onScanError, ...scannerOpts } = options;
  const settings = useAppStore((s) => s.settings);

  const handleScan = (event: ScanEvent) => {
    console.log('Scan detected:', event.code);
    onItemScanned?.(event.code);
  };

  useBarcodeScanner(handleScan, {
    ...scannerOpts,
    config: settings.hardware.scanner,
    enabled,
    onGuard: (guard, detail) => {
      console.warn(`[Scanner Guard] ${guard}: ${detail}`);
    },
    onReject: (reason, buffer) => {
      console.warn(`[Scanner] Rejected: ${reason}, buffer: ${buffer}`);
    },
  });
}
