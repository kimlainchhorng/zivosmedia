-- Handler deployed; signed readiness returned HTTP200 with WebSocket round-trip
-- and existing Telegram bot/chat access confirmed before activation.
select cron.schedule('media-realtime-health-5min','*/5 * * * *',
  $$select private.enqueue_media_operations('execute');$$);
