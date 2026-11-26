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

## 6. Tìm kiếm, chia sẻ và gọi video

### Chuẩn bị trên Windows

Cài Node.js 22 và bật SQL Server. Dùng database riêng khi thử tính năng. Mở PowerShell tại thư mục `WEB`.

```powershell
cd backend
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Điền thông tin kết nối SQL Server và dán khóa vừa tạo vào `JWT_SECRET` trong `backend/.env`. Chạy `npm run dev`. Khi backend khởi động với database cũ, nó thực thi migration [add-shared-post.sql](backend/sql/add-shared-post.sql) để thêm cột `posts.shared_from_id`. Nếu tài khoản kết nối không có quyền `ALTER TABLE`, người quản lý database chạy file SQL đó một lần trên database của dự án trước khi khởi động lại.

Mở PowerShell thứ hai tại thư mục `WEB`:

```powershell
cd frontend
npm ci
npm run dev
```

Mở `http://localhost:5173`. Proxy Vite chuyển tiếp cả `/api` và `/socket.io` tới backend cổng 5000. Nếu chạy bản build từ Express, mở `http://localhost:5000`.

### API và hành vi

| API | Hành vi |
|---|---|
| `GET /api/search/users?q=...&page=1&limit=10` | Tìm theo username hoặc họ tên. Trả ID, username, họ tên và avatar. |
| `GET /api/search/posts?q=...&page=1&limit=10` | Tìm trong nội dung bài viết hoặc caption của bản chia sẻ. Áp dụng cùng quyền xem như bảng tin. |
| `POST /api/posts/:id/share` | Nhận JSON `{"caption":"Cảm nghĩ"}`. Bỏ `caption` hoặc gửi chuỗi rỗng để chia sẻ ngay. Trả `201` và bài chia sẻ đã tạo. |

Các API dùng Bearer JWT. Từ khóa có 1–100 ký tự, phân trang tối đa 50 kết quả mỗi trang. Bản chia sẻ là một bài viết công khai trên trang cá nhân, có thể lưu và tương tác như bài viết thường. Bài gốc phải công khai tại thời điểm chia sẻ. Khi bài gốc chuyển riêng tư hoặc bị xóa, phần xem trước hiển thị thông báo bài gốc không còn khả dụng. Caption đã đăng vẫn hiển thị. Nút chia sẻ chỉ có trên bài gốc.

Socket.IO dùng JWT lúc kết nối và kiểm tra thành viên cuộc trò chuyện trên server khi bắt đầu hoặc nhận cuộc gọi. Người tham gia mới gửi SDP offer tới từng người đã tham gia. Socket.IO chuyển SDP và ICE, còn luồng âm thanh và hình ảnh do WebRTC truyền. Một cuộc gọi có tối đa 6 người, bao gồm người gọi, và lời mời chờ 30 giây. Người nhận cần mở trang **Trò chuyện**. Trạng thái gọi được giữ trong bộ nhớ của một tiến trình backend.

### Kịch bản demo

1. **Tìm kiếm.** Đăng nhập, nhập họ tên hoặc username rồi bấm **Tìm**. Mở một hồ sơ từ kết quả. Dùng tab **Bài viết** để tìm một cụm từ trong bài công khai. Dùng hai tài khoản để kiểm tra bài riêng tư chỉ xuất hiện khi chủ bài tìm.
2. **Chia sẻ.** Từ bài công khai, bấm **Chia sẻ**. Thử đăng một lần với cảm nghĩ và một lần để trống. Xem lại trên **Bảng tin** và **Trang cá nhân** của người chia sẻ. Đổi quyền riêng tư hoặc xóa bài gốc bằng tài khoản chủ bài, rồi tải lại bản chia sẻ để xem thông báo.
3. **Gọi 1–1.** Mở hai hồ sơ trình duyệt riêng để đăng nhập hai tài khoản. Cả hai vào **Trò chuyện**, sau đó một người bấm **Gọi video** và người kia bấm **Nhận cuộc gọi**. Thử tắt micrô, tắt camera và rời cuộc gọi.
4. **Gọi nhóm.** Dùng ba tài khoản trong ba hồ sơ trình duyệt riêng, tạo cuộc trò chuyện nhóm từ trang chat. Cho hai người lần lượt nhận cuộc gọi. Kiểm tra mỗi người thấy video của hai người còn lại, sau đó cho một người rời và kiểm tra hai người còn lại vẫn gọi được.

Dùng `localhost` khi demo trên cùng máy, hoặc dùng HTTPS khi mở trên các thiết bị khác. WebRTC dùng STUN mặc định. Để demo giữa các mạng khác nhau, cấu hình TURN với `VITE_TURN_URL`, `VITE_TURN_USERNAME` và `VITE_TURN_CREDENTIAL` trong `frontend/.env.local`, rồi khởi động lại Vite hoặc build lại. Biến Vite được đưa vào frontend, vì vậy chỉ dùng thông tin TURN demo có thời hạn; triển khai công khai cần cấp thông tin TURN ngắn hạn từ backend. Nếu triển khai qua reverse proxy, chuyển tiếp `/socket.io` và WebSocket upgrade.
