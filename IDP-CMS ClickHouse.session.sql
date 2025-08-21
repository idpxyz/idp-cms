SELECT 
    database,
    name,
    engine,
    total_rows,
    total_bytes,
    metadata_modification_time
FROM system.tables 
WHERE database NOT IN ('system', 'INFORMATION_SCHEMA')
ORDER BY database, name;