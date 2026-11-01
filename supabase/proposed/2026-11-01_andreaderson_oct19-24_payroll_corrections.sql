-- PROPOSED payroll data fix — NOT EXECUTED. Needs the owner's OK.
-- Worker: Andreaderson Rocha de Almeida (e8b8c497-0677-47c6-831a-e58a53868e03), $22.00/h
-- Source of truth: owner-confirmed third-party timesheet, Oct 19–24 2026 (57:37, $1,267.56).
--
-- Not a migration (lives outside supabase/migrations). Run by hand:
--   npx -y supabase@2 db query --linked -f supabase/proposed/2026-11-01_andreaderson_oct19-24_payroll_corrections.sql
-- It ends in ROLLBACK so a dry run changes nothing; change the last line to COMMIT to apply.
-- Every UPDATE is guarded on the current (wrong) value, so a re-run or an
-- already-fixed row is a no-op. Provenance goes to kiw_shop_audit only; no
-- shift notes are added (owner rule: shift notes stay clean).

begin;

-- 1) 10/21 — forgot to clock out; "out" tapped 10/22 7:35 AM → stored 23:51 paid.
--    Correct: 7:44 AM – 5:55 PM (10:11). This is exactly the worker's own
--    pending correction request f8335789 ("não registrou a saida").
update kiw_shop_shifts
   set ended_at = '2026-10-21T21:55:00Z', updated_at = now()
 where org_id = 'a0000000-0000-4000-8000-000000000001'
   and id = 'a96dde12-430c-4d3e-8cde-314dee6b7702'
   and ended_at = '2026-10-22T11:35:13.51Z';

update kiw_shop_time_corrections
   set status = 'approved', reviewed_by = '046a9e3d-eac9-4d75-98bf-ec7947bb6fb8', reviewed_at = now()
 where org_id = 'a0000000-0000-4000-8000-000000000001'
   and id = 'f8335789-4227-4ae1-a2f7-bae38bada9b4'
   and status = 'pending';

-- Pin the corrected end in the work-hours window log, so a later window
-- review/answer recomputes to 5:55 PM instead of the 7:35 AM tap.
insert into kiw_shop_audit (org_id, worker_id, action, entity, entity_id, detail)
select 'a0000000-0000-4000-8000-000000000001', '046a9e3d-eac9-4d75-98bf-ec7947bb6fb8', 'shift_window', 'shift',
       'a96dde12-430c-4d3e-8cde-314dee6b7702',
       jsonb_build_object('shiftId','a96dde12-430c-4d3e-8cde-314dee6b7702','workerId','e8b8c497-0677-47c6-831a-e58a53868e03',
                          'edge','end','punchedAt','2026-10-21T21:55:00.000Z','edgeAt','2026-10-21T21:00:00.000Z',
                          'answer','approved','ask',true)
 where not exists (select 1 from kiw_shop_audit where entity_id = 'a96dde12-430c-4d3e-8cde-314dee6b7702'
                     and action = 'shift_window' and detail->>'punchedAt' = '2026-10-21T21:55:00.000Z');

insert into kiw_shop_audit (org_id, worker_id, action, entity, entity_id, detail)
values ('a0000000-0000-4000-8000-000000000001', '046a9e3d-eac9-4d75-98bf-ec7947bb6fb8', 'payroll_correction', 'shift',
        'a96dde12-430c-4d3e-8cde-314dee6b7702',
        '{"reason":"Forgotten clock-out closed next morning; set to the worker''s requested 5:55 PM, matching the owner-confirmed third-party timesheet","from":"2026-10-22T11:35:13.51Z","to":"2026-10-21T21:55:00Z","hoursFrom":23.85,"hoursTo":10.18,"payDelta":-300.71}');

-- 2) 10/23 evening call-back 7:09 – 8:23 PM — rounded to the 5:00 PM edge on
--    both ends after "deny" → stored as 0:00. Correct: 1:14 (actual taps).
update kiw_shop_shifts
   set ended_at = '2026-10-24T00:23:13.674Z', updated_at = now()
 where org_id = 'a0000000-0000-4000-8000-000000000001'
   and id = '4443f4d3-bdbf-4cf0-8642-06f7225bd179'
   and ended_at = started_at;

