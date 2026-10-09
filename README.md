## 1. Công nghệ sử dụng

* **Frontend:** HTML5, CSS3, JavaScript
* **Backend:** Node.js, Express.js
* **Database:** Microsoft SQL Server

---

## 2. Kiến trúc hệ thống

```text
├── backend/
│   ├── config/          # Cấu hình kết nối Database
│   ├── controllers/     # Xử lý logic Request / Response
│   ├── routes/          # Định tuyến các API
│   ├── services/        # Thao tác trực tiếp với Database (SQL Query)
│   ├── utils/           # Các hàm tiện ích dùng chung
│   ├── uploads/         # Thư mục lưu trữ tệp người dùng tải lên
│   ├── public/          # Chứa các tệp tĩnh được phục vụ trực tiếp qua Web
│   ├── schema.sql       # File khởi tạo cấu trúc 16 bảng SQL
│   └── server.js        # File chạy chính của server Node.js
├── frontend/
│   ├── css/             # File giao diện CSS
│   ├── js/              # File xử lý sự kiện client
│   └── pages/           # Các trang HTML (login, feed, profile...)
├── DATABASE_SCHEMA.md   # Tài liệu mô tả chi tiết Từ điển dữ liệu 16 bảng
└── README.md            # Tài liệu hướng dẫn dự án
