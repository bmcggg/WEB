const API_BASE_URL = 'http://localhost:5000/api';

async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('fella_token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra, vui lòng thử lại!');
    }

    return data;
}

function showAlert(message, type = 'error') {
    const alertBox = document.getElementById('alertBox');
    if (alertBox) {
        alertBox.textContent = message;
        alertBox.className = `alert-message ${type === 'error' ? 'alert-error' : 'alert-success'}`;
        alertBox.style.display = 'block';
    }
}