-- Allow admins to view all store chats
CREATE POLICY "Admins can view all store chats" ON public.store_chats
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to delete store chats
CREATE POLICY "Admins can delete store chats" ON public.store_chats
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to view all store chat messages
CREATE POLICY "Admins can view all store chat messages" ON public.store_chat_messages
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to send messages as store
CREATE POLICY "Admins can send store messages" ON public.store_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    public.is_admin(auth.uid())
  );

-- Allow admins to delete store chat messages
CREATE POLICY "Admins can delete store chat messages" ON public.store_chat_messages
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));