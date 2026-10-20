import { useEffect, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import gsap from 'gsap';
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, BanknoteArrowUp, Check, FileText, Landmark, LoaderCircle, Paperclip, RefreshCw, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import { nameWithInitials } from '@/entities/members/lib/memberDisplay';
import { FileUpload } from '@/components/motion/file-upload';
import { AdminDialog } from './AdminDialog';
import '../withdrawals.css';

const bucket = 'admin-withdrawal-receipts';
const maxReceiptSize = 10 * 1024 * 1024;
const receiptExtensions = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const receiptMimeTypes = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const emptyForm = { method: 'bank_transfer', amount: '', transferred_to: '', transfer_reference: '', cash_recipient: '', purpose: '' };
const money = value => Number(value || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatAmountInput = value => {
  const [integer = '', fraction] = value.split('.');
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? groupedInteger : `${groupedInteger}.${fraction}`;
};
const dateTime = value => new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo' }).format(new Date(value));
const PURPOSE_PRESETS = [
  'Event production',
  'Equipment & gear',
  'Printing & stationery',
  'Transport & logistics',
  'Food & refreshments',
  'Member reimbursement',
  'Venue & stage hire',
  'Software / subscriptions',
  'Custom purpose…',
];

function validateReceipt(file) {
  if (!file) return null;
  if (!getReceiptType(file)) return 'Choose a PDF, JPG, PNG or WebP receipt.';
  if (file.size > maxReceiptSize) return 'The receipt must be smaller than 10 MB.';
  return null;
}

function getReceiptType(file) {
  const mimeType = file.type?.toLowerCase();
  if (mimeType) return receiptExtensions[mimeType] ? { mimeType, extension: receiptExtensions[mimeType] } : null;
  const extension = file.name?.split('.').pop()?.toLowerCase();
  const inferredMimeType = receiptMimeTypes[extension];
  return inferredMimeType
    ? { mimeType: inferredMimeType, extension: receiptExtensions[inferredMimeType] }
    : null;
}

export function WithdrawalsTab() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState(100);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(emptyForm);
  const [receipt, setReceipt] = useState(null);
  const [receiptItems, setReceiptItems] = useState([]);
  const [reviewing, setReviewing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const reduceMotion = useReducedMotion();
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [selectedPurpose, setSelectedPurpose] = useState('');
  const [customPurpose, setCustomPurpose] = useState('');
  const [fabCompact, setFabCompact] = useState(false);
  const fabCompactRef = useRef(false);
  const amountRef = useRef(null);

  useEffect(() => {
    let frame = 0;
    const syncFab = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const compact = window.matchMedia('(max-width: 767px)').matches
          && window.scrollY > (fabCompactRef.current ? 48 : 112);
        if (compact !== fabCompactRef.current) {
          fabCompactRef.current = compact;
          setFabCompact(compact);
        }
      });
    };
    syncFab();
    window.addEventListener('scroll', syncFab, { passive: true });
    window.addEventListener('resize', syncFab, { passive: true });
    return () => {
      window.removeEventListener('scroll', syncFab);
      window.removeEventListener('resize', syncFab);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const query = useQuery({
    queryKey: ['admin-withdrawal-passbook', limit],
    staleTime: 15_000,
    queryFn: async ({ signal }) => {
      const { data, error: loadError } = await supabase.rpc('admin_withdrawal_passbook', { p_limit: limit }).abortSignal(signal);
      if (loadError) throw loadError;
      return data;
    },
  });
  const available = Number(query.data?.available || 0);
  const adminName = user?.app_metadata?.display_name || user?.app_metadata?.web_index || user?.user_metadata?.full_name || user?.email || 'ICMU admin';
  const amount = Number(form.amount);
  const entries = (query.data?.entries || []).filter(entry => filter === 'all' || entry.kind === filter);

  function change(field, value) {
    setForm(current => ({ ...current, [field]: value }));
    setReviewing(false);
    setError('');
  }

  function startWithdrawal() {
    setForm(emptyForm);
    setReceipt(null);
    setReceiptItems([]);
    setReviewing(false);
    setSelectedPurpose('');
    setCustomPurpose('');
    setStep(0);
    setError('');
    setDialogOpen(true);
  }

  function review(event) {
    if (event?.preventDefault) event.preventDefault();
    setError('');
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(\.\d{1,2})?$/.test(form.amount)) {
      setError('Enter a positive amount with up to two decimal places.');
      return false;
    }
    if (amount > available) {
      setError('The amount is greater than the available balance.');
      return false;
    }
    if (form.method === 'bank_transfer' && form.transferred_to.trim().length < 2) {
      setError('Enter who receives this transfer.');
      return false;
    }
    const finalPurpose = form.purpose.trim();
    if (!finalPurpose || finalPurpose.length < 3) {
      setError('Choose a purpose from the dropdown or enter custom text (at least 3 characters).');
      return false;
    }
    const receiptError = validateReceipt(receipt);
    if (receiptError) { setError(receiptError); return false; }
    setReviewing(true);
    return true;
  }

  async function uploadReceipt(withdrawalId, file) {
    const receiptError = validateReceipt(file);
    if (receiptError) throw new Error(receiptError);
    const type = getReceiptType(file);
    const path = `${user.id}/${withdrawalId}/${crypto.randomUUID()}.${type.extension}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { contentType: type.mimeType, upsert: false });
    if (uploadError) throw uploadError;
    const { error: attachError } = await supabase.rpc('admin_attach_withdrawal_receipt', { p_id: withdrawalId, p_path: path });
    if (attachError) {
      await supabase.storage.from(bucket).remove([path]);
      throw attachError;
    }
    await queryClient.invalidateQueries({ queryKey: ['admin-withdrawal-passbook'] });
  }

  async function confirm() {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const { data, error: saveError } = await supabase.rpc('admin_record_withdrawal', {
        p_method: form.method,
        p_amount: amount,
        p_transferred_to: form.method === 'bank_transfer' ? form.transferred_to.trim() : null,
        p_transfer_reference: form.method === 'bank_transfer' ? (form.transfer_reference?.trim() || null) : null,
        p_cash_recipient: form.method === 'cash' ? (form.cash_recipient?.trim() || adminName) : null,
        p_purpose: form.purpose.trim(),
      });
      if (saveError) throw saveError;
      setSuccess({ id: data.withdrawal.id, amount });
      setForm(emptyForm);
      setReviewing(false);
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-withdrawal-passbook'] });
      if (receipt) {
        try {
          await uploadReceipt(data.withdrawal.id, receipt);
          addToast({ type: 'success', message: 'Withdrawal and receipt recorded.' });
        } catch (uploadError) {
          setError(`Withdrawal recorded, but the receipt was not attached: ${uploadError.message}. Add it from the passbook entry.`);
        }
      } else {
        addToast({ type: 'success', message: 'Withdrawal recorded.' });
      }
      setReceipt(null);
      setReceiptItems([]);
    } catch (saveError) {
      setError(saveError.message || 'Could not record the withdrawal. Please try again.');
      await query.refetch();
    } finally {
      setSaving(false);
    }
  }

  async function attachLater(id, file) {
    if (!file) return;
    setUploadingId(id);
    setError('');
    try {
      await uploadReceipt(id, file);
      addToast({ type: 'success', message: 'Receipt attached.' });
    } catch (uploadError) {
      setError(uploadError.message || 'Could not attach the receipt.');
    } finally {
      setUploadingId(null);
    }
  }

  async function openReceipt(path) {
    setError('');
    const { data, error: linkError } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (linkError) { setError(linkError.message); return; }
    const link = document.createElement('a');
    link.href = data.signedUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.append(link);
    link.click();
    link.remove();
  }

  return <div className="wd-page">
    <div className="adm-section-heading wd-heading"><div><div className="adm-eyebrow"><span/> MONEY MOVEMENT</div><h1>Withdrawals</h1><p>Record bank transfers or cash handed out, and follow every credit and debit in one passbook.</p></div><button className="wd-new-button" type="button" onClick={startWithdrawal} disabled={query.isPending || query.isError || available <= 0}><BanknoteArrowUp size={17}/> New withdrawal</button></div>

    {error && <div className="wd-alert" role="alert">{error}</div>}
    {success && <div className="wd-success" role="status"><Check size={18}/><span>LKR {money(success.amount)} was recorded. Its entry is in the passbook below.</span><button type="button" onClick={() => setSuccess(null)} aria-label="Dismiss confirmation">Dismiss</button></div>}

    {/* Mobile FAB — only rendered by CSS on ≤767px. Sits above the bottom nav. */}
    <motion.button
      layout={!reduceMotion}
      transition={reduceMotion ? { duration: 0 } : { layout: { type: 'spring', stiffness: 460, damping: 38 } }}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      type="button"
      className="wd-fab visible sm:hidden"
      onClick={startWithdrawal}
      disabled={query.isPending || query.isError || available <= 0}
      data-hidden={dialogOpen || undefined}
      data-compact={fabCompact || undefined}
      aria-label="New withdrawal"
      title={fabCompact ? 'New withdrawal' : undefined}
    >
      <BanknoteArrowUp size={18}/>
      <AnimatePresence initial={false} mode="popLayout">
        {!fabCompact && <motion.span
          key="new-withdrawal-label"
          initial={reduceMotion ? false : { opacity: 0, transform: 'translateX(6px)' }}
          animate={{ opacity: 1, transform: 'translateX(0)' }}
          exit={{ opacity: 0, transform: 'translateX(4px)' }}
          transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.23, 1, 0.32, 1] }}
          className="wd-fab-label"
        >New withdrawal</motion.span>}
      </AnimatePresence>
    </motion.button>

    {query.isPending ? <div className="wd-loading" role="status"><LoaderCircle size={20} className="wd-spin"/> Loading available balance…</div> : query.isError ? <div className="wd-loading" role="alert"><p>Could not load the passbook. Withdrawals are unavailable until the balance can be checked.</p><button type="button" onClick={() => query.refetch()}>Try again</button></div> : <>
      <section className="wd-balance" aria-label="Available balance">
        <div className="wd-balance-top">
          <span><Wallet size={18}/> Available to withdraw</span>
          <span className="wd-currency">LKR</span>
        </div>
        <strong>{money(available)}</strong>
        <div className="wd-balance-bottom">
          <span>Received <b>LKR {money(query.data.received)}</b></span>
          <span>Withdrawn <b>LKR {money(query.data.withdrawn)}</b></span>
        </div>
      </section>

      <div className="wd-grid">
        <AdminDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="New withdrawal"
          description="Choose payout method, amount, and purpose."
          wide
          busy={saving}
          placement="bottom"
          footerInModal
          className="wd-withdrawal-modal"
          footer={
            <div className="wd-step-footer">
              {step > 0 && (
                <button
                  type="button"
                  className="wd-step-back-btn"
                  onClick={() => { setStep(value => value - 1); setError(''); }}
                  disabled={saving}
                  aria-label="Go back"
                >
                  <ArrowLeft size={18}/>
                  <span className="wd-back-text">Back</span>
                </button>
              )}
              <span className="wd-step-count">{step + 1} / 3</span>
              {step < 2 ? (
                <button
                  type="button"
                  className="wd-primary wd-step-next-btn"
                  onClick={() => {
                    if (step === 1) {
                      const formElement = document.querySelector('.wd-dialog-form');
                      if (formElement?.reportValidity() && review({ preventDefault() {} })) setStep(2);
                    } else setStep(1);
                  }}
                >
                  <span>{step === 0 ? 'Continue' : 'Review'}</span>
                  <ArrowRight size={17}/>
                </button>
              ) : (
                <button
                  type="button"
                  className="wd-primary wd-step-next-btn"
                  onClick={confirm}
                  disabled={saving}
                >
                  <span>{saving ? 'Recording…' : 'Confirm'}</span>
                  <Check size={17}/>
                </button>
              )}
            </div>
          }
        >
          <div className="wd-step-track" aria-label={`Step ${step + 1} of 3`}>
            <span className={step >= 0 ? 'is-active' : ''}/>
            <span className={step >= 1 ? 'is-active' : ''}/>
            <span className={step >= 2 ? 'is-active' : ''}/>
          </div>
          {error && <div className="wd-alert wd-dialog-alert" role="alert">{error}</div>}
          <form
            onSubmit={event => {
              event.preventDefault();
              if (step === 0) setStep(1);
              else if (step === 1 && review(event)) setStep(2);
            }}
            className="wd-form wd-dialog-form"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                className="wd-step-panel"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={reduceMotion ? { duration: 0.14 } : { type: 'spring', stiffness: 460, damping: 30, mass: 0.7 }}
              >
                {step === 0 && (
                  <div className="wd-method-options" role="radiogroup" aria-label="Withdrawal type">
                    <motion.button
                      type="button"
                      role="radio"
                      aria-checked={form.method === 'bank_transfer'}
                      className={`wd-method-option ${form.method === 'bank_transfer' ? 'is-selected' : ''}`}
                      onClick={() => change('method', 'bank_transfer')}
                      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    >
                      <span className="wd-method-icon"><Landmark size={21}/></span>
                      <span>
                        <strong>Bank transfer</strong>
                        <small>Send the money to a bank account</small>
                      </span>
                      <span className="wd-radio-dot"/>
                    </motion.button>
                    <motion.button
                      type="button"
                      role="radio"
                      aria-checked={form.method === 'cash'}
                      className={`wd-method-option ${form.method === 'cash' ? 'is-selected' : ''}`}
                      onClick={() => change('method', 'cash')}
                      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    >
                      <span className="wd-method-icon"><Wallet size={21}/></span>
                      <span>
                        <strong>Cash by hand</strong>
                        <small>Admin takes out cash and hands it over</small>
                      </span>
                      <span className="wd-radio-dot"/>
                    </motion.button>
                  </div>
                )}

                {step === 1 && (
                  <>
                    {form.method === 'bank_transfer' && <div className="wd-payout-section">
                      <div className="wd-payout-heading">
                        <strong>Transfer details</strong>
                        <span>Who receives this payment?</span>
                      </div>
                      <div className="wd-form-two wd-payout-fields">
                        <label className="wd-field wd-payout-recipient" htmlFor="wd-transferred-to">
                          <span>Transferred to</span>
                          <input
                            id="wd-transferred-to"
                            type="text"
                            autoComplete="name"
                            value={form.transferred_to}
                            onChange={event => change('transferred_to', event.target.value)}
                            placeholder="Recipient or account holder"
                            maxLength={150}
                            required
                          />
                        </label>
                        <label className="wd-field" htmlFor="wd-transfer-reference">
                          <span>Transfer reference <small>Optional</small></span>
                          <input
                            id="wd-transfer-reference"
                            type="text"
                            autoComplete="off"
                            value={form.transfer_reference}
                            onChange={event => change('transfer_reference', event.target.value)}
                            placeholder="Add after transferring"
                            maxLength={100}
                          />
                        </label>
                      </div>
                    </div>}
                    {/* Fintech Digits Amount Card */}
                    <div
                      className="wd-amount-card"
                      onClick={() => amountRef.current?.focus()}
                      role="region"
                      aria-label="Amount input"
                    >
                      <div className="wd-amount-card-top">
                        <span>Amount</span>
                        <span className="wd-currency">LKR</span>
                      </div>

                      <div className="wd-amount-display-row">
                        <input
                          ref={amountRef}
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          aria-label="Withdrawal amount in LKR, up to 5 digits and 2 decimal places"
                          placeholder="0.00"
                          value={formatAmountInput(form.amount)}
                          onChange={event => {
                            const input = event.currentTarget;
                            const cursor = input.selectionStart ?? input.value.length;
                            const rawCursor = input.value.slice(0, cursor).replace(/,/g, '').length;
                            const rawValue = input.value.replace(/,/g, '');
                            const cleaned = rawValue.replace(/[^\d.]/g, '');
                            const decimalPoint = cleaned.indexOf('.');
                            const val = decimalPoint < 0
                              ? cleaned
                              : `${cleaned.slice(0, decimalPoint + 1)}${cleaned.slice(decimalPoint + 1).replace(/\./g, '')}`;
                            const [whole = '', fraction] = val.split('.');
                            if (val === '' || (whole.length <= 5 && (fraction === undefined || fraction.length <= 2))) {
                              change('amount', val);
                              const nextCursor = formatAmountInput(val.slice(0, Math.min(rawCursor, val.length))).length;
                              requestAnimationFrame(() => input.setSelectionRange(nextCursor, nextCursor));
                              if (!reduceMotion && amountRef.current) {
                                gsap.killTweensOf(amountRef.current);
                                gsap.fromTo(amountRef.current,
                                  { transform: 'scale(1.018)', opacity: 0.84 },
                                  { transform: 'scale(1)', opacity: 1, duration: 0.15, ease: 'power2.out', overwrite: true },
                                );
                              }
                            }
                          }}
                          required
                          aria-describedby="wd-amount-hint"
                          className="wd-amount-display-input"
                        />
                      </div>

                      <div className="wd-amount-quick-pills">
                        {[500, 1000, 2500].map(val => (
                          <motion.button
                            key={val}
                            type="button"
                            className="wd-quick-pill"
                            aria-label={`Set amount to LKR ${money(val)}`}
                            disabled={val > available}
                            onClick={e => {
                              e.stopPropagation();
                              change('amount', String(val));
                            }}
                            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 520, damping: 26 }}
                          >
                            +{Number(val).toLocaleString('en-LK')}
                          </motion.button>
                        ))}
                      </div>

                      <p id="wd-amount-hint" className="wd-amount-card-balance">
                        Available balance <strong>LKR {money(available)}</strong>
                      </p>
                    </div>

                    {/* Purpose Dropdown Menu + Custom Text Input */}
                    <div className="wd-field wd-purpose-group">
                      <label htmlFor="wd-purpose-select">
                          <span>Purpose</span>
                      </label>
                      <div className="wd-select-wrapper">
                        <select
                          id="wd-purpose-select"
                          className="wd-purpose-select"
                          value={selectedPurpose}
                          onChange={e => {
                            const val = e.target.value;
                            setSelectedPurpose(val);
                            if (val === 'Custom purpose…') {
                              change('purpose', customPurpose);
                            } else {
                              change('purpose', val);
                            }
                          }}
                          required
                        >
                          <option value="" disabled>Choose a purpose…</option>
                          {PURPOSE_PRESETS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>

                      {selectedPurpose === 'Custom purpose…' && (
                        <motion.div
                          initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <input
                            type="text"
                            className="wd-custom-purpose-input"
                            value={customPurpose}
                            onChange={e => {
                              setCustomPurpose(e.target.value);
                              change('purpose', e.target.value);
                            }}
                            placeholder="Describe the withdrawal purpose…"
                            maxLength={300}
                            autoFocus
                            required
                          />
                        </motion.div>
                      )}
                    </div>

                    {/* Receipt Upload */}
                    <FileUpload
                      value={receiptItems}
                      onValueChange={items => setReceiptItems(items.slice(-1).map(item => ({ ...item, status: 'queued', progress: 0 })))}
                      onFilesAdded={(_, files) => {
                        const file = files[0];
                        if (!file) return;
                        const receiptError = validateReceipt(file);
                        if (receiptError) {
                          setReceipt(null);
                          setReceiptItems([]);
                          setError(receiptError);
                          return;
                        }
                        setReceipt(file);
                        setReceiptItems([{
                          id: `${Date.now()}-${file.name}`,
                          name: file.name,
                          size: file.size,
                          type: file.type,
                          status: 'queued',
                          progress: 0,
                          file,
                        }]);
                        setReviewing(false);
                        setError('');
                      }}
                      onRemove={() => { setReceipt(null); setReceiptItems([]); }}
                      accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                      multiple={false}
                      disabled={saving}
                      title={receipt ? 'Replace receipt' : 'Add a receipt'}
                      description={receipt ? 'Optional · Choose a replacement if needed' : 'Optional · PDF or image · Max 10 MB'}
                      browseLabel={receipt ? 'Replace' : 'Browse'}
                      className="wd-file-upload"
                      classNames={{
                        root: 'wd-file-upload-root',
                        dropzone: 'wd-upload-dropzone',
                        queue: 'wd-upload-queue',
                        item: 'wd-upload-item',
                        leading: 'wd-upload-leading',
                        content: 'wd-upload-content',
                        name: 'wd-upload-name',
                        meta: 'wd-upload-meta',
                        progress: 'wd-upload-progress',
                        action: 'wd-upload-action',
                      }}
                    />
                    <p className="wd-auto-note">Your admin name and the date and time are recorded automatically.</p>
                  </>
                )}

                {step === 2 && (
                  <div className="wd-review" role="group" aria-label="Confirm withdrawal">
                    <div>
                      <span>Confirm {form.method === 'cash' ? 'cash by hand' : 'bank transfer'}</span>
                      <strong>LKR {money(amount)}</strong>
                      <small>{form.purpose}</small>
                    </div>
                    <p>This entry cannot be edited or deleted after recording.</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </form>
        </AdminDialog>

        <section className="wd-card wd-passbook" aria-labelledby="wd-passbook-title">
          <div className="wd-card-heading wd-passbook-heading">
            <span className="wd-icon"><Landmark size={20}/></span>
            <div>
              <h2 id="wd-passbook-title">Passbook</h2>
              <p>Latest {Math.min(limit, Number(query.data.total_entries || 0))} of {query.data.total_entries} entries</p>
            </div>
            <button
              type="button"
              className="wd-refresh"
              aria-label="Refresh passbook"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw size={17} className={query.isFetching ? 'wd-spin' : ''}/>
            </button>
          </div>

          <div className="wd-filters" role="group" aria-label="Filter passbook entries">
            {[['all', 'All'], ['credit', 'Money in'], ['debit', 'Withdrawals']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="wd-entry-list">
            {entries.length ? entries.map(entry => entry.kind === 'debit' ? (
              <details className="wd-entry wd-entry-debit" key={entry.id}>
                <summary>
                  <span className="wd-entry-mark"><ArrowUpRight size={18}/></span>
                  <span className="wd-entry-copy">
                    <strong>{entry.purpose}</strong>
                    <small>
                      <span className="wd-entry-type">{entry.method === 'cash' ? 'Cash by hand' : 'Bank transfer'}</span>
                      {' '}· {dateTime(entry.happened_at)}
                    </small>
                  </span>
                  <span className="wd-entry-values">
                    <strong>−{money(entry.amount)}</strong>
                    <small>Bal. {money(entry.balance_after)}</small>
                  </span>
                </summary>
                <div className="wd-entry-detail">
                  {entry.method === 'cash' ? <p>
                    <span>Cash handed to</span>
                    <strong>{nameWithInitials(entry.cash_recipient || entry.actor_name) || entry.cash_recipient || entry.actor_name}</strong>
                  </p> : <>
                    <p><span>Transferred to</span><strong>{entry.transferred_to || 'Not recorded'}</strong></p>
                    {entry.transfer_reference && <p><span>Transfer reference</span><strong>{entry.transfer_reference}</strong></p>}
                  </>}
                  <p>
                    <span>Recorded by</span>
                    <strong>{nameWithInitials(entry.actor_name) || entry.actor_name}</strong>
                  </p>
                  <p>
                    <span>Recorded</span>
                    <strong>{dateTime(entry.happened_at)} · Colombo</strong>
                  </p>
                  <div className="wd-receipt-action">
                    {entry.receipt_path ? (
                      <button type="button" onClick={() => openReceipt(entry.receipt_path)}>
                        <FileText size={16}/> View receipt
                      </button>
                    ) : (
                      <label>
                        <Paperclip size={16}/>
                        {uploadingId === entry.id ? 'Uploading…' : 'Add receipt'}
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                          disabled={uploadingId !== null}
                          onChange={event => {
                            void attachLater(entry.id, event.target.files?.[0]);
                            event.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </details>
            ) : (
              <div className="wd-entry wd-entry-credit" key={entry.id}>
                <span className="wd-entry-mark"><ArrowDownLeft size={18}/></span>
                <span className="wd-entry-copy">
                  <strong>Membership fee</strong>
                  <small>{nameWithInitials(entry.person) || entry.person} · {entry.detail || 'Fee payment'}</small>
                  <small>{dateTime(entry.happened_at)}</small>
                </span>
                <span className="wd-entry-values">
                  <strong>+{money(entry.amount)}</strong>
                  <small>Bal. {money(entry.balance_after)}</small>
                </span>
              </div>
            )) : (
              <div className="wd-empty">
                {filter === 'all'
                  ? 'No payments or withdrawals have been recorded yet.'
                  : `No ${filter === 'credit' ? 'payments' : 'withdrawals'} in these entries.`}
              </div>
            )}
          </div>

          {Number(query.data.total_entries) > limit && limit < 500 && (
            <button
              type="button"
              className="wd-more"
              onClick={() => setLimit(value => Math.min(value + 100, 500))}
            >
              Load earlier entries
            </button>
          )}
          {Number(query.data.total_entries) > 500 && limit >= 500 && (
            <p className="wd-limit-note">
              Showing the latest 500 entries. The totals still include all recorded entries.
            </p>
          )}
        </section>
      </div>
    </>}
  </div>;
}
