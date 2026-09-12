import React from 'react';
import ReactDOM from 'react-dom/client';

// Bundled, not system-linked. Windows' own Arabic faces render poorly at the
// small sizes used in dense invoice grids (blueprint §2.2).
import '@fontsource/cairo/400.css';
import '@fontsource/cairo/600.css';
import '@fontsource/cairo/700.css';

import './styles.css';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
