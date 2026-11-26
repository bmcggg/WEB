-- Keep the share and its caption when the original post is deleted.
IF COL_LENGTH(N'dbo.posts', N'shared_from_id') IS NULL
    ALTER TABLE dbo.posts ADD shared_from_id INT NULL;
