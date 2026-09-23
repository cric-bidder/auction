import React, { useState, useEffect } from 'react';
import {
  PROJECTOR_THEMES,
  PROJECTOR_LAYOUT_VIEWS,
  BID_ANIMATION_VARIETIES,
  SOLD_ANIMATION_VARIETIES,
  UNSOLD_ANIMATION_VARIETIES
} from '../utils/projectorThemes';
import { Palette, Sparkles, X, Check, Play, Layout, Monitor, Film } from 'lucide-react';

const ProjectorThemeSelector = ({
  currentTheme,
  onSelectTheme,
  layoutView = 'classic_split',
  onSelectLayoutView = () => {},
  bidVariety = 'random',
  onSelectBidVariety = () => {},
  soldVariety = 'random',
  onSelectSoldVariety = () => {},
  unsoldVariety = 'random',
  onSelectUnsoldVariety = () => {},
  onTriggerBidStrike,
  onTriggerSoldTest,
  onTriggerUnsoldTest
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('views'); // 'views' | 'themes' | 'bid_anim' | 'sold_anim' | 'unsold_anim'

  // Keyboard shortcut 'T' to toggle theme menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 't' || e.key === 'T') {
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleChooseTheme = (theme) => {
    onSelectTheme(theme);
    localStorage.setItem('projector_theme', theme.id);
  };

  const handleChooseLayoutView = (id) => {
    onSelectLayoutView(id);
    localStorage.setItem('projector_layout_view', id);
  };

  const handleChooseBidVariety = (id) => {
    onSelectBidVariety(id);
    localStorage.setItem('projector_bid_anim', id);
  };

  const handleChooseSoldVariety = (id) => {
    onSelectSoldVariety(id);
    localStorage.setItem('projector_sold_anim', id);
  };

  const handleChooseUnsoldVariety = (id) => {
    onSelectUnsoldVariety(id);
    localStorage.setItem('projector_unsold_anim', id);
  };

  return (
    <>
      {/* Floating Hub Button */}
      <button
        onClick={() => setIsOpen(true)}
        title="Projector Hub: Views, Themes & Animations [Press T]"
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: 990,
          background: 'rgba(15, 23, 42, 0.94)',
          border: `2px solid ${currentTheme?.accentPrimary || '#ffd700'}`,
          borderRadius: '50px',
          padding: '8px 16px',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: `0 4px 20px rgba(0,0,0,0.6), 0 0 15px ${currentTheme?.glowColor || 'rgba(255,215,0,0.3)'}`,
          backdropFilter: 'blur(8px)',
          transition: 'all 0.25s ease',
          fontSize: '0.85rem',
          fontWeight: 700,
          letterSpacing: '0.5px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <Layout size={16} color={currentTheme?.accentPrimary || '#ffd700'} />
        <span>View & Themes</span>
        <span style={{
          background: 'rgba(255, 255, 255, 0.15)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '0.68rem',
          fontWeight: 800,
          color: currentTheme?.accentPrimary || '#ffd700'
        }}>
          [T]
        </span>
      </button>

      {/* Slide-out Control Drawer */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'flex-end',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '470px',
            height: '100%',
            background: 'linear-gradient(180deg, #0f172a 0%, #030712 100%)',
            borderLeft: `2px solid ${currentTheme?.accentPrimary || '#ffd700'}`,
            boxShadow: '-10px 0 40px rgba(0,0,0,0.8)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            color: '#f8fafc',
            fontFamily: "'Inter', sans-serif"
          }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layout size={24} color={currentTheme?.accentPrimary || '#ffd700'} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Projector Broadcast Hub</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Layout Views, Themes & Animations</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px' }}>
              {[
                { id: 'views', label: '🖥️ Views' },
                { id: 'themes', label: '🎨 Themes' },
                { id: 'bid_anim', label: '⚡ Bids' },
                { id: 'sold_anim', label: '🏆 Sold' },
                { id: 'unsold_anim', label: '🏏 Unsold' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '8px 2px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === tab.id ? (currentTheme?.accentPrimary || '#ffd700') : 'transparent',
                    color: activeTab === tab.id ? '#000' : '#94a3b8',
                    fontWeight: activeTab === tab.id ? 800 : 600,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 0: LAYOUT VIEWS */}
            {activeTab === 'views' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px' }}>
                  Select Projector Screen View Layout:
                </div>
                {PROJECTOR_LAYOUT_VIEWS.map((view) => {
                  const isSelected = layoutView === view.id;
                  return (
                    <div
                      key={view.id}
                      onClick={() => handleChooseLayoutView(view.id)}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? `2px solid ${currentTheme?.accentPrimary || '#ffd700'}` : '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{view.name}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: currentTheme?.accentPrimary || '#ffd700', fontWeight: 600, marginTop: '2px' }}>
                          {view.tagline}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                          {view.desc}
                        </div>
                      </div>

                      {isSelected && <Check size={20} color={currentTheme?.accentPrimary || '#ffd700'} />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 1: THEMES */}
            {activeTab === 'themes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px' }}>
                  Select Broadcast Theme:
                </div>
                {PROJECTOR_THEMES.map((theme) => {
                  const isSelected = currentTheme?.id === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => handleChooseTheme(theme)}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? `2px solid ${theme.accentPrimary}` : '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.6rem' }}>{theme.icon}</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
                            {theme.name}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                            {theme.tagline}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: theme.accentPrimary }} />
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: theme.accentSecondary }} />
                        </div>
                        {isSelected && <Check size={18} color={theme.accentPrimary} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: BID ANIMATIONS */}
            {activeTab === 'bid_anim' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px' }}>
                  Choose Bid Animation Variety:
                </div>
                {BID_ANIMATION_VARIETIES.map((v) => {
                  const isSelected = bidVariety === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => handleChooseBidVariety(v.id)}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? `2px solid ${currentTheme?.accentPrimary || '#ffd700'}` : '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>{v.name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{v.desc}</div>
                      </div>
                      {isSelected && <Check size={18} color={currentTheme?.accentPrimary || '#ffd700'} />}
                    </div>
                  );
                })}

                <button
                  onClick={() => onTriggerBidStrike && onTriggerBidStrike()}
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    borderRadius: '10px',
                    background: `linear-gradient(135deg, ${currentTheme?.accentPrimary || '#ffd700'}, #f59e0b)`,
                    color: '#000',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Play size={16} />
                  <span>Test Selected Bid Animation</span>
                </button>
              </div>
            )}

            {/* TAB 3: SOLD ANIMATIONS */}
            {activeTab === 'sold_anim' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px' }}>
                  Choose Sold Celebration Style:
                </div>
                {SOLD_ANIMATION_VARIETIES.map((v) => {
                  const isSelected = soldVariety === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => handleChooseSoldVariety(v.id)}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? `2px solid ${currentTheme?.accentPrimary || '#ffd700'}` : '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>{v.name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{v.desc}</div>
                      </div>
                      {isSelected && <Check size={18} color={currentTheme?.accentPrimary || '#ffd700'} />}
                    </div>
                  );
                })}

                {onTriggerSoldTest && (
                  <button
                    onClick={onTriggerSoldTest}
                    style={{
                      marginTop: '12px',
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Play size={16} />
                    <span>Test Sold Celebration (3s)</span>
                  </button>
                )}
              </div>
            )}

            {/* TAB 4: UNSOLD ANIMATIONS */}
            {activeTab === 'unsold_anim' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px' }}>
                  Choose Unsold Animation Style:
                </div>
                {UNSOLD_ANIMATION_VARIETIES.map((v) => {
                  const isSelected = unsoldVariety === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => handleChooseUnsoldVariety(v.id)}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? `2px solid #ef4444` : '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>{v.name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{v.desc}</div>
                      </div>
                      {isSelected && <Check size={18} color="#ef4444" />}
                    </div>
                  );
                })}

                {onTriggerUnsoldTest && (
                  <button
                    onClick={onTriggerUnsoldTest}
                    style={{
                      marginTop: '12px',
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Play size={16} />
                    <span>Test Unsold Animation (3s)</span>
                  </button>
                )}
              </div>
            )}

            {/* Bottom Tip */}
            <div style={{
              marginTop: 'auto',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.75rem',
              color: '#94a3b8'
            }}>
              <Sparkles size={14} color={currentTheme?.accentPrimary || '#ffd700'} />
              <span>Layout views, themes & animations save automatically.</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectorThemeSelector;
