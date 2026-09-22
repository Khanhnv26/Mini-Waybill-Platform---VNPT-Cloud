IF COL_LENGTH('users', 'phone_number') IS NULL
BEGIN
    ALTER TABLE users ADD phone_number NVARCHAR(20) NULL;
END
