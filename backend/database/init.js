const fs = require('fs');
const path = require('path');
const db = require('../config/database'); 

try {
    const sqlPath = path.join(__dirname, '../sql/schema.sql');
    const schemaSql = fs.readFileSync(sqlPath, 'utf8');

    db.exec(schemaSql);
} catch (error) {
    console.error('Lỗi khởi tạo CSDL:', error.message);
}
