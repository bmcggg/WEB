
### 1. Bảng `users` (Tài khoản người dùng)
*Mục đích: Lưu trữ thông tin cá nhân, tài khoản đăng nhập và phân quyền của người dùng trong hệ thống.*

| Tên trường | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `id` | INT | **PK** | IDENTITY(1,1) | ID tự tăng |
| `username` | NVARCHAR(50) | | NOT NULL, UNIQUE | Tên đăng nhập |
| `email` | NVARCHAR(100) | | NOT NULL, UNIQUE | Địa chỉ email |
| `password` | NVARCHAR(255) | | NOT NULL | Mật khẩu (được băm bằng BCrypt) |
| `full_name` | NVARCHAR(100) | | NOT NULL | Họ và tên đầy đủ |
| `avatar` | NVARCHAR(MAX) | | NULL | Đường dẫn ảnh đại diện |
| `bio` | NVARCHAR(MAX) | | NULL | Tiểu sử cá nhân |
| `role` | NVARCHAR(20) | | CHECK ('ADMIN', 'USER'), DEFAULT 'USER' | Vai trò tài khoản |
| `created_at` | DATETIME2 | | DEFAULT GETDATE() | Thời gian tạo tài khoản |

---

### 2. Bảng `posts` (Bài viết)
*Mục đích: Lưu trữ thông tin bài viết do người dùng đăng tải.*

| Tên trường | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `id` | INT | **PK** | IDENTITY(1,1) | ID bài viết tự tăng |
| `user_id` | INT | **FK** | NOT NULL, REFERENCES `users(id)` ON DELETE CASCADE | ID người đăng bài |
| `content` | NVARCHAR(MAX) | | NULL | Nội dung bài viết |
| `privacy` | NVARCHAR(20) | | CHECK ('PUBLIC', 'FRIENDS', 'PRIVATE'), DEFAULT 'PUBLIC' | Quyền riêng tư của bài viết |
| `created_at` | DATETIME2 | | DEFAULT GETDATE() | Thời gian tạo bài viết |
| `updated_at` | DATETIME2 | | DEFAULT GETDATE() | Thời gian cập nhật bài viết gần nhất |

---

### 3. Bảng `comments` (Bình luận)
*Mục đích: Lưu trữ bình luận của người dùng trên các bài viết.*

| Tên trường | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `id` | INT | **PK** | IDENTITY(1,1) | ID bình luận tự tăng |
| `post_id` | INT | **FK** | NOT NULL, REFERENCES `posts(id)` ON DELETE CASCADE | ID bài viết được bình luận |
| `user_id` | INT | **FK** | NOT NULL, REFERENCES `users(id)` | ID người bình luận |
| `content` | NVARCHAR(MAX) | | NOT NULL | Nội dung bình luận |
| `created_at` | DATETIME2 | | DEFAULT GETDATE() | Thời gian tạo bình luận |

---

### 4. Bảng `reactions` (Cảm xúc bài viết)
*Mục đích: Lưu trữ tương tác cảm xúc (Thích, Tim, Bộc lộ cảm xúc) của người dùng đối với bài viết.*

| Tên trường | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `user_id` | INT | **PK, FK** | REFERENCES `users(id)` ON DELETE CASCADE | ID người tương tác |
| `post_id` | INT | **PK, FK** | REFERENCES `posts(id)` | ID bài viết được tương tác |
| `type` | NVARCHAR(20) | | CHECK ('LIKE', 'HEART', 'SAD', 'ANGRY', 'LAUGH'), DEFAULT 'LIKE' | Loại cảm xúc |
| `created_at` | DATETIME2 | | DEFAULT GETDATE() | Thời gian thả cảm xúc |

---

### 5. Bảng `follows` (Theo dõi)
*Mục đích: Lưu trữ mối quan hệ theo dõi giữa người dùng với người dùng.*

| Tên trường | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `follower_id` | INT | **PK, FK** | REFERENCES `users(id)` ON DELETE CASCADE | ID người bấm theo dõi |
| `following_id` | INT | **PK, FK** | REFERENCES `users(id)`, CHECK (`follower_id` <> `following_id`) | ID người được theo dõi |
| `created_at` | DATETIME2 | | DEFAULT GETDATE() | Thời gian thực hiện theo dõi |

---

### 6. Bảng `shares` (Chia sẻ bài viết)
*Mục đích: Quản lý việc chia sẻ bài viết của người dùng lên trang cá nhân.*

