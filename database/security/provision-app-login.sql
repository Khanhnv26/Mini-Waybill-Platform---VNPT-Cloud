-- Run with sqlcmd -v AppPassword=<generated DB_APP_PASSWORD> using an administrator connection.
-- AppPassword must come from prepare-runtime-secrets.ps1 (Wb! followed by hex).
DECLARE @password NVARCHAR(128) = N'$(AppPassword)';
IF @password NOT LIKE N'Wb!%' OR LEN(@password) < 40 THROW 50000, 'Use a generated application password.', 1;
DECLARE @sql NVARCHAR(MAX);
IF SUSER_ID(N'waybill_app') IS NULL
    SET @sql = N'CREATE LOGIN [waybill_app] WITH PASSWORD = ' + QUOTENAME(@password, '''') + N', CHECK_POLICY=ON;';
ELSE
    SET @sql = N'ALTER LOGIN [waybill_app] WITH PASSWORD = ' + QUOTENAME(@password, '''') + N';';
EXEC(@sql);

DECLARE @db SYSNAME;
DECLARE databases CURSOR LOCAL FAST_FORWARD FOR
SELECT name FROM sys.databases WHERE name IN
('auth_db','customer_db','shipment_db','routing_db','tracking_db','notification_db','audit_db','shipper_db','report_db','support_db','rating_db','payment_db');
OPEN databases;
FETCH NEXT FROM databases INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @sql = N'USE ' + QUOTENAME(@db) + N';
      IF USER_ID(N''waybill_app'') IS NULL CREATE USER [waybill_app] FOR LOGIN [waybill_app];
      ALTER ROLE [db_datareader] ADD MEMBER [waybill_app];
      ALTER ROLE [db_datawriter] ADD MEMBER [waybill_app];
      ALTER ROLE [db_ddladmin] ADD MEMBER [waybill_app];
      GRANT VIEW DEFINITION TO [waybill_app];';
    EXEC(@sql);
    FETCH NEXT FROM databases INTO @db;
END;
CLOSE databases;
DEALLOCATE databases;
