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
│   ├── sql/schema.sql       # File khởi tạo cấu trúc 16 bảng SQL
│   └── server.js        # File chạy chính của server Node.js
├── frontend/
│   ├── css/             # File giao diện CSS
│   ├── js/              # File xử lý sự kiện client
│   └── pages/           # Các trang HTML (login, feed, profile...)
├── DATABASE_SCHEMA.md   # Tài liệu mô tả chi tiết Từ điển dữ liệu 16 bảng
└── README.md            # Tài liệu hướng dẫn dự án
```
### 3. Cài đặt

* **Bước 1:** Clone dự án về máy
```
git clone <URL_REPOSITORY>
cd <TEN_THU_MUC_DU_AN>
```
* **Bước 2:** Cài đặt các thư viện phụ thuộc bằng Windows Terminal
```
cd backend
npm install
```
* **Bước 3:** Tạo file .env trong backend
```env
  PORT=5000
  DB_USER=sa
  DB_PASSWORD=matkhau_sql_cua_ban
  DB_SERVER=localhost
  DB_DATABASE=ten_db_cua_ban
```
* **Bước 5:** Tại backend chạy npm start

---

## 4. Chạy phiên bản hiện tại (React + Vite)

Phần này bổ sung cho hướng dẫn cũ phía trên. Cần **Node.js 22** (xem `.nvmrc`) và **SQL Server đang chạy**.

**Terminal 1**, bắt đầu tại thư mục gốc dự án (các lệnh `nvm` dành cho máy đã cài nvm):

```bash
nvm install
nvm use
cd backend
npm ci
test -f .env || cp .env.example .env
```

Điền thông tin SQL thực tế trong `backend/.env`, gồm `DB_SERVER`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`. Tạo khóa bằng lệnh sau rồi chép kết quả vào `JWT_SECRET`:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Giữ `DB_INIT=false` nếu database đã có schema; chỉ đặt `true` khi chủ động khởi tạo database mới, sau đó đổi lại `false`. Không đưa `.env` lên Git. Chạy backend:

```bash
npm run dev
```

**Terminal 2**, bắt đầu tại thư mục gốc dự án:

```bash
nvm use
cd frontend
npm ci
npm run dev
```

Mở **http://localhost:5173**. Frontend chuyển tiếp `/api` và `/uploads` tới backend cổng 5000. Muốn chạy bản production: chạy `npm run build` trong `frontend`, rồi `npm start` trong `backend` và mở **http://localhost:5000**.

## 5. Thư mục tests và kiểm thử

Giữ các thư mục `tests/` để kiểm tra hồi quy khi ghép code nhóm; chúng không tự chạy cùng website.

| Thư mục | Mục đích | Lệnh (chạy trong thư mục tương ứng) |
|---|---|---|
| `backend/tests/` | Validation, JWT, upload và HTTP với service mock | Trong `backend`: `npm test` |
| `backend/tests/integration/` | API và dữ liệu SQL Server thật | Xem cấu hình test riêng bên dưới |
| `frontend/tests/api.test.js` | API client: JSON, FormData, Blob, lỗi HTTP | Trong `frontend`: `npm test` |
| `frontend/tests/e2e/` | Luồng giao diện desktop/mobile bằng Playwright | Xem lệnh bên dưới |

**SQL integration**, chạy trong `backend`: chuẩn bị `/tmp/fella-test.env` chứa thông tin kết nối **database test riêng**, tên `DB_DATABASE=Fella_Test_<ten_rieng>` và `RUN_SQL_TESTS=1`, sau đó:

```bash
node --env-file=/tmp/fella-test.env --test tests/integration/*.test.js
```

**UI test**, chạy trong `frontend`: cần backend đang chạy tại cổng 5000 với database test riêng, `JWT_SECRET` đã cấu hình và frontend đã build:

```bash
npm run build
npx playwright install chromium
FELLA_E2E_TEST_DATABASE=1 FELLA_E2E_URL=http://127.0.0.1:5000 npm run test:e2e
```

Không chạy các test thêm/sửa/xóa dữ liệu trên database chung của nhóm. Có thể chạy `npm run lint` trong `frontend`; hiện còn hai lỗi import React thừa có sẵn ở Login/Register. `test-results/`, `playwright-report/`, `coverage/` là kết quả sinh ra, khác với mã kiểm thử trong `tests/`.

Chi tiết API, môi trường và kịch bản demo: xem [Baaa.md](Baaa.md).
