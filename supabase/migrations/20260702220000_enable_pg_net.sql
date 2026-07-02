create extension if not exists pg_net with schema extensions;

-- Grant usage on the net schema to the authenticated and anon roles
grant usage on schema extensions to authenticated, anon;
grant all on all functions in schema extensions to authenticated, anon;
