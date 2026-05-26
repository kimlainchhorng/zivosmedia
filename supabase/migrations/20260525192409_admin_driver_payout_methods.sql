drop policy if exists "Admins can view payout methods" on public.customer_payout_methods;

create policy "Admins can view payout methods"
  on public.customer_payout_methods
  for select
  using (public.has_role(auth.uid(), 'admin'));

comment on policy "Admins can view payout methods" on public.customer_payout_methods is
  'Allows finance admins to see saved ABA/bank payout destinations when resolving manual driver payouts.';
