const sql = require("mssql");
const fs = require("fs");
const path = require("path");
const { config } = require("./database");

async function initDatabase() {
    const databaseName = config.database;
    let masterPool;

    try {
        masterPool = await new sql.ConnectionPool({
            ...config,
            database: "master"
        }).connect();

        await masterPool.request()
            .input("dbName", sql.NVarChar(128), databaseName)
            .query(`
                IF DB_ID(@dbName) IS NULL
                BEGIN
                    DECLARE @cmd NVARCHAR(MAX);
                    SET @cmd = N'CREATE DATABASE ' + QUOTENAME(@dbName);
                    EXEC sp_executesql @cmd;
                END;
            `);

        await masterPool.close();
        masterPool = null;

        const appPool = await new sql.ConnectionPool({
            ...config,
            database: databaseName
        }).connect();

        try {
            const checkTable = await appPool.request().query(`
                SELECT OBJECT_ID(N'dbo.users', N'U') AS table_id
            `);

            if (checkTable.recordset[0].table_id !== null) {
                // Đảm bảo các cột mới tồn tại trong bảng users
                await appPool.request().query(`
                    IF NOT EXISTS (
                        SELECT 1 FROM sys.columns 
                        WHERE object_id = OBJECT_ID(N'dbo.users') AND name = 'is_verified'
                    )
                    BEGIN
                        ALTER TABLE dbo.users ADD is_verified BIT DEFAULT 0;
                    END;

                    IF NOT EXISTS (
                        SELECT 1 FROM sys.columns 
                        WHERE object_id = OBJECT_ID(N'dbo.users') AND name = 'cover'
                    )
                    BEGIN
                        ALTER TABLE dbo.users ADD cover NVARCHAR(MAX) NULL;
                    END;

                    IF NOT EXISTS (
                        SELECT 1 FROM sys.columns 
                        WHERE object_id = OBJECT_ID(N'dbo.users') AND name = 'deleted_at'
                    )
                    BEGIN
                        ALTER TABLE dbo.users ADD deleted_at DATETIME2 NULL;
                    END;
                `);

                // Kiểm tra và chuyển đổi users thành GRAPH NODE nếu chưa là NODE table
                const nodeCheck = await appPool.request().query(`
                    SELECT is_node FROM sys.tables WHERE object_id = OBJECT_ID(N'dbo.users')
                `);

                if (nodeCheck.recordset[0] && !nodeCheck.recordset[0].is_node) {
                    await appPool.request().batch(`
                        DECLARE @dropFks NVARCHAR(MAX) = N'';
                        SELECT @dropFks += N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + 
                                           N' DROP CONSTRAINT ' + QUOTENAME(name) + ';'
                        FROM sys.foreign_keys
                        WHERE referenced_object_id = OBJECT_ID(N'dbo.users');
                        IF @dropFks <> N'' EXEC sp_executesql @dropFks;

                        EXEC sp_rename 'dbo.users', 'users_old';

                        CREATE TABLE dbo.users (
                            id INT IDENTITY(1,1) PRIMARY KEY,
                            username NVARCHAR(50) NOT NULL UNIQUE,
                            email NVARCHAR(100) NOT NULL UNIQUE,
                            password NVARCHAR(255) NOT NULL,
                            full_name NVARCHAR(100) NOT NULL,
                            avatar NVARCHAR(MAX),
                            cover NVARCHAR(MAX),
                            bio NVARCHAR(MAX),
                            role NVARCHAR(20) CHECK(role IN ('ADMIN', 'USER')) DEFAULT 'USER',
                            is_verified BIT DEFAULT 0,
                            deleted_at DATETIME2 NULL,
                            created_at DATETIME2 DEFAULT GETDATE()
                        ) AS NODE;

                        SET IDENTITY_INSERT dbo.users ON;
                        INSERT INTO dbo.users (id, username, email, password, full_name, avatar, cover, bio, role, is_verified, deleted_at, created_at)
                        SELECT id, username, email, password, full_name, avatar, 
                               CASE WHEN COL_LENGTH('dbo.users_old', 'cover') IS NOT NULL THEN cover ELSE NULL END, 
                               bio, role, is_verified, 
                               CASE WHEN COL_LENGTH('dbo.users_old', 'deleted_at') IS NOT NULL THEN deleted_at ELSE NULL END, 
                               created_at 
                        FROM dbo.users_old;
                        SET IDENTITY_INSERT dbo.users OFF;

                        DROP TABLE dbo.users_old;

                        IF OBJECT_ID(N'dbo.posts', N'U') IS NOT NULL
                            ALTER TABLE dbo.posts ADD CONSTRAINT FK_posts_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE;
                        IF OBJECT_ID(N'dbo.comments', N'U') IS NOT NULL
                            ALTER TABLE dbo.comments ADD CONSTRAINT FK_comments_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION;
                        IF OBJECT_ID(N'dbo.reactions', N'U') IS NOT NULL
                            ALTER TABLE dbo.reactions ADD CONSTRAINT FK_reactions_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE;
                    `);
                }

                // Đảm bảo follows là GRAPH EDGE table
                const edgeFollowCheck = await appPool.request().query(`
                    SELECT is_edge FROM sys.tables WHERE object_id = OBJECT_ID(N'dbo.follows')
                `);
                if (!edgeFollowCheck.recordset[0] || !edgeFollowCheck.recordset[0].is_edge) {
                    await appPool.request().batch(`
                        IF OBJECT_ID(N'dbo.follows', N'U') IS NOT NULL DROP TABLE dbo.follows;
                        CREATE TABLE dbo.follows (
                            created_at DATETIME2 DEFAULT GETDATE()
                        ) AS EDGE;
                    `);
                }

                // Đảm bảo friends_with (AS EDGE) tồn tại
                const edgeFriendsCheck = await appPool.request().query(`
                    SELECT is_edge FROM sys.tables WHERE object_id = OBJECT_ID(N'dbo.friends_with')
                `);
                if (!edgeFriendsCheck.recordset[0] || !edgeFriendsCheck.recordset[0].is_edge) {
                    await appPool.request().batch(`
                        IF OBJECT_ID(N'dbo.friends_with', N'U') IS NOT NULL DROP TABLE dbo.friends_with;
                        CREATE TABLE dbo.friends_with (
                            since DATETIME2 DEFAULT GETDATE()
                        ) AS EDGE;
                    `);
                }

                // Đảm bảo friend_requests tồn tại
                await appPool.request().batch(`
                    IF OBJECT_ID(N'dbo.friend_requests', N'U') IS NULL
                    BEGIN
                        CREATE TABLE dbo.friend_requests (
                            id INT IDENTITY(1,1) PRIMARY KEY,
                            requester_id INT NOT NULL,
                            receiver_id INT NOT NULL,
                            status NVARCHAR(20) NOT NULL CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
                            created_at DATETIME2 DEFAULT GETDATE(),
                            updated_at DATETIME2 DEFAULT GETDATE(),
                            CHECK (requester_id <> receiver_id),
                            CONSTRAINT UQ_friend_req_dir UNIQUE (requester_id, receiver_id),
                            FOREIGN KEY (requester_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
                            FOREIGN KEY (receiver_id) REFERENCES dbo.users(id) ON DELETE NO ACTION
                        );
                    END;
                `);

                return;
            }
            
            const schemaPath = path.join(__dirname, "..", "sql", "schema.sql");
            let schema = fs.readFileSync(schemaPath, "utf8");

            schema = schema.replace(
                /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z_][\w]*)\s*\(([\s\S]*?)\);/gi,
                (_, tableName, columns) => `
                    IF OBJECT_ID(N'dbo.${tableName}', N'U') IS NULL
                    BEGIN
                        CREATE TABLE dbo.${tableName} (${columns});
                    END;
                `
            );

            schema = schema.replace(
                /CREATE\s+INDEX\s+([a-zA-Z_][\w]*)\s+ON\s+([a-zA-Z_][\w]*)\s*\(([^;]+)\);/gi,
                (_, indexName, tableName, columns) => `
                    IF NOT EXISTS (
                        SELECT 1 FROM sys.indexes 
                        WHERE name = N'${indexName}' 
                        AND object_id = OBJECT_ID(N'dbo.${tableName}')
                    )
                    BEGIN
                        CREATE INDEX [${indexName}] ON dbo.[${tableName}] (${columns});
                    END;
                `
            );

            await appPool.request().batch(schema);
        } finally {
            await appPool.close();
        }
    } catch (error) {
        if (masterPool) {
            await masterPool.close().catch(() => {});
        }
        console.error("Khởi tạo database thất bại:", error.message);
        throw error;
    }
}

module.exports = initDatabase;
