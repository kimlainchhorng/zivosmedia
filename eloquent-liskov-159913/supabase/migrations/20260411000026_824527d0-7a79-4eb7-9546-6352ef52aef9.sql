CREATE POLICY "Users can delete own enrollments"
ON public.creator_program_enrollments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);