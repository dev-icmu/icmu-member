import { useState, useMemo, useEffect } from 'react';
import {
  Sliders,
  Calendar,
  Hash,
  Banknote,
  Copy,
  Check,
  Eye,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Database,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/motion/button/base';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleIndicator,
  CollapsibleTrigger,
} from '@/components/motion/collapsible';
import {
  useAppConfig,
  DEFAULT_ACADEMIC_YEAR,
  DEFAULT_CUTOFF_BATCH,
  DEFAULT_FEE_LKR,
} from '@/entities/members/hooks/useFees';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/context/ToastContext';
import { AdminDialog } from './AdminDialog';
import { AdminLoading } from './AdminMotion';
import '../fees.css';

const KEY_METADATA = {
  ACADEMIC_YEAR: {
    label: 'Active Academic Cycle',
    category: 'cycles',
    icon: Calendar,
    formatValue: (v) => v,
    valueNote: 'March to March cycle',
    description: 'Active academic cycle for membership fee collection (March to March)',
    hint: 'Cycles run March-to-March. Members pay 500 LKR once per cycle.',
    impact: 'Applied across membership fee engine and revenue queries.',
  },
  ACADEMIC_BATCH_YEAR: {
    label: 'Batch Year Fee Cutoff',
    category: 'fees',
    icon: Hash,
    formatValue: (v) => `Batch > ${v}`,
    valueNote: 'Strictly above cutoff year',
    description: 'Cutoff batch year: only batches above this year count towards active fees',
    hint: 'Only member batches strictly above this year (> 2008) are assessed for fees.',
    impact: 'Alumni batches (<= 2008) are excluded from active annual fee obligations.',
  },
  MEMBERSHIP_FEE_LKR: {
    label: 'Annual Membership Fee',
    category: 'fees',
    icon: Banknote,
    formatValue: (v) => `LKR ${Number(v).toLocaleString('en-LK')}`,
    valueNote: 'Standard annual assessment',
    description: 'Standard yearly membership fee in LKR',
    hint: 'Assessed per active student per academic cycle.',
    impact: 'Default expected fee amount registered upon approval and fee tracking.',
  },
};

