-- Permettre plusieurs générations image en parallèle / enchaînées (request_id unique suffit).
drop index if exists public.generations_one_processing_per_user_idx;
