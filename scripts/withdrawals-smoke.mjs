import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
const adminId = '11111111-1111-4111-8111-111111111111';
const memberId = '22222222-2222-4222-8222-222222222222';
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth; create schema private; create schema storage;
  create table auth.users(id uuid primary key, raw_app_meta_data jsonb);
  create function auth.uid() returns uuid language sql as $$ select '${adminId}'::uuid $$;
  create function private.is_admin() returns boolean language sql as $$ select true $$;
  create table public.member(id uuid primary key, full_name text, batch_year integer);
  create table public.membership_fee(id uuid primary key default gen_random_uuid(), member_id uuid references public.member(id), fees jsonb);
  create table public.config(key text primary key, value text);
  create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects(bucket_id text, name text);
  create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
  alter table storage.objects enable row level security;
  insert into auth.users values ('${adminId}', '{"display_name":"Treasurer Admin"}');
  insert into public.member values ('${memberId}', 'Test Member', 2026);
  insert into public.config values ('ACADEMIC_BATCH_YEAR','2008');
  insert into public.membership_fee(member_id,fees) values
    ('${memberId}', '[{"academic_year":"2026/2027","fee_amount":500,"paid_date":"2026-10-20T05:00:00Z"}]');
`);
for (const migrationFile of [
  '20261020125250_admin_withdrawals_passbook.sql',
  '20261020143000_withdrawal_payout_methods.sql',
  '20261020154529_withdrawal_transfer_recipient.sql',
  '20261020155343_simplify_withdrawal_bank_details.sql',
]) {
  await db.exec(readFileSync(new URL(`../supabase/migrations/${migrationFile}`, import.meta.url), 'utf8'));
}
const initial = await db.query('select private.withdrawal_passbook(100) as statement');
assert.equal(Number(initial.rows[0].statement.available), 500);
const result = await db.query("select private.record_admin_withdrawal('bank_transfer', 200, 'Test Recipient', 'REF-1', null, 'Equipment') as record");
const withdrawal = result.rows[0].record.withdrawal;
assert.equal(withdrawal.withdrawn_by, adminId);
assert.equal(withdrawal.withdrawn_by_name, 'Treasurer Admin');
assert.equal(withdrawal.transferred_to, 'Test Recipient');
assert.equal(withdrawal.account_holder, undefined);
assert.equal(withdrawal.bank_name, undefined);
assert.equal(withdrawal.account_number, undefined);
assert.equal(Number(result.rows[0].record.available_balance), 300);
const statement = await db.query('select private.withdrawal_passbook(100) as statement');
assert.equal(Number(statement.rows[0].statement.available), 300);
assert.equal(statement.rows[0].statement.entries.length, 2);
assert.equal(statement.rows[0].statement.entries[0].transferred_to, 'Test Recipient');
await assert.rejects(db.query("select private.record_admin_withdrawal('bank_transfer', 1, '', null, null, 'Equipment')"), /who receives this transfer/);
await assert.rejects(db.query("select private.record_admin_withdrawal('bank_transfer', 301, 'Test Recipient', null, null, 'Equipment')"), /exceeds the available balance/);
await assert.rejects(db.query(`update public.admin_withdrawal set amount=1 where id='${withdrawal.id}'`), /cannot be changed/);
await assert.rejects(db.query(`delete from public.admin_withdrawal where id='${withdrawal.id}'`), /cannot be deleted/);
await assert.rejects(db.query(`update public.membership_fee set fees='[{"academic_year":"2026/2027","fee_amount":100,"paid_date":"2026-10-20T05:00:00Z"}]' where member_id='${memberId}'`), /leave recorded withdrawals above available funds/);
await assert.rejects(db.query(`update public.member set batch_year=2008 where id='${memberId}'`), /leave recorded withdrawals above available funds/);
await assert.rejects(db.query("update public.config set value='2026' where key='ACADEMIC_BATCH_YEAR'"), /leave recorded withdrawals above available funds/);
const receiptPath = `${adminId}/${withdrawal.id}/receipt.pdf`;
await db.query('insert into storage.objects values ($1, $2)', ['admin-withdrawal-receipts', receiptPath]);
await assert.rejects(db.query('select private.attach_withdrawal_receipt($1, $2)', [withdrawal.id, `other/${withdrawal.id}/receipt.pdf`]), /Invalid receipt path/);
const attached = await db.query('select private.attach_withdrawal_receipt($1, $2) as receipt', [withdrawal.id, receiptPath]);
assert.equal(attached.rows[0].receipt.receipt_path, receiptPath);
await assert.rejects(db.query('select private.attach_withdrawal_receipt($1, $2)', [withdrawal.id, receiptPath]), /already has a receipt/);
await db.exec('create or replace function private.is_admin() returns boolean language sql as $$ select false $$;');
await assert.rejects(db.query('select private.withdrawal_passbook(100)'), /Admin access required/);
await assert.rejects(db.query("select private.record_admin_withdrawal('bank_transfer', 1, 'Test Recipient', null, null, 'Equipment')"), /Admin access required/);
console.log('Withdrawal migration smoke test passed.');
await db.close();
