import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Import workerPool module — registers axios interceptors as side effect
import './utils/workerPool'

import toast from 'react-hot-toast';

// Override global alert to use toast
window.alert = (message?: any) => {
    toast(String(message), {
        icon: '🔔',
        style: {
            borderRadius: '10px',
            background: '#2c2c2c',
            color: '#fff',
        },
    });
};

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)

