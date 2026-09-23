import React, { useEffect, useRef } from 'react';
import { Shield } from 'lucide-react';
import { formatIndianCurrencyWords } from '../utils/currencyUtils';

const getTeamInitials = (name) => {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return words.map(w => w.charAt(0)).join('').toUpperCase();
};

/**
 * Vertical Team Auto Slider with continuous smooth looping auto-scroll
 */
export const VerticalTeamAutoSlider = ({
  teams = [],
  winningTeam = null,
  getTeamRemainingPurse = () => 0,
  allAuctionPlayers = [],
  maxPlayers = 11,
  theme = {},
  sortByPurse = false,
  maxHeight = '100%',
  title = 'FRANCHISE PURSES'
}) => {
  const containerRef = useRef(null);
  const isHoveredRef = useRef(false);

  // Process & Sort teams if requested
  const processedTeams = sortByPurse
    ? [...teams].sort((a, b) => getTeamRemainingPurse(b) - getTeamRemainingPurse(a))
    : teams;

  // Auto-scroll logic
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let animId;
    let accumulated = 0;

    const scrollStep = () => {
      if (el && !isHoveredRef.current) {
        if (el.scrollHeight > el.clientHeight + 10) {
          // If at the bottom, smooth reset to top
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) {
            accumulated = 0;
            el.scrollTop = 0;
          } else {
            accumulated += 0.55; // Smooth sub-pixel scrolling speed
            if (accumulated >= 1) {
              el.scrollTop += Math.floor(accumulated);
              accumulated -= Math.floor(accumulated);
            }
          }
        }
      }
      animId = requestAnimationFrame(scrollStep);
    };

    animId = requestAnimationFrame(scrollStep);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [processedTeams]);

  // When winning team changes, briefly focus / ensure visibility
  useEffect(() => {
    if (!winningTeam || !containerRef.current) return;
    const activeEl = containerRef.current.querySelector(`[data-team-id="${winningTeam.id}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [winningTeam?.id]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: maxHeight,
        background: theme?.cardBg || 'rgba(15, 23, 42, 0.85)',
        border: `1px solid ${theme?.cardBorder || 'rgba(255, 255, 255, 0.1)'}`,
        borderRadius: '16px',
        padding: '12px 14px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
      }}
      onMouseEnter={() => { isHoveredRef.current = true; }}
      onMouseLeave={() => { isHoveredRef.current = false; }}
    >
      {/* Header with Title and Auto-Slider badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '8px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Shield size={14} color={theme?.accentPrimary || '#ffd700'} />
          <span
            style={{
              fontSize: '0.8rem',
              color: theme?.accentPrimary || '#ffd700',
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}
          >
            {title} ({teams.length})
          </span>
        </div>
        {teams.length > 5 && (
          <span
            style={{
              fontSize: '0.65rem',
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '2px 6px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }} />
            AUTO-SLIDER
          </span>
        )}
      </div>

      {/* Scrollable / Auto-Sliding List Container */}
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '7px',
          overflowY: 'auto',
          flex: 1,
          paddingRight: '3px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 215, 0, 0.3) transparent'
        }}
      >
        {processedTeams.map((t, idx) => {
          const isLeading = winningTeam?.id === t.id;
          const purse = getTeamRemainingPurse(t);
          const squadCount = allAuctionPlayers.filter(
            p => p.team_id === t.id && (p.auction_status === 'sold' || Number(p.sold_price) > 0)
          ).length;

          return (
            <div
              key={t.id}
              data-team-id={t.id}
              style={{
                background: isLeading
                  ? 'linear-gradient(90deg, rgba(57, 255, 20, 0.22) 0%, rgba(15, 23, 42, 0.9) 100%)'
                  : 'rgba(255, 255, 255, 0.035)',
                border: isLeading
                  ? '1.5px solid #39ff14'
                  : '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '9px',
                padding: '7px 10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s ease',
                boxShadow: isLeading ? '0 0 15px rgba(57, 255, 20, 0.3)' : 'none',
                flexShrink: 0
              }}
            >
              {/* Left: Rank/Icon + Logo + Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                {sortByPurse && (
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: idx < 3 ? (theme?.accentPrimary || '#ffd700') : 'rgba(255,255,255,0.1)',
                      color: idx < 3 ? '#000' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '0.65rem',
                      flexShrink: 0
                    }}
                  >
                    {idx + 1}
                  </span>
                )}
                {t.logo_url ? (
                  <img
                    src={t.logo_url}
                    alt=""
                    style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      background: theme?.accentPrimary || '#ffd700',
                      color: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '0.7rem',
                      flexShrink: 0
                    }}
                  >
                    {getTeamInitials(t.team_name)}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      color: isLeading ? '#39ff14' : '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {t.team_name}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.68rem', color: '#94a3b8' }}>
                    <span>Squad: <strong style={{ color: '#fff' }}>{squadCount}</strong>/{maxPlayers}</span>
                    {isLeading && (
                      <span
                        style={{
                          background: '#39ff14',
                          color: '#000',
                          padding: '0 4px',
                          borderRadius: '3px',
                          fontWeight: 900,
                          fontSize: '0.6rem'
                        }}
                      >
                        BIDDER
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Purse in Words */}
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                <div
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    color: isLeading ? '#39ff14' : (theme?.accentPrimary || '#ffd700'),
                    textShadow: isLeading ? '0 0 10px rgba(57,255,20,0.5)' : 'none'
                  }}
                >
                  {formatIndianCurrencyWords(purse)}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                  ₹{purse.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Horizontal Team Auto Slider / Marquee ticker for single-line bottom placement
 */
export const HorizontalTeamAutoSlider = ({
  teams = [],
  winningTeam = null,
  getTeamRemainingPurse = () => 0,
  theme = {},
  duration = '35s'
}) => {
  if (!teams || teams.length === 0) return null;

  // Duplicate for seamless wrap-around marquee loop
  const displayItems = teams.length < 6
    ? [...teams, ...teams, ...teams, ...teams]
    : [...teams, ...teams];

  return (
    <div
      style={{
        width: '100%',
        overflow: 'hidden',
        background: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '10px',
        padding: '5px 0',
        display: 'flex',
        maskImage: 'linear-gradient(to right, transparent, white 4%, white 96%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, white 4%, white 96%, transparent)',
        position: 'relative'
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '10px',
          animation: `projectorTeamsMarquee ${duration} linear infinite`,
          whiteSpace: 'nowrap',
          width: 'max-content',
          padding: '0 8px'
        }}
      >
        {displayItems.map((t, idx) => {
          const isLeading = winningTeam?.id === t.id;
          const purse = getTeamRemainingPurse(t);

          return (
            <div
              key={`${t.id}-${idx}`}
              style={{
                background: isLeading ? 'rgba(57, 255, 20, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                border: isLeading ? '1.5px solid #39ff14' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '4px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: isLeading ? '0 0 15px rgba(57, 255, 20, 0.35)' : 'none',
                flexShrink: 0
              }}
            >
              {t.logo_url ? (
                <img src={t.logo_url} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
              ) : (
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '3px',
                    background: theme?.accentPrimary || '#ffd700',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.6rem'
                  }}
                >
                  {getTeamInitials(t.team_name)}
                </div>
              )}
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  color: isLeading ? '#39ff14' : '#fff'
                }}
              >
                {t.team_name}
              </span>
              <span
                style={{
                  fontSize: '0.78rem',
                  color: isLeading ? '#39ff14' : (theme?.accentPrimary || '#ffd700'),
                  fontWeight: 900
                }}
              >
                {formatIndianCurrencyWords(purse)}
              </span>
              {isLeading && (
                <span
                  style={{
                    background: '#39ff14',
                    color: '#000',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    fontWeight: 900,
                    fontSize: '0.62rem'
                  }}
                >
                  ACTIVE
                </span>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes projectorTeamsMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

/**
 * Grid Team Auto Slider for Multi-Column Tactical Monitor & Arena HUD Views
 */
export const GridTeamAutoSlider = ({
  teams = [],
  winningTeam = null,
  getTeamRemainingPurse = () => 0,
  theme = {},
  maxHeight = '100%'
}) => {
  const containerRef = useRef(null);
  const isHoveredRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let animId;
    let accumulated = 0;

    const scrollStep = () => {
      if (el && !isHoveredRef.current) {
        if (el.scrollHeight > el.clientHeight + 10) {
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) {
            accumulated = 0;
            el.scrollTop = 0;
          } else {
            accumulated += 0.5;
            if (accumulated >= 1) {
              el.scrollTop += Math.floor(accumulated);
              accumulated -= Math.floor(accumulated);
            }
          }
        }
      }
      animId = requestAnimationFrame(scrollStep);
    };

    animId = requestAnimationFrame(scrollStep);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [teams]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '10px',
        maxHeight: maxHeight,
        overflowY: 'auto',
        flex: 1,
        paddingRight: '4px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255, 215, 0, 0.3) transparent'
      }}
      onMouseEnter={() => { isHoveredRef.current = true; }}
      onMouseLeave={() => { isHoveredRef.current = false; }}
    >
      {teams.map(t => {
        const isLeading = winningTeam?.id === t.id;
        const purse = getTeamRemainingPurse(t);

        return (
          <div
            key={t.id}
            style={{
              background: isLeading ? 'rgba(57, 255, 20, 0.18)' : 'rgba(255, 255, 255, 0.035)',
              border: isLeading ? '2px solid #39ff14' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: isLeading ? '0 0 20px rgba(57, 255, 20, 0.3)' : 'none',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {t.logo_url ? (
                <img src={t.logo_url} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} />
              ) : (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '6px',
                    background: theme?.accentPrimary || '#ffd700',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.8rem'
                  }}
                >
                  {getTeamInitials(t.team_name)}
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {t.team_name}
                </div>
                <div style={{ fontSize: '0.7rem', color: isLeading ? '#39ff14' : '#94a3b8', fontWeight: 600 }}>
                  {isLeading ? '⚡ LEADING BIDDER' : 'Participating Team'}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <span style={{ fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>
                  Remaining Purse
                </span>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: theme?.accentPrimary || '#ffd700' }}>
                  {formatIndianCurrencyWords(purse)}
                </span>
              </div>
              {isLeading && (
                <span
                  style={{
                    background: '#39ff14',
                    color: '#000',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 900,
                    fontSize: '0.65rem'
                  }}
                >
                  ACTIVE
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
