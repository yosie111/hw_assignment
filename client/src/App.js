// client/src/App.js

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import SearchPage from './pages/SearchPage';
import PurchasePage from './pages/PurchasePage';
import ResultPage from './pages/ResultPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <div className="App">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/purchase" element={<PurchasePage />} />
            <Route path="/result" element={<ResultPage />} />
          </Routes>
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