insert into kiw_shop_audit (org_id, worker_id, action, entity, entity_id, detail)
select 'a0000000-0000-4000-8000-000000000001', '046a9e3d-eac9-4d75-98bf-ec7947bb6fb8', 'shift_window', 'shift',
       '4443f4d3-bdbf-4cf0-8642-06f7225bd179',
       jsonb_build_object('shiftId','4443f4d3-bdbf-4cf0-8642-06f7225bd179','workerId','e8b8c497-0677-47c6-831a-e58a53868e03',
                          'edge','end','punchedAt','2026-10-24T00:23:13.674Z','edgeAt','2026-10-23T21:00:00.000Z',
                          'answer','approved','ask',true)
 where not exists (select 1 from kiw_shop_audit where entity_id = '4443f4d3-bdbf-4cf0-8642-06f7225bd179'
                     and action = 'shift_window' and detail->>'answer' = 'approved');

insert into kiw_shop_audit (org_id, worker_id, action, entity, entity_id, detail)
values ('a0000000-0000-4000-8000-000000000001', '046a9e3d-eac9-4d75-98bf-ec7947bb6fb8', 'payroll_correction', 'shift',
        '4443f4d3-bdbf-4cf0-8642-06f7225bd179',
        '{"reason":"Evening shift entirely after the 5 PM window was rounded to zero; restored to actual taps, matching the owner-confirmed third-party timesheet","from":"0:00","to":"2026-10-24T00:23:13.674Z","hoursTo":1.23,"payDelta":26.97}');

-- 3) SEPARATE OWNER DECISION — 10/10 (outside the PDF's days, NOT applied).
--    Clock-out tapped Sunday 10/11 8:35 AM; owner edit on 10/26 typed the end
--    as Sunday 1:44 PM → a 30:09 shift, held out of pay. The worker's pending
--    request 7db8afc1 asks for Sat 7:35 AM – 1:44 PM (6:09 = $135.30).
--    Uncomment only if the owner confirms 1:44 PM SATURDAY.
-- update kiw_shop_shifts set ended_at = '2026-10-10T17:44:00Z', updated_at = now()
--  where org_id = 'a0000000-0000-4000-8000-000000000001' and id = '790a1343-72af-436d-967f-6ac83b49305f'
--    and ended_at = '2026-10-11T17:44:00Z';
-- update kiw_shop_time_corrections set status = 'approved', reviewed_by = '046a9e3d-eac9-4d75-98bf-ec7947bb6fb8', reviewed_at = now()
--  where org_id = 'a0000000-0000-4000-8000-000000000001' and id = '7db8afc1-80b1-4577-a4d8-7b496300f6f5' and status = 'pending';

-- Verify: expect 10/19 11:11, 10/20 9:10, 10/21 10:11, 10/22 4:58, 10/23 9:48 + 1:14, 10/24 11:05
-- (whole-minute arithmetic, as the fixed app computes it).
select to_char(started_at at time zone 'America/New_York', 'Dy MM-DD HH24:MI') as clock_in,
       to_char(ended_at   at time zone 'America/New_York', 'MM-DD HH24:MI')    as clock_out,
       round(extract(epoch from date_trunc('minute', ended_at) - date_trunc('minute', started_at)) / 3600, 4) as hours,
       round(extract(epoch from date_trunc('minute', ended_at) - date_trunc('minute', started_at)) / 3600 * 22, 2) as pay
  from kiw_shop_shifts
 where worker_id = 'e8b8c497-0677-47c6-831a-e58a53868e03'
   and started_at >= '2026-10-19T04:00:00Z' and started_at < '2026-10-26T04:00:00Z'
   and status <> 'rejected'
 order by started_at;

rollback;  -- change to COMMIT after the owner approves
