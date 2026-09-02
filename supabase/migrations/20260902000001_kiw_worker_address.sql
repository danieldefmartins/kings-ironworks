-- Worker home address.
--
-- Payroll needs a mailing address per employee (W-2, state withholding, and the
-- pay stub itself), and until now the only place it lived was outside the app.
-- Admin-only like hourly_rate: kiw_shop_workers is already reachable through
-- the service-role key alone, and the /shop/admin tree is is_admin gated.

alter table kiw_shop_workers add column if not exists address text;

comment on column kiw_shop_workers.address is
  'Employee home address for payroll. Admin-only — never rendered on the shop floor.';