export function ConfigTab() {
  const { data: config, isLoading, error, refetch, isFetching } = useAppConfig();
  const qc = useQueryClient();
  const { addToast } = useToast();

  const [mobile, setMobile] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(max-width:767px)').matches : false));
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'cycles' | 'fees' | 'schema'
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('default');
  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width:767px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const rawConfigs = useMemo(() => {
    if (config?.raw && config.raw.length > 0) return config.raw;
    return [
      {
        key: 'ACADEMIC_YEAR',
        value: config?.ACADEMIC_YEAR || DEFAULT_ACADEMIC_YEAR,
        description: 'Active academic cycle for membership fee collection (March to March)',
      },
      {
        key: 'ACADEMIC_BATCH_YEAR',
        value: String(config?.ACADEMIC_BATCH_YEAR ?? DEFAULT_CUTOFF_BATCH),
        description: 'Cutoff batch year: only batches above this year count towards active fees',
      },
      {
        key: 'MEMBERSHIP_FEE_LKR',
        value: String(config?.MEMBERSHIP_FEE_LKR ?? DEFAULT_FEE_LKR),
        description: 'Standard yearly membership fee in LKR',
      },
    ];
  }, [config]);

  const filteredConfigs = useMemo(() => {
    let list = rawConfigs;

    if (filterTab === 'cycles') {
      list = list.filter((i) => i.key === 'ACADEMIC_YEAR' || i.key === 'ACADEMIC_BATCH_YEAR');
    } else if (filterTab === 'fees') {
      list = list.filter((i) => i.key === 'MEMBERSHIP_FEE_LKR' || i.key === 'ACADEMIC_BATCH_YEAR');
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => {
        const meta = KEY_METADATA[i.key];
        return (
          i.key.toLowerCase().includes(q) ||
          String(i.value).toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q) ||
          (meta?.label || '').toLowerCase().includes(q)
        );
      });
    }

    if (sort === 'key_asc') {
      list = [...list].sort((a, b) => a.key.localeCompare(b.key));
    } else if (sort === 'key_desc') {
      list = [...list].sort((a, b) => b.key.localeCompare(a.key));
    }

    return list;
  }, [rawConfigs, filterTab, search, sort]);

  const copyValue = async (val, label = 'Value') => {
    try {
      await navigator.clipboard.writeText(String(val));
      addToast({ type: 'success', message: `${label} copied to clipboard.` });
    } catch {
      addToast({ type: 'error', message: 'Could not copy to clipboard.' });
    }
  };

  const copyAllJson = async () => {
    try {
      const payload = {
        ACADEMIC_YEAR: config?.ACADEMIC_YEAR || DEFAULT_ACADEMIC_YEAR,
        ACADEMIC_BATCH_YEAR: config?.ACADEMIC_BATCH_YEAR ?? DEFAULT_CUTOFF_BATCH,
        MEMBERSHIP_FEE_LKR: config?.MEMBERSHIP_FEE_LKR ?? DEFAULT_FEE_LKR,
        source: 'public.config',
        exported_at: new Date().toISOString(),
      };
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      addToast({ type: 'success', message: 'Settings JSON copied to clipboard.' });
    } catch {
      addToast({ type: 'error', message: 'Could not copy JSON.' });
    }
  };

  const copySql = async (key) => {
    try {
      const query = key
        ? `SELECT key, value, description FROM public.config WHERE key = '${key}';`
        : `SELECT * FROM public.config ORDER BY key;`;
      await navigator.clipboard.writeText(query);
      addToast({ type: 'success', message: 'SQL query copied to clipboard.' });
    } catch {
      addToast({ type: 'error', message: 'Could not copy SQL query.' });
    }
  };

  const activeYear = config?.ACADEMIC_YEAR || DEFAULT_ACADEMIC_YEAR;
  const cutoffBatch = config?.ACADEMIC_BATCH_YEAR ?? DEFAULT_CUTOFF_BATCH;
  const feeAmount = config?.MEMBERSHIP_FEE_LKR ?? DEFAULT_FEE_LKR;

  const currentMeta = detailItem ? KEY_METADATA[detailItem.key] || {
    label: detailItem.key,
    icon: Sliders,
    formatValue: (v) => v,
    valueNote: 'Configuration parameter',
    description: detailItem.description,
    hint: 'Database configuration key',
    impact: 'System parameter',
  } : null;

  return (
    <div className="adm-directory">
      {/* 1. Standard Minimal Heading */}
      <div className="adm-section-heading">
        <div>
          <h1>Academic &amp; fee settings</h1>
          <p>Global key-value configuration governing active academic periods, fee structures, and batch eligibility.</p>
        </div>
        <Button type="button" onClick={copyAllJson} aria-label="Copy settings as JSON">
          <Copy size={16} /> Copy settings JSON
        </Button>
      </div>

      {/* 2. Process Pipeline (Identical in style to Applications) */}
      <ol className="adm-process" aria-label="Configuration engine workflow">
        <li>
          <span>1</span> Active cycle: <strong style={{ marginLeft: '4px', color: '#e4f9ec' }}>{activeYear}</strong>
        </li>
        <li>
          <span>2</span> Fee cutoff: <strong style={{ marginLeft: '4px', color: '#e4f9ec' }}>Batch &gt; {cutoffBatch}</strong>
        </li>
        <li>
          <span>3</span> Standard fee: <strong style={{ marginLeft: '4px', color: '#e4f9ec' }}>LKR {Number(feeAmount).toLocaleString('en-LK')}</strong>
        </li>
        <li>
          <span>4</span> Applied to fee engine &amp; queries
        </li>
      </ol>

      {/* 3. Filter Pills (Identical to Batch Filter Pills in Applications) */}
      <nav className="adm-batch-tabs" aria-label="Filter parameters">
        <button
          type="button"
          aria-pressed={filterTab === 'all'}
          onClick={() => setFilterTab('all')}
        >
          All parameters
        </button>
        <button
          type="button"
          aria-pressed={filterTab === 'cycles'}
          onClick={() => setFilterTab('cycles')}
        >
          Academic cycles
        </button>
        <button
          type="button"
          aria-pressed={filterTab === 'fees'}
          onClick={() => setFilterTab('fees')}
        >
          Fees &amp; revenue
        </button>
        <button
          type="button"
          aria-pressed={filterTab === 'schema'}
          onClick={() => setFilterTab('schema')}
        >
          Table: public.config
        </button>
      </nav>

      {/* 4. Unified Content Panel */}
      <section className="adm-panel">
        {filterTab === 'schema' ? (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#e4f9ec', fontWeight: 600 }}>Database Table Schema: public.config</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7f9a8a' }}>
                  PostgreSQL key-value table protected with Row-Level Security (RLS).
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={() => copySql()}>
                <Database size={15} /> Copy SELECT query
              </Button>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #1a3022', background: '#070f09' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #162a1d', color: '#7d9686', background: '#0a170f' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Column</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Constraints</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #102015' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#5ce38e', fontWeight: 700 }}>key</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#a7bcae' }}>varchar(100)</td>
                    <td style={{ padding: '10px 14px', color: '#fcd34d' }}>PRIMARY KEY</td>
                    <td style={{ padding: '10px 14px', color: '#8fa497' }}>Unique parameter identifier</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #102015' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#5ce38e', fontWeight: 700 }}>value</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#a7bcae' }}>text</td>
                    <td style={{ padding: '10px 14px', color: '#fcd34d' }}>NOT NULL</td>
                    <td style={{ padding: '10px 14px', color: '#8fa497' }}>System parameter string value</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #102015' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#5ce38e', fontWeight: 700 }}>description</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#a7bcae' }}>text</td>
                    <td style={{ padding: '10px 14px', color: '#6f8b79' }}>NULLABLE</td>
                    <td style={{ padding: '10px 14px', color: '#8fa497' }}>Human-readable purpose note</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#5ce38e', fontWeight: 700 }}>updated_at</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#a7bcae' }}>timestamptz</td>
                    <td style={{ padding: '10px 14px', color: '#6f8b79' }}>DEFAULT now()</td>
                    <td style={{ padding: '10px 14px', color: '#8fa497' }}>Automatic timestamp update</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7fa28c', fontSize: '12px' }}>
              <ShieldCheck size={16} style={{ color: '#5ce38e', flexShrink: 0 }} />
              <span>
                Row-Level Security enforces read-only access for authenticated administrators via <code>private.is_admin()</code>.
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="adm-toolbar">
              <div className="adm-search-area">
                <div className="adm-search">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search parameters or keys..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search parameters"
                  />
                  {search && (
                    <button
                      type="button"
                      className="adm-clear-search"
                      onClick={() => setSearch('')}
                      aria-label="Clear search"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="adm-filters">
                <SlidersHorizontal size={16} />
                <select
                  aria-label="Filter parameter category"
                  value={filterTab}
                  onChange={(e) => setFilterTab(e.target.value)}
                >
                  <option value="all">All parameters</option>
                  <option value="cycles">Academic cycles</option>
                  <option value="fees">Fees &amp; revenue</option>
                </select>

                <select
                  aria-label="Sort parameters"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="default">Default order</option>
                  <option value="key_asc">Key (A to Z)</option>
                  <option value="key_desc">Key (Z to A)</option>
                </select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="adm-directory-options"
                      aria-label="Configuration options"
                    >
                      <MoreHorizontal size={19} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="adm-member-menu">
                    <DropdownMenuItem onSelect={copyAllJson}>
                      <Copy /> Copy all as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => copySql()}>
                      <Database /> Copy SQL SELECT query
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => refetch()}>
                      <RefreshCw className={isFetching ? 'adm-spin' : ''} /> Refresh database parameters
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Table Summary Count */}
            <div className="adm-table-summary">
              <span>{filteredConfigs.length} parameter{filteredConfigs.length === 1 ? '' : 's'}</span>
              <span>Table: public.config · Read-only</span>
            </div>

            {/* Body */}
            {isLoading ? (
              <div className="adm-state" role="status">
                <AdminLoading>Loading system configuration...</AdminLoading>
              </div>
            ) : error ? (
              <div className="adm-state" role="alert">
                <h3>Failed to load configuration</h3>
                <p>{error.message}</p>
                <Button type="button" onClick={() => refetch()}>Try again</Button>
              </div>
            ) : filteredConfigs.length === 0 ? (
              <div className="adm-state">
                <h3>No parameters found</h3>
                <p>No configuration keys match your current filter or search criteria.</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setFilterTab('all');
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : mobile ? (
              /* Mobile Collapsible Cards */
              <div className="adm-mobile-members">
                {filteredConfigs.map((item) => {
                  const meta = KEY_METADATA[item.key] || {
                    label: item.key,
                    icon: Sliders,
                    formatValue: (v) => v,
                    valueNote: 'Configuration parameter',
                    description: item.description,
                    hint: 'Database configuration key',
                    impact: 'System parameter',
                  };
                  const Icon = meta.icon;

                  return (
                    <div className="adm-mobile-member" key={item.key}>
                      <Collapsible className="adm-member-collapse">
                        <CollapsibleTrigger className="adm-member-collapse-trigger">
                          <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span
                              className="adm-avatar"
                              style={{
                                width: '32px',
                                height: '32px',
                                background: '#122619',
                                borderColor: '#234830',
                                color: '#5ce38e',
                                borderRadius: '10px',
                              }}
                            >
                              <Icon size={16} />
                            </span>
                            <span>
                              <strong>{meta.label}</strong>
                              <small style={{ fontFamily: 'monospace' }}>
                                {item.key} · {meta.formatValue(item.value)}
                              </small>
                            </span>
                          </span>
                          <CollapsibleIndicator />
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="adm-mobile-member-body">
                            <span className="adm-status adm-status-active">
                              <i /> Active
                            </span>
                            <dl>
                              <div>
                                <dt>Parameter key</dt>
                                <dd style={{ fontFamily: 'monospace' }}>{item.key}</dd>
                              </div>
                              <div>
                                <dt>Current value</dt>
                                <dd style={{ fontFamily: 'monospace', color: '#5ce38e', fontWeight: 600 }}>
                                  {meta.formatValue(item.value)}
                                </dd>
                              </div>
                              <div>
                                <dt>Engine rule</dt>
                                <dd>{item.description || meta.hint}</dd>
                              </div>
                              <div>
                                <dt>Scope impact</dt>
                                <dd>{meta.impact}</dd>
                              </div>
                              <div>
                                <dt>Storage</dt>
                                <dd>public.config (Row-Level Security)</dd>
                              </div>
                            </dl>

                            <div className="adm-mobile-row-actions">
                              <Button
                                type="button"
                                variant="secondary"
                                className="adm-mobile-details-btn"
                                onClick={() => setDetailItem(item)}
                              >
                                <Eye size={16} /> Details
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="adm-mobile-icon-btn"
                                aria-label={`Copy value for ${item.key}`}
                                onClick={() => copyValue(item.value, meta.label)}
                              >
                                <Copy size={16} />
                              </Button>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Desktop Data Table */
              <div className="adm-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '280px' }}>Parameter</th>
                      <th>Configuration &amp; Rule</th>
                      <th style={{ width: '160px' }}>Current Value</th>
                      <th style={{ width: '110px' }}>Status</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConfigs.map((item) => {
                      const meta = KEY_METADATA[item.key] || {
                        label: item.key,
                        icon: Sliders,
                        formatValue: (v) => v,
                        valueNote: 'Configuration parameter',
                        description: item.description,
                        hint: 'Database configuration key',
                        impact: 'System parameter',
                      };
                      const Icon = meta.icon;

                      return (
                        <tr key={item.key}>
                          <td>
                            <button
                              type="button"
                              className="adm-person"
                              onClick={() => setDetailItem(item)}
                              style={{ width: '100%', textAlign: 'left' }}
                            >
                              <span
                                className="adm-avatar"
                                style={{
                                  background: '#122619',
                                  borderColor: '#234830',
                                  color: '#5ce38e',
                                  borderRadius: '10px',
                                }}
                              >
                                <Icon size={16} />
                              </span>
                              <span>
                                <strong>{meta.label}</strong>
                                <small style={{ fontFamily: 'monospace', color: '#7fa28c' }}>
                                  {item.key}
                                </small>
                              </span>
                            </button>
                          </td>

                          <td>
                            <div className="adm-form-cell">
                              <strong>{item.description || meta.hint}</strong>
                              <small>{meta.impact}</small>
                            </div>
                          </td>

                          <td>
                            <div>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: '#e4f9ec',
                                }}
                              >
                                {meta.formatValue(item.value)}
                              </span>
                              <small
                                style={{
                                  display: 'block',
                                  fontSize: '10px',
                                  color: '#7fa28c',
                                  marginTop: '2px',
                                }}
                              >
                                {meta.valueNote}
                              </small>
                            </div>
                          </td>

                          <td>
                            <span className="adm-status adm-status-active">
                              <i /> Active
                            </span>
                          </td>

                          <td>
                            <div className="adm-row-actions">
                              <div className="adm-quick-actions">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="adm-quick-action"
                                  aria-label={`Copy value for ${item.key}`}
                                  title="Copy value"
                                  onClick={() => copyValue(item.value, meta.label)}
                                >
                                  <Copy size={16} />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="adm-quick-action"
                                  aria-label={`Inspect ${meta.label}`}
                                  title="Inspect parameter"
                                  onClick={() => setDetailItem(item)}
                                >
                                  <Eye size={17} />
                                </Button>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="adm-more-btn"
                                    aria-label={`More options for ${item.key}`}
                                  >
                                    <MoreHorizontal size={19} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="adm-member-menu">
                                  <DropdownMenuItem onSelect={() => setDetailItem(item)}>
                                    <Eye /> View parameter details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => copyValue(item.value, meta.label)}>
                                    <Copy /> Copy current value
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => copyValue(item.key, 'Key name')}>
                                    <Sliders /> Copy key name
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onSelect={() => copySql(item.key)}>
                                    <Database /> Copy SQL SELECT query
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* 5. Detail Modal / Drawer */}
      {detailItem && currentMeta && (
        <AdminDialog
          open
          onClose={() => setDetailItem(null)}
          title={`Parameter: ${detailItem.key}`}
          description={currentMeta.label}
          drawer
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setDetailItem(null)}>
                Close
              </Button>
              <Button type="button" onClick={() => copyValue(detailItem.value, currentMeta.label)}>
                <Copy size={15} /> Copy value
              </Button>
            </>
          }
        >
          <div className="adm-profile-head">
            <span
              className="adm-avatar adm-avatar-large"
              style={{
                background: '#122619',
                borderColor: '#234830',
                color: '#5ce38e',
                borderRadius: '16px',
              }}
            >
              {(() => {
                const IconComponent = currentMeta.icon;
                return <IconComponent size={24} />;
              })()}
            </span>
            <div>
              <h3>{currentMeta.label}</h3>
              <p style={{ fontFamily: 'monospace' }}>
                {detailItem.key} · <span className="adm-status adm-status-active"><i /> Active</span>
              </p>
            </div>
          </div>

          <section className="adm-profile-section" aria-label="Parameter value display">
            <h3>Configuration value</h3>
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid #1f3727',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginTop: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#e4f9ec', fontFamily: 'monospace' }}>
                  {currentMeta.formatValue(detailItem.value)}
                </div>
                <small style={{ color: '#7fa28c', fontSize: '11px', display: 'block', marginTop: '3px' }}>
                  Raw stored value: "{detailItem.value}"
                </small>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => copyValue(detailItem.value, currentMeta.label)}
              >
                <Copy size={14} /> Copy
              </Button>
            </div>
          </section>

          <dl className="adm-details">
            <div>
              <dt>Database table</dt>
              <dd>public.config</dd>
            </div>
            <div>
              <dt>Key identifier</dt>
              <dd style={{ fontFamily: 'monospace' }}>{detailItem.key}</dd>
            </div>
            <div>
              <dt>Access policy</dt>
              <dd>Read-only via private.is_admin()</dd>
            </div>
            <div>
              <dt>Rule explanation</dt>
              <dd>{detailItem.description || currentMeta.hint}</dd>
            </div>
            <div>
              <dt>Engine impact</dt>
              <dd>{currentMeta.impact}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{detailItem.updated_at ? new Date(detailItem.updated_at).toLocaleString() : 'System default'}</dd>
            </div>
          </dl>
        </AdminDialog>
      )}
    </div>
  );
}

export default ConfigTab;