| Tên trường | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `id` | INT | **PK** | IDENTITY(1,1) | ID lượt chia sẻ tự tăng |
| `post_id` | INT | **FK** | NOT NULL, REFERENCES `posts(id)` ON DELETE CASCADE | ID bài viết gốc được chia sẻ |
| `user_id` | INT | **FK** | NOT NULL, REFERENCES `users(id)` | ID người thực hiện chia sẻ |
| `caption` | NVARCHAR(MAX) | | NULL | Lời nhắn/mô tả kèm theo khi chia sẻ |
| `created_at` | DATETIME2 | | DEFAULT GETDATE() | Thời gian chia sẻ |

---

### 7. Bảng `conversations` (Cuộc trò chuyện)
*Mục đích: Lưu trữ danh sách các phòng/cuộc trò chuyện (trực tiếp hoặc nhóm).*

| Tên trường | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `id` | INT | **PK** | IDENTITY(1,1) | ID cuộc trò chuyện tự tăng |
| `type` | NVARCHAR(20) | | NOT NULL, CHECK ('DIRECT', 'GROUP') | Loại hội thoại (Trực tiếp 1-1 hoặc Nhóm) |
| `name` | NVARCHAR(255) | | CHECK logic theo `type` | Tên nhóm (Bắt buộc với GROUP, NULL với DIRECT) |
| `created_at` | DATETIME2 | | DEFAULT GETDATE() | Thời gian tạo cuộc trò chuyện |

---

### 8. Bảng `conversation_members` (Thành viên cuộc trò chuyện)
*Mục đích: Quản lý các thành viên tham gia vào từng cuộc trò chuyện.*

| Tên trường | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `conversation_id` | INT | **PK, FK** | REFERENCES `conversations(id)` ON DELETE CASCADE | ID cuộc trò chuyện |
| `user_id` | INT | **PK, FK** | REFERENCES `users(id)` ON DELETE CASCADE | ID thành viên tham gia |
| `joined_at` | DATETIME2 | | DEFAULT GETDATE() | Thời gian tham gia |

---

### 9. Bảng `messages` (Tin nhắn)
*Mục đích: Lưu trữ danh sách tin nhắn trong các cuộc trò chuyện.*

| Tên trường | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `id` | INT | **PK** | IDENTITY(1,1) | ID tin nhắn tự tăng |
| `sender_id` | INT | **FK** | NOT NULL, REFERENCES `users(id)` ON DELETE CASCADE | ID người gửi tin nhắn |
| `conversation_id` | INT | **FK** | NOT NULL, REFERENCES `conversations(id)` ON DELETE CASCADE | ID cuộc trò chuyện |
| `content` | NVARCHAR(MAX) | | NULL | Nội dung văn bản của tin nhắn |
| `sent_at` | DATETIME2 | | DEFAULT GETDATE() | Thời gian gửi tin nhắn |

---

### 10. Bảng `message_reads` (Trạng thái đã đọc tin nhắn)
*Mục đích: Theo dõi trạng thái đã đọc tin nhắn của từng người dùng.*

| Tên trường | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `user_id` | INT | **PK, FK** | REFERENCES `users(id)` ON DELETE CASCADE | ID người đọc tin nhắn |
| `message_id` | INT | **PK, FK** | REFERENCES `messages(id)` | ID tin nhắn được xem |
| `read_at` | DATETIME2 | | DEFAULT GETDATE() | Thời gian đã đọc tin nhắn |

---

### 11. Bảng `message_media` (Tệp đính kèm tin nhắn)
*Mục đích: Lưu trữ hình ảnh, video, âm thanh hoặc file đính kèm trong tin nhắn.*

| Tên trường | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `id` | INT | **PK** | IDENTITY(1,1) | ID tệp đính kèm tự tăng |
| `message_id` | INT | **FK** | NOT NULL, REFERENCES `messages(id)` ON DELETE CASCADE | ID tin nhắn chứa tệp |
| `media_url` | NVARCHAR(MAX) | | NOT NULL | Đường dẫn/URL tệp đa phương tiện |
| `media_type` | NVARCHAR(20) | | NOT NULL, CHECK ('IMAGE', 'VIDEO', 'AUDIO', 'FILE') | Loại tệp đính kèm |
| `display_order` | INT | | DEFAULT 0 | Thứ tự hiển thị của tệp |

---

