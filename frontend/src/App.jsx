import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../src/pages/auth/Login';
import Feed from '../src/pages/feed/Feed';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<Login />} />
                <Route path="/feed" element={<Feed />} />
            </Routes>
        </BrowserRouter>
    );
}