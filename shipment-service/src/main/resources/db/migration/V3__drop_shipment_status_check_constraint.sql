-- Migration: Drop check constraint on shipments.current_status to allow new statuses (CANCELLED, ARRIVED_DEST_HUB, RETURNING, RETURNED, etc.)
DECLARE @ConstraintName NVARCHAR(200);
DECLARE constraint_cursor CURSOR FOR
    SELECT cc.name
    FROM sys.check_constraints cc
    JOIN sys.columns col ON cc.parent_object_id = col.object_id AND cc.parent_column_id = col.column_id
    JOIN sys.tables t ON cc.parent_object_id = t.object_id
    WHERE t.name = 'shipments' AND col.name = 'current_status';

OPEN constraint_cursor;
FETCH NEXT FROM constraint_cursor INTO @ConstraintName;

WHILE @@FETCH_STATUS = 0
BEGIN
    EXEC('ALTER TABLE shipments DROP CONSTRAINT ' + @ConstraintName);
    FETCH NEXT FROM constraint_cursor INTO @ConstraintName;
END;

CLOSE constraint_cursor;
DEALLOCATE constraint_cursor;