### 12. Bảng `post_media` (Tệp đính kèm bài viết)
*Mục đích: Lưu trữ hình ảnh, video đính kèm thuộc bài viết.*

| Tên trường | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `id` | INT | **PK** | IDENTITY(1,1) | ID tệp bài viết tự tăng |
| `post_id` | INT | **FK** | NOT NULL, REFERENCES `posts(id)` ON DELETE CASCADE | ID bài viết chứa tệp |
| `media_url` | NVARCHAR(MAX) | | NOT NULL | Đường dẫn/URL tệp đa phương tiện |
| `media_type` | NVARCHAR(20) | | NOT NULL, CHECK ('IMAGE', 'VIDEO', 'AUDIO', 'FILE') | Loại tệp đính kèm |
| `display_order` | INT | | DEFAULT 0 | Thứ tự hiển thị của tệp trong bài viết |

---

### 13. Bảng `comment_media` (Tệp đính kèm bình luận)
*Mục đích: Lưu trữ các hình ảnh/tệp đi kèm trong bình luận.*

| Tên trường | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `id` | INT | **PK** | IDENTITY(1,1) | ID tệp bình luận tự tăng |
| `comment_id` | INT | **FK** | NOT NULL, REFERENCES `comments(id)` ON DELETE CASCADE | ID bình luận chứa tệp |
| `media_url` | NVARCHAR(MAX) | | NOT NULL | Đường dẫn/URL tệp |
| `media_type` | NVARCHAR(20) | | NOT NULL, CHECK ('IMAGE', 'VIDEO', 'AUDIO', 'FILE') | Loại tệp đính kèm |
| `display_order` | INT | | DEFAULT 0 | Thứ tự hiển thị tệp |

---

### 14. Bảng `notifications` (Thông báo)
*Mục đích: Lưu trữ các thông báo hệ thống gửi đến người dùng.*

| Tên trường | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `id` | INT | **PK** | IDENTITY(1,1) | ID thông báo tự tăng |
| `type` | NVARCHAR(20) | | NOT NULL, CHECK ('REACTED', 'COMMENTED', 'FOLLOWED', 'MESSAGED') | Loại hành động tạo thông báo |
| `sender_id` | INT | **FK** | NOT NULL, REFERENCES `users(id)` | ID người tạo ra hành động |
| `receiver_id` | INT | **FK** | NOT NULL, REFERENCES `users(id)` | ID người nhận thông báo |
| `post_id` | INT | **FK** | NULL, REFERENCES `posts(id)` ON DELETE CASCADE | ID bài viết liên quan (nếu có) |
| `comment_id` | INT | **FK** | NULL, REFERENCES `comments(id)` | ID bình luận liên quan (nếu có) |
| `message_id` | INT | **FK** | NULL, REFERENCES `messages(id)` | ID tin nhắn liên quan (nếu có) |
| `is_read` | INT | | DEFAULT 0 | Trạng thái đọc (0: Chưa đọc, 1: Đã đọc) |
| `created_at` | DATETIME2 | | DEFAULT GETDATE() | Thời gian tạo thông báo |

---

### 15. Bảng `stories` (Tin ngắn / Bảng tin 24h)
*Mục đích: Lưu trữ các bản tin ngắn có thời hạn hết hạn (Story).*

| Tên trường | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `id` | INT | **PK** | IDENTITY(1,1) | ID tin tự tăng |
| `user_id` | INT | **FK** | NOT NULL, REFERENCES `users(id)` ON DELETE CASCADE | ID người đăng tin |
| `media_url` | NVARCHAR(MAX) | | NOT NULL | Đường dẫn tệp nội dung |
| `expires_at` | DATETIME2 | | NOT NULL | Thời điểm tin hết hạn hiển thị |
| `created_at` | DATETIME2 | | DEFAULT GETDATE() | Thời gian tạo tin |

---

### 16. Bảng `saved_posts` (Bài viết đã lưu)
*Mục đích: Quản lý danh sách các bài viết được người dùng lưu lại.*

| Tên trường | Kiểu dữ liệu | Khóa | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `user_id` | INT | **PK, FK** | REFERENCES `users(id)` ON DELETE CASCADE | ID người lưu bài viết |
| `post_id` | INT | **PK, FK** | REFERENCES `posts(id)` | ID bài viết được lưu |
| `created_at` | DATETIME2 | | DEFAULT GETDATE() | Thời gian thực hiện lưu bài |