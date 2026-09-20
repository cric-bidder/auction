import React, { useState, useRef } from 'react';
import { parsePlayersExcel, downloadPlayerImportTemplate, importPlayersBatch } from '../services/playerExcelService';

const ImportPlayersModal = ({ auction, existingPlayers = [], isOpen, onClose, onSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  
  // Parsed data state
  const [parsedData, setParsedData] = useState(null);
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'valid', 'invalid'
  
  // Import process state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percent: 0, statusText: '' });
  const [importResult, setImportResult] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen || !auction) return null;

  const handleReset = () => {
    setSelectedFile(null);
    setParsedData(null);
    setParseError('');
    setImporting(false);
    setImportProgress({ current: 0, total: 0, percent: 0, statusText: '' });
    setImportResult(null);
    setFilterTab('all');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (importing) return; // Prevent closing while import is actively writing to DB
    handleReset();
    onClose();
  };

  const handleFile = async (file) => {
    if (!file) return;
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExt)) {
      setParseError('Please upload a valid Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    try {
      setSelectedFile(file);
      setParsing(true);
      setParseError('');
      const result = await parsePlayersExcel(file, existingPlayers);
      setParsedData(result);
    } catch (err) {
      console.error("Excel parse error:", err);
      setParseError(err.message || 'Failed to read the Excel file.');
      setSelectedFile(null);
      setParsedData(null);
    } finally {
      setParsing(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleStartImport = async () => {
    if (!parsedData || parsedData.validRowsCount === 0) return;

    const validRows = parsedData.rows.filter(r => r.isValid);
    setImporting(true);
    setParseError('');

    try {
      const result = await importPlayersBatch(auction.id, validRows, (progress) => {
        setImportProgress(progress);
      });

      setImportResult(result);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      console.error("Batch import error:", err);
      setParseError(err.message || 'Import failed unexpectedly.');
    } finally {
      setImporting(false);
    }
  };

  // Filter rows for preview
  const displayedRows = (parsedData?.rows || []).filter(r => {
    if (filterTab === 'valid') return r.isValid;
    if (filterTab === 'invalid') return !r.isValid;
    return true;
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !importing) handleClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: parsedData ? '980px' : '650px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0e1626',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 25px rgba(212, 175, 55, 0.2)',
          borderRadius: '16px',
          overflow: 'hidden',
          transition: 'max-width 0.3s ease'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.1) 0%, rgba(15, 23, 42, 0.4) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span style={{ fontSize: '1.8rem' }}>📥</span>
            <div>
              <h3 style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '1.25rem', fontWeight: 700 }}>
                Import Players from Excel / CSV
              </h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Active Tournament: <strong style={{ color: '#fff' }}>{auction.auction_name}</strong>
              </p>
            </div>
          </div>
          {!importing && (
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '1.2rem',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>
          
          {/* Error Banner */}
          {parseError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '0.85rem 1.2rem',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span>⚠️</span>
              <span>{parseError}</span>
            </div>
          )}

          {/* STATE 1: COMPLETE RESULT */}
          {importResult ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
              <h3 style={{ color: 'var(--accent-green)', fontSize: '1.6rem', margin: '0 0 0.5rem 0' }}>
                Import Completed Successfully!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '1.5rem' }}>
                Successfully added <strong style={{ color: '#fff' }}>{importResult.successCount}</strong> player(s) to <strong>{auction.auction_name}</strong>.
              </p>

              {importResult.failedCount > 0 && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'left',
                    marginBottom: '1.5rem',
                    maxHeight: '150px',
                    overflowY: 'auto'
                  }}
                >
                  <strong style={{ color: '#ef4444', fontSize: '0.9rem' }}>
                    {importResult.failedCount} record(s) failed during insertion:
                  </strong>
                  <ul style={{ margin: '0.5rem 0 0 1.2rem', color: '#fca5a5', fontSize: '0.85rem' }}>
                    {importResult.errors.map((err, idx) => (
                      <li key={idx}>Row {err.rowNumber} ({err.playerName}): {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={handleReset}
                  className="btn btn-outline"
                  style={{ padding: '0.6rem 1.5rem' }}
                >
                  📥 Import More
                </button>
                <button
                  onClick={handleClose}
                  className="btn btn-primary"
                  style={{ padding: '0.6rem 2rem', background: 'var(--accent-gold)' }}
                >
                  ✓ Done & View Players
                </button>
              </div>
            </div>
          ) : importing ? (
            /* STATE 2: IMPORTING PROGRESS */
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  border: '4px solid rgba(212, 175, 55, 0.2)',
                  borderTopColor: 'var(--accent-gold)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1.5rem'
                }}
              />
              <h4 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                Importing Players into Database...
              </h4>
              <p style={{ color: 'var(--accent-gold)', fontSize: '0.95rem', minHeight: '24px', marginBottom: '1.5rem' }}>
                {importProgress.statusText || 'Preparing batch import...'}
              </p>

              {/* Progress bar */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '500px',
                  height: '10px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '5px',
                  overflow: 'hidden',
                  margin: '0 auto 0.75rem'
                }}
              >
                <div
                  style={{
                    width: `${importProgress.percent}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #d4af37, #10b981)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {importProgress.percent}% Completed ({importProgress.current} / {importProgress.total})
              </span>
            </div>
          ) : !parsedData ? (
            /* STATE 3: UPLOAD FILE & TEMPLATE */
            <div>
              {/* Drag & Drop Upload Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragActive ? 'var(--accent-gold)' : 'rgba(212, 175, 55, 0.35)'}`,
                  background: dragActive ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '12px',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '1.5rem'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => handleFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>📄</div>
                <h4 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 0.4rem 0' }}>
                  {parsing ? 'Reading spreadsheet...' : 'Drag and drop your Excel / CSV file here'}
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
                  Supports .xlsx, .xls, and .csv files
                </p>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem', pointerEvents: 'none' }}
                >
                  Browse Computer
                </button>
              </div>

              {/* Template Download & Info Box */}
              <div
                style={{
                  background: 'rgba(212, 175, 55, 0.06)',
                  border: '1px solid rgba(212, 175, 55, 0.2)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <h5 style={{ margin: '0 0 0.25rem 0', color: 'var(--accent-gold)', fontSize: '0.95rem' }}>
                    Need the formatted Excel format?
                  </h5>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.4 }}>
                    Download our pre-structured template with sample records for easy copy-pasting.
                  </p>
                </div>
                <button
                  onClick={downloadPlayerImportTemplate}
                  className="btn"
                  style={{
                    background: 'rgba(212, 175, 55, 0.15)',
                    border: '1px solid var(--accent-gold)',
                    color: 'var(--accent-gold)',
                    padding: '0.5rem 1.2rem',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer'
                  }}
                >
                  <span>⬇️</span>
                  <span>Download Sample Template</span>
                </button>
              </div>

              {/* Guide notes */}
              <div style={{ marginTop: '1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                <strong style={{ color: '#fff' }}>Supported Column Headers:</strong> Name (or First Name, Last Name), Mobile, Gender, Player Role (Batter, Bowler, All Rounder, Wicket Keeper), Batting Style, Bowling Style, T-Shirt Size, Area, DOB, Email.
              </div>
            </div>
          ) : (
            /* STATE 4: PREVIEW & VALIDATION TABLE */
            <div>
              {/* Summary and Filter Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setFilterTab('all')}
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.82rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: filterTab === 'all' ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.1)',
                      background: filterTab === 'all' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.05)',
                      color: filterTab === 'all' ? 'var(--accent-gold)' : '#fff'
                    }}
                  >
                    All Records ({parsedData.totalRows})
                  </button>
                  <button
                    onClick={() => setFilterTab('valid')}
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.82rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: filterTab === 'valid' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                      background: filterTab === 'valid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                      color: filterTab === 'valid' ? '#10b981' : '#fff'
                    }}
                  >
                    🟢 Ready to Import ({parsedData.validRowsCount})
                  </button>
                  {parsedData.invalidRowsCount > 0 && (
                    <button
                      onClick={() => setFilterTab('invalid')}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.82rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: filterTab === 'invalid' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                        background: filterTab === 'invalid' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                        color: filterTab === 'invalid' ? '#ef4444' : '#fff'
                      }}
                    >
                      🔴 Issues / Duplicates ({parsedData.invalidRowsCount})
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    File: <strong style={{ color: '#fff' }}>{selectedFile?.name}</strong>
                  </span>
                  <button
                    onClick={handleReset}
                    className="btn btn-outline"
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div
                style={{
                  maxHeight: '380px',
                  overflowY: 'auto',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.3)'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#131b2e', zIndex: 2 }}>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem 0.6rem', width: '45px' }}>#</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Player Name</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Mobile</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Gender</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Role</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Batting</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Bowling</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>T-Shirt</th>
                      <th style={{ padding: '0.75rem 0.6rem' }}>Status / Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No records in this category.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: row.isValid ? 'transparent' : 'rgba(239, 68, 68, 0.08)'
                          }}
                        >
                          <td style={{ padding: '0.6rem', color: 'var(--text-muted)' }}>{row.rowNumber}</td>
                          <td style={{ padding: '0.6rem', fontWeight: 600, color: '#fff' }}>
                            {row.data.first_name} {row.data.last_name}
                            {row.data.is_captain && <span style={{ marginLeft: '4px', fontSize: '0.7rem', color: 'var(--accent-gold)' }}>[C]</span>}
                            {row.data.is_icon && <span style={{ marginLeft: '4px', fontSize: '0.7rem', color: '#60a5fa' }}>[Icon]</span>}
                            {row.data.is_owner && <span style={{ marginLeft: '4px', fontSize: '0.7rem', color: '#a855f7' }}>[Owner]</span>}
                          </td>
                          <td style={{ padding: '0.6rem', color: row.data.mobile ? '#cbd5e1' : '#ef4444' }}>
                            {row.data.mobile || '(Missing)'}
                          </td>
                          <td style={{ padding: '0.6rem' }}>
                            <span style={{ color: row.data.gender === 'Female' ? '#f472b6' : '#60a5fa' }}>
                              {row.data.gender}
                            </span>
                          </td>
                          <td style={{ padding: '0.6rem', color: 'var(--accent-gold)' }}>{row.data.player_role}</td>
                          <td style={{ padding: '0.6rem', color: '#cbd5e1' }}>{row.data.batting_style}</td>
                          <td style={{ padding: '0.6rem', color: '#cbd5e1' }}>{row.data.bowling_style}</td>
                          <td style={{ padding: '0.6rem', color: '#cbd5e1' }}>
                            {row.data.tshirt_size || '-'}
                          </td>
                          <td style={{ padding: '0.6rem' }}>
                            {row.isValid ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#34d399',
                                  border: '1px solid rgba(16, 185, 129, 0.3)'
                                }}
                              >
                                ✓ Valid
                              </span>
                            ) : (
                              <span
                                title={row.errors.join(', ')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  color: '#f87171',
                                  border: '1px solid rgba(239, 68, 68, 0.4)'
                                }}
                              >
                                ✕ {row.errors[0]}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Duplicate / Invalid Notice */}
              {parsedData.invalidRowsCount > 0 && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#fca5a5' }}>
                  ℹ️ {parsedData.invalidRowsCount} row(s) with validation issues or duplicate mobile numbers will automatically be skipped during import.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        {parsedData && !importResult && !importing && (
          <div
            style={{
              padding: '1.25rem 1.75rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Ready to import: <strong style={{ color: 'var(--accent-green)' }}>{parsedData.validRowsCount}</strong> of <strong>{parsedData.totalRows}</strong> players
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-outline"
                style={{ padding: '0.55rem 1.25rem', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartImport}
                disabled={parsedData.validRowsCount === 0}
                className="btn btn-primary"
                style={{
                  padding: '0.55rem 1.5rem',
                  fontSize: '0.9rem',
                  background: 'var(--accent-gold)',
                  opacity: parsedData.validRowsCount === 0 ? 0.5 : 1,
                  cursor: parsedData.validRowsCount === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                🚀 Import {parsedData.validRowsCount} Valid Player{parsedData.validRowsCount === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ImportPlayersModal;
