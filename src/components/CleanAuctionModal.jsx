import React, { useState } from 'react';
import { purgeAuctionData } from '../services/auctionCleanup';

const REQUIRED_CLEAN_PASSWORD = 'Clean@5454';

const CleanAuctionModal = ({ auction, isOpen, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !auction) return null;

  const handleClose = () => {
    if (loading) return; // Prevent closing while purge is running
    setPassword('');
    setIsConfirmed(false);
    setStatusMessage('');
    setProgressPercent(0);
    setErrorMsg('');
    setSuccess(false);
    onClose();
  };

  const handlePurge = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isConfirmed) {
      setErrorMsg('Please confirm by checking the acknowledgement box below.');
      return;
    }

    if (password !== REQUIRED_CLEAN_PASSWORD) {
      setErrorMsg('Incorrect cleanup password. Access denied.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const result = await purgeAuctionData(auction.id, (status, pct) => {
        setStatusMessage(status);
        setProgressPercent(pct);
      });

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess(result);
        handleClose();
      }, 1500);
    } catch (err) {
      console.error("Purge Error:", err);
      setErrorMsg(err.message || 'An error occurred during data cleanup.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) handleClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '2rem',
          background: 'linear-gradient(135deg, rgba(30, 10, 15, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '2px solid rgba(239, 68, 68, 0.5)',
          boxShadow: '0 0 40px rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          color: '#fff',
          animation: 'modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem'
            }}
          >
            ⚠️
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#ef4444', fontSize: '1.4rem', letterSpacing: '1px' }}>
              Clean Up Auction Data
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Irreversible permanent purge & media deletion
            </p>
          </div>
        </div>

        {/* Selected Auction Box */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.2rem'
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Target Tournament To Erase
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-gold)', marginTop: '0.2rem' }}>
            {auction.auction_name} <span style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 'normal' }}>({auction.auction_code})</span>
          </div>
        </div>

        {/* Breakdown Warning */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.88rem',
            lineHeight: 1.5
          }}
        >
          <div style={{ fontWeight: 'bold', color: '#fca5a5', marginBottom: '0.4rem' }}>
            The following data will be permanently deleted:
          </div>
          <ul style={{ paddingLeft: '1.2rem', margin: 0, color: '#f87171' }}>
            <li>All registered & approved players in this tournament</li>
            <li>All player profile photos & Aadhar cards from <strong>Cloudinary</strong></li>
            <li>All teams, rosters, budgets, and team logos</li>
            <li>All team owners, sponsors, banners, and invitation links</li>
            <li>Tournament logo and payment QR codes from <strong>Cloudinary</strong></li>
            <li>Tournament record & entire auction database entry</li>
          </ul>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            ❌ {errorMsg}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            style={{
              background: 'rgba(57, 255, 20, 0.2)',
              border: '1px solid var(--accent-green)',
              color: 'var(--accent-green)',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              textAlign: 'center'
            }}
          >
            ✅ All selected auction data & Cloudinary images deleted successfully!
          </div>
        )}

        {/* Progress Bar (during deletion) */}
        {loading && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--accent-gold)' }}>
              <span>{statusMessage || 'Cleaning up data...'}</span>
              <span>{progressPercent}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ef4444, var(--accent-gold))',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        )}

        {!loading && !success && (
          <form onSubmit={handlePurge}>
            {/* Step 1: Confirmation Checkbox */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                marginBottom: '1.2rem',
                cursor: 'pointer'
              }}
              onClick={() => setIsConfirmed(!isConfirmed)}
            >
              <input
                type="checkbox"
                id="confirmCleanupCheck"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                style={{
                  marginTop: '0.2rem',
                  width: '18px',
                  height: '18px',
                  accentColor: '#ef4444',
                  cursor: 'pointer'
                }}
              />
              <label
                htmlFor="confirmCleanupCheck"
                style={{
                  fontSize: '0.88rem',
                  color: isConfirmed ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                I confirm that I want to permanently delete all data & Cloudinary images for <strong>{auction.auction_name}</strong>. This action cannot be undone.
              </label>
            </div>

            {/* Step 2: Password Input */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
                Enter Cleanup Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to confirm"
                className="form-input"
                required
                style={{
                  border: '1px solid rgba(239, 68, 68, 0.6)',
                  background: 'rgba(0, 0, 0, 0.5)',
                  fontSize: '1rem',
                  color: '#fff'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-outline"
                style={{ padding: '0.7rem 1.5rem', fontSize: '0.95rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isConfirmed || !password}
                className="btn"
                style={{
                  padding: '0.7rem 1.5rem',
                  fontSize: '0.95rem',
                  background: isConfirmed && password ? '#ef4444' : 'rgba(239, 68, 68, 0.3)',
                  color: '#fff',
                  cursor: isConfirmed && password ? 'pointer' : 'not-allowed',
                  boxShadow: isConfirmed && password ? '0 0 15px rgba(239, 68, 68, 0.4)' : 'none'
                }}
              >
                Permanently Delete All Data
              </button>
            </div>
          </form>
        )}

        <style>{`
          @keyframes modalPop {
            0% { transform: scale(0.92); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default CleanAuctionModal;
