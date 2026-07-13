-- Fix: post_comments.post_id was migrated to uuid, but every other post_*
-- table keeps post_id as text and the frontend prefixes ids with "u-"
-- (see toUserPostInteractionId). Inserts therefore failed with
-- "invalid input syntax for type uuid" and the count trigger blew up with
-- "operator does not exist: uuid = text". Revert the column to text so
-- the schema matches the rest of the post_* tables and the trigger.
ALTER TABLE public.post_comments
  ALTER COLUMN post_id TYPE text USING post_id::text;
