-- TABRIZ WORLD chat read receipts and minimal private contact display names.
-- Applied to Supabase project msiiyofbjymwjwgfjbpw on 2026-11-12.

drop policy if exists "TW recipients can mark messages as read" on public.tw_messages;
create policy "TW recipients can mark messages as read"
on public.tw_messages for update to authenticated
using (
  sender_id <> (select auth.uid())
  and exists (
    select 1 from public.tw_conversations c
    where c.id = tw_messages.conversation_id
      and ((select auth.uid()) = c.buyer_id or (select auth.uid()) = c.seller_id)
  )
)
with check (
  sender_id <> (select auth.uid())
  and read_at is not null
  and exists (
    select 1 from public.tw_conversations c
    where c.id = tw_messages.conversation_id
      and ((select auth.uid()) = c.buyer_id or (select auth.uid()) = c.seller_id)
  )
);

-- Clients may update only read_at, never message body or sender identity.
revoke update on table public.tw_messages from authenticated;
grant update (read_at) on table public.tw_messages to authenticated;

-- Return only the other participant's display name, not address or phone.
create or replace function public.tw_conversation_contacts()
returns table (conversation_id uuid, counterpart_id uuid, display_name text)
language sql stable security definer
set search_path = public, auth
as $$
  select c.id,
    case when c.buyer_id = (select auth.uid()) then c.seller_id else c.buyer_id end,
    coalesce(nullif(btrim(p.full_name), ''),
      case when c.buyer_id = (select auth.uid()) then 'فروشنده' else 'مشتری' end)
  from public.tw_conversations c
  left join public.tw_customer_profiles p
    on p.user_id = case when c.buyer_id = (select auth.uid()) then c.seller_id else c.buyer_id end
  where c.buyer_id = (select auth.uid()) or c.seller_id = (select auth.uid());
$$;
revoke all on function public.tw_conversation_contacts() from public;
grant execute on function public.tw_conversation_contacts() to authenticated;
