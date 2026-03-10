import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  const container = document.getElementById("root");
  if (!container) {
    throw new Error("Root element not found in DOM");
  }

  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (error: any) {
  console.error('Error rendering application:', error.message, error.stack);
  throw error;
}