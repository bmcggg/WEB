const sql = require("mssql");
const fs = require("fs");
const path = require("path");
const { config } = require("./database");

async function initDatabase() {
    const databaseName = process.env.DB_DATABASE;
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

            if (checkTable.recordset[0].table_id !== null) 
                return;
            
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