-- Gói ECO đã có trong ứng dụng; CHECK cũ chỉ cho STANDARD và EXPRESS.
DECLARE @ConstraintName NVARCHAR(200);
DECLARE constraint_cursor CURSOR FOR
    SELECT cc.name
    FROM sys.check_constraints cc
    JOIN sys.columns col ON cc.parent_object_id = col.object_id AND cc.parent_column_id = col.column_id
    JOIN sys.tables t ON cc.parent_object_id = t.object_id
    WHERE t.name = 'shipments' AND col.name = 'service_type';

OPEN constraint_cursor;
FETCH NEXT FROM constraint_cursor INTO @ConstraintName;

WHILE @@FETCH_STATUS = 0
BEGIN
    EXEC('ALTER TABLE shipments DROP CONSTRAINT ' + @ConstraintName);
    FETCH NEXT FROM constraint_cursor INTO @ConstraintName;
END;

CLOSE constraint_cursor;
DEALLOCATE constraint_cursor;

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints WHERE name = 'CK_shipments_service_type'
)
BEGIN
    ALTER TABLE shipments ADD CONSTRAINT CK_shipments_service_type
        CHECK (service_type IN ('ECO', 'STANDARD', 'EXPRESS'));
END
