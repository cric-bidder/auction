import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import CleanAuctionModal from '../components/CleanAuctionModal';

const AdminPage = () => {
  const [auctions, setAuctions] = useState([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [cleanSuccessNotice, setCleanSuccessNotice] = useState('');

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAuctions(data || []);
      
      // Initial selected code
      const saved = localStorage.getItem('cap_admin_selected_auction_code');
      if (saved && data && data.some(a => a.auction_code === saved)) {
        setSelectedCode(saved);
      } else if (data && data.length > 0) {
        setSelectedCode(data[0].auction_code);
        localStorage.setItem('cap_admin_selected_auction_code', data[0].auction_code);
      } else {
        setSelectedCode('');
        localStorage.removeItem('cap_admin_selected_auction_code');
      }
    } catch (err) {
      console.error("Error fetching auctions for admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, []);

  const handleSelectAuction = (code) => {
    setSelectedCode(code);
    localStorage.setItem('cap_admin_selected_auction_code', code);
  };

  const handleLogout = () => {
    localStorage.removeItem('cap_admin_auth');
    localStorage.removeItem('cap_admin_selected_auction_code');
    window.location.reload();
  };

  const handleCleanupSuccess = (result) => {
    setCleanSuccessNotice(`Tournament and all ${result.deletedMediaCount || 0} associated Cloudinary assets successfully purged!`);
    setTimeout(() => setCleanSuccessNotice(''), 6000);
    fetchAuctions();
  };

  const activeAuction = auctions.find(a => a.auction_code === selectedCode);
  const codeParam = selectedCode ? `?code=${selectedCode}` : '';

  return (
    <div className="flex-col min-h-screen">
      <div className="spotlight"></div>
      <PageHeader title="Admin Command Center" subtitle="Master Control Dashboard" showLogos={false} />
      
      <main className="container" style={{ padding: '2rem 1rem 4rem', zIndex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {cleanSuccessNotice && (
          <div style={{ background: 'rgba(57, 255, 20, 0.15)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', padding: '1rem 2rem', borderRadius: '8px', marginBottom: '2rem', width: '100%', maxWidth: '1000px', fontWeight: 'bold', textAlign: 'center' }}>
            ✅ {cleanSuccessNotice}
          </div>
        )}

        {/* Active Auction Selector Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem 2rem', width: '100%', maxWidth: '1000px', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', border: '1px solid rgba(255,215,0,0.2)' }}>
          <div>
            <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Active Management Scope</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Select which tournament dashboard you want to manage.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {loading ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading Auctions...</span>
            ) : auctions.length === 0 ? (
              <span style={{ color: '#ff4444', fontSize: '0.9rem', fontWeight: 'bold' }}>No Tournaments Found! Create one first.</span>
            ) : (
              <>
                <select
                  value={selectedCode}
                  onChange={(e) => handleSelectAuction(e.target.value)}
                  style={{
                    padding: '0.6rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    color: 'var(--accent-gold)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '2px solid var(--accent-gold)',
                    borderRadius: '6px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {auctions.map(a => (
                    <option key={a.id} value={a.auction_code} style={{ background: '#0a0f1d', color: '#fff' }}>
                      {a.auction_name} ({a.auction_code})
                    </option>
                  ))}
                </select>

                {activeAuction && (
                  <button
                    onClick={() => setShowCleanModal(true)}
                    className="btn"
                    title="Clean up and permanently delete all data for this selected tournament"
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      color: '#ef4444',
                      padding: '0.55rem 1.2rem',
                      fontSize: '0.85rem',
                      borderRadius: '6px'
                    }}
                  >
                    🗑️ Clean Up Data
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', width: '100%', maxWidth: '1000px', marginBottom: '4rem' }}>
          
          <Link to={`/auction${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>🏆</div>
            <h3 style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.5rem' }}>Manage Auctions</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Create, edit, delete, and configure backend tournament properties.</p>
          </Link>

          <Link to={`/auction-teams${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>🛡️</div>
            <h3 style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.5rem' }}>Auction Teams</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Manage teams and assign Icon players.</p>
          </Link>

          <Link to={`/admin-owners${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px solid var(--accent-gold)' }}>
            <div style={{ fontSize: '3.5rem' }}>👑</div>
            <h3 style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.5rem' }}>Manage Owners</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Create owners, pre-fill player data, & assign multi-team owners.</p>
          </Link>

          <Link to={`/admin-players${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>👥</div>
            <h3 style={{ color: 'var(--accent-green)', margin: 0, fontSize: '1.5rem' }}>Player Approvals</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Approve, reject, or delete submitted registration profiles.</p>
          </Link>

          <Link to={`/admin-invitations${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px solid rgba(57,255,20,0.2)' }}>
            <div style={{ fontSize: '3.5rem' }}>✉️</div>
            <h3 style={{ color: 'var(--accent-green)', margin: 0, fontSize: '1.5rem' }}>Invitation Hub</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Generate secure player registration invitation links.</p>
          </Link>

          <Link to={`/admin-sponsors${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px solid rgba(255,215,0,0.2)' }}>
            <div style={{ fontSize: '3.5rem' }}>🤝</div>
            <h3 style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.5rem' }}>Manage Sponsors</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Configure tournament sponsors, sequence, logo uploads, and status.</p>
          </Link>

          <Link to={`/players${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>📋</div>
            <h3 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.5rem' }}>Public Players List</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Preview the live public-facing grid of all approved players.</p>
          </Link>

          <Link to={`/draw${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px solid var(--accent-gold)' }}>
            <div style={{ fontSize: '3.5rem' }}>🎰</div>
            <h3 style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.5rem' }}>Random Draw</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Select gender (Male/Female), hold numbers, and generate random player for bidding.</p>
          </Link>

          <Link to={`/live-auction${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>🔥</div>
            <h3 style={{ color: '#ff4444', margin: 0, fontSize: '1.5rem' }}>Live Auction</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Run active bidding sessions and sell players to teams.</p>
          </Link>

          <Link to={`/team-details${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>💰</div>
            <h3 style={{ color: 'var(--accent-green)', margin: 0, fontSize: '1.5rem' }}>Team & Purse</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Track team squads and remaining auction budget.</p>
          </Link>

          <Link to={`/stream-setup${codeParam}`} className="glass-panel render-card" style={{ padding: '3rem 2rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px solid rgba(57,255,20,0.3)' }}>
            <div style={{ fontSize: '3.5rem' }}>📡</div>
            <h3 style={{ color: 'var(--accent-green)', margin: 0, fontSize: '1.5rem' }}>Stream & OBS Setup</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>Configure YouTube live streams, camera inputs, and OBS overlays.</p>
          </Link>

          {/* Clean Up Data Danger Zone Card */}
          <div
            onClick={() => {
              if (activeAuction) setShowCleanModal(true);
            }}
            className="glass-panel render-card"
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              cursor: activeAuction ? 'pointer' : 'default',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(15, 23, 42, 0.7) 100%)'
            }}
          >
            <div style={{ fontSize: '3.5rem' }}>🗑️</div>
            <h3 style={{ color: '#ef4444', margin: 0, fontSize: '1.5rem' }}>Clean Up All Data</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
              {activeAuction
                ? `Purge all data & Cloudinary images for "${activeAuction.auction_name}".`
                : 'Select an active tournament scope above to purge.'}
            </p>
          </div>

        </div>

        <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '1rem 3rem', fontSize: '1.1rem', borderColor: '#ef4444', color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Secure Logout
        </button>
        
        {/* Cleanup Password Protected Modal */}
        {activeAuction && (
          <CleanAuctionModal
            auction={activeAuction}
            isOpen={showCleanModal}
            onClose={() => setShowCleanModal(false)}
            onSuccess={handleCleanupSuccess}
          />
        )}

        <style>{`
          .render-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .render-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 10px 30px rgba(57, 255, 20, 0.15);
            border-color: rgba(57, 255, 20, 0.4);
          }
        `}</style>
      </main>
    </div>
  );
};

export default AdminPage;
