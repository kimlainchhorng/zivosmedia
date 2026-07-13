-- Force linked device removal through linked-device-manage.
-- Device registration and linking already use service-role Edge Functions.

ALTER TABLE public.linked_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS linked_devices_block_direct_delete ON public.linked_devices;
DROP POLICY IF EXISTS "linked_devices_block_direct_delete" ON public.linked_devices;
CREATE POLICY "linked_devices_block_direct_delete"
ON public.linked_devices
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON TABLE public.linked_devices IS
'Linked device removal is routed through linked-device-manage for trusted server-side ownership validation.';
