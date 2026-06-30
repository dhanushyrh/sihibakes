-- Track admin read state separately from workflow status.
ALTER TABLE public.contact_enquiries
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Enquiries already handled should not reappear as unread notifications.
UPDATE public.contact_enquiries
SET read_at = COALESCE(updated_at, created_at)
WHERE read_at IS NULL
  AND status <> 'new';

CREATE INDEX IF NOT EXISTS contact_enquiries_unread_idx
  ON public.contact_enquiries (created_at DESC)
  WHERE read_at IS NULL;
