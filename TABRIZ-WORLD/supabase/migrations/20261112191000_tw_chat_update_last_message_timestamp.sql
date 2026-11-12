-- Keep conversation ordering in sync with the latest inserted message.
-- Applied to Supabase project msiiyofbjymwjwgfjbpw on 2026-11-12.

create or replace function public.tw_touch_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tw_conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists tw_messages_touch_conversation on public.tw_messages;
create trigger tw_messages_touch_conversation
after insert on public.tw_messages
for each row execute function public.tw_touch_conversation_last_message();

revoke all on function public.tw_touch_conversation_last_message() from public, anon, authenticated;
