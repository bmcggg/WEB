-- 1. Khởi tạo Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'fella_db')
    CREATE DATABASE fella_db;
GO

USE fella_db;
GO

-- Bảng 1: USERS
CREATE TABLE IF NOT EXISTS users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) NOT NULL UNIQUE,
    email NVARCHAR(100) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(100) NOT NULL,
    avatar NVARCHAR(MAX),
    bio NVARCHAR(MAX),
    role NVARCHAR(20) CHECK(role IN ('ADMIN', 'USER')) DEFAULT 'USER',
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Bảng 2: POSTS
CREATE TABLE IF NOT EXISTS posts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    content NVARCHAR(MAX),
    privacy NVARCHAR(20) CHECK(privacy IN ('PUBLIC', 'FRIENDS', 'PRIVATE')) DEFAULT 'PUBLIC',
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng 3: COMMENTS
CREATE TABLE IF NOT EXISTS comments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION
);

-- Bảng 4: REACTIONS
CREATE TABLE IF NOT EXISTS reactions (
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    type NVARCHAR(20) CHECK(type IN ('LIKE','HEART','SAD','ANGRY','LAUGH')) DEFAULT 'LIKE',
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE NO ACTION
);

-- Bảng 5: FOLLOWS
CREATE TABLE IF NOT EXISTS follows (
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id <> following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE NO ACTION
);

-- Bảng 6: SHARES
CREATE TABLE IF NOT EXISTS shares (
    id INT IDENTITY(1,1) PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    caption NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION
);

-- Bảng 7: CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
    id INT IDENTITY(1,1) PRIMARY KEY,
    type NVARCHAR(20) NOT NULL CHECK(type IN ('DIRECT', 'GROUP')),
    name NVARCHAR(255),
    created_at DATETIME2 DEFAULT GETDATE(),
    CHECK ((type = 'DIRECT' AND name IS NULL) OR (type = 'GROUP' AND name IS NOT NULL))
);

-- Bảng 8: CONVERSATION_MEMBERS
CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at DATETIME2 DEFAULT GETDATE(),
    PRIMARY KEY (conversation_id, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Bảng 9: MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id INT IDENTITY(1,1) PRIMARY KEY,
    sender_id INT NOT NULL,
    conversation_id INT NOT NULL,
    content NVARCHAR(MAX),
    sent_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Bảng 10: MESSAGE_READS
CREATE TABLE IF NOT EXISTS message_reads (
    user_id INT NOT NULL,
    message_id INT NOT NULL,
    read_at DATETIME2 DEFAULT GETDATE(),
    PRIMARY KEY (user_id, message_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE NO ACTION
);

-- Bảng 11: MESSAGE_MEDIA
CREATE TABLE IF NOT EXISTS message_media (
    id INT IDENTITY(1,1) PRIMARY KEY,
    message_id INT NOT NULL,
    media_url NVARCHAR(MAX) NOT NULL,
    media_type NVARCHAR(20) NOT NULL CHECK(media_type IN ('IMAGE', 'VIDEO', 'AUDIO','FILE')),
    display_order INT DEFAULT 0,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Bảng 12: POST_MEDIA
CREATE TABLE IF NOT EXISTS post_media (
    id INT IDENTITY(1,1) PRIMARY KEY,
    post_id INT NOT NULL,
    media_url NVARCHAR(MAX) NOT NULL,
    media_type NVARCHAR(20) NOT NULL CHECK(media_type IN ('IMAGE', 'VIDEO', 'AUDIO','FILE')),
    display_order INT DEFAULT 0,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Bảng 13: COMMENT_MEDIA
CREATE TABLE IF NOT EXISTS comment_media (
    id INT IDENTITY(1,1) PRIMARY KEY,
    comment_id INT NOT NULL,
    media_url NVARCHAR(MAX) NOT NULL,
    media_type NVARCHAR(20) NOT NULL CHECK(media_type IN ('IMAGE', 'VIDEO', 'AUDIO','FILE')),
    display_order INT DEFAULT 0,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Bảng 14: NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    type NVARCHAR(20) CHECK(type IN ('REACTED','COMMENTED','FOLLOWED','MESSAGED')) NOT NULL,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    post_id INT,
    comment_id INT,
    message_id INT,
    is_read INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE NO ACTION,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE NO ACTION,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE NO ACTION,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE NO ACTION
);

CREATE INDEX idx_notifications_receiver ON notifications(receiver_id);

-- Bảng 15: STORIES
CREATE TABLE IF NOT EXISTS stories (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    media_url NVARCHAR(MAX) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng 16: SAVED_POSTS
CREATE TABLE IF NOT EXISTS saved_posts (
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE NO ACTION
);
