/**
 * Main process entry point
 */

import { app } from 'electron';
import { createWindow, initPrinter, createMenu, dispose } from './app';

app.on('ready', () => {
  createWindow();
  initPrinter();
  createMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
});

process.on('exit', () => {
  dispose();
});
