import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './software/components/Dashboard';
import { ConfigProvider } from './software/context/ConfigContext';

function App() {
  return (
    <ConfigProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
