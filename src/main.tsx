import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Buffer } from 'buffer';
import process from 'process';

// Inject Buffer and process globally
window.Buffer = Buffer;
window.process = process;
window.global = window;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
