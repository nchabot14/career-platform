-- Prints one line per table: schema.table | rows | md5 of every row. Run the
-- same file against two databases and diff the output to show a copy is
-- exact:
--   psql "$URL" -qAt -F' | ' -f scripts/db-fingerprint.sql
DO $$
DECLARE r record; n bigint; h text;
BEGIN
  CREATE TEMP TABLE fp (tbl text, rows bigint, md5 text);
  FOR r IN SELECT schemaname, tablename FROM pg_tables
           WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
             AND schemaname NOT LIKE 'pg_temp%' LOOP
    EXECUTE format('SELECT count(*), md5(coalesce(string_agg(t::text, %L ORDER BY t::text), %L)) FROM %I.%I t',
                   E'\n', '', r.schemaname, r.tablename) INTO n, h;
    INSERT INTO fp VALUES (r.schemaname || '.' || r.tablename, n, h);
  END LOOP;
END $$;
SELECT * FROM fp ORDER BY tbl;
