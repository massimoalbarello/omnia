import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sender from './components/Sender';
import Receiver from './components/Receiver';
import Share from "./components/Share";
import Channel from "./components/Channel";

import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Routes>
        <Route path="/" element={<App />} />
        <Route path="sender" element={<Sender />} />
        <Route path="sender/share" element={<Share />} />
        <Route path="sender/channel" element={<Channel />} />
        <Route path="receiver" element={<Receiver />} />
      </Routes>
  </BrowserRouter>
);
