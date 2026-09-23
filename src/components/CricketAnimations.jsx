import React, { useEffect, useState, useMemo } from 'react';

/**
 * =========================================================================
 * 1. AMBIENT BACKGROUNDS & TEXTURES
 * =========================================================================
 */

export const StadiumFloodlights = ({ theme }) => {
  const spotlightColor = theme?.spotlightColor || 'rgba(56, 189, 248, 0.15)';

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {/* Left Floodlight */}
      <div style={{
        position: 'absolute',
        top: '-150px',
        left: '-100px',
        width: '600px',
        height: '800px',
        background: `radial-gradient(ellipse at top left, ${spotlightColor} 0%, rgba(0,0,0,0) 70%)`,
        transform: 'rotate(-25deg)',
        transformOrigin: 'top left',
        animation: 'spotlightSweepLeft 12s ease-in-out infinite alternate',
        filter: 'blur(35px)',
        opacity: 0.85
      }} />

      {/* Right Floodlight */}
      <div style={{
        position: 'absolute',
        top: '-150px',
        right: '-100px',
        width: '600px',
        height: '800px',
        background: `radial-gradient(ellipse at top right, ${spotlightColor} 0%, rgba(0,0,0,0) 70%)`,
        transform: 'rotate(25deg)',
        transformOrigin: 'top right',
        animation: 'spotlightSweepRight 14s ease-in-out infinite alternate',
        filter: 'blur(35px)',
        opacity: 0.85
      }} />

      <style>{`
        @keyframes spotlightSweepLeft {
          0% { transform: rotate(-35deg) scale(0.9); opacity: 0.6; }
          50% { transform: rotate(-15deg) scale(1.1); opacity: 0.9; }
          100% { transform: rotate(-30deg) scale(1.0); opacity: 0.7; }
        }
        @keyframes spotlightSweepRight {
          0% { transform: rotate(35deg) scale(0.9); opacity: 0.6; }
          50% { transform: rotate(15deg) scale(1.1); opacity: 0.9; }
          100% { transform: rotate(30deg) scale(1.0); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export const ThemeTextureOverlay = ({ theme }) => {
  const texture = theme?.texture;
  if (!texture || texture === 'none') return null;

  if (texture === 'hex_grid') {
    return (
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, opacity: 0.12,
        backgroundImage: `radial-gradient(${theme.accentPrimary || '#00ff88'} 1px, transparent 1px), radial-gradient(${theme.accentSecondary || '#00e5ff'} 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        backgroundPosition: '0 0, 20px 20px'
      }} />
    );
  }

  if (texture === 'embers') {
    return (
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
        {[...Array(18)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: '-20px',
              left: `${(i * 5.8) % 100}%`,
              width: `${(i % 3) * 2 + 3}px`,
              height: `${(i % 3) * 2 + 3}px`,
              background: i % 2 === 0 ? (theme.accentPrimary || '#ff3366') : '#ff9900',
              borderRadius: '50%',
              boxShadow: `0 0 10px ${theme.accentPrimary || '#ff3366'}`,
              animation: `emberRise ${4 + (i % 4)}s linear infinite`,
              animationDelay: `${i * 0.3}s`
            }}
          />
        ))}
        <style>{`
          @keyframes emberRise {
            0% { transform: translateY(0) scale(1); opacity: 0.9; }
            50% { transform: translateY(-50vh) translateX(${((Math.random() - 0.5) * 40)}px) scale(0.8); opacity: 0.6; }
            100% { transform: translateY(-105vh) scale(0.2); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  if (texture === 'turf') {
    return (
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, opacity: 0.08,
        backgroundImage: 'repeating-linear-gradient(45deg, rgba(16,185,129,0.2) 0px, rgba(16,185,129,0.2) 2px, transparent 2px, transparent 14px)'
      }} />
    );
  }

  return null;
};

/**
 * =========================================================================
 * 2. BID ANIMATION VARIETIES
 * =========================================================================
 */

/** Variety 1: Leather Cricket Ball Comet Strike */
export const CricketBallBidStrike = ({ theme }) => {
  const ballColor = theme?.ballColor || '#dc2626';
  const trailColor = theme?.ballTrail || 'rgba(255, 215, 0, 0.9)';

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        bottom: '15%',
        left: '10%',
        width: '80vw',
        height: '6px',
        background: `linear-gradient(90deg, transparent 0%, ${trailColor} 70%, #ffffff 100%)`,
        transformOrigin: 'left center',
        transform: 'rotate(-25deg)',
        animation: 'cometStreak 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards',
        filter: `drop-shadow(0 0 12px ${trailColor})`
      }} />

      <div style={{
        position: 'absolute',
        bottom: '10%',
        left: '5%',
        width: '56px',
        height: '56px',
        animation: 'cricketBallFly 0.65s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        filter: `drop-shadow(0 0 18px ${ballColor})`
      }}>
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <defs>
            <radialGradient id="leatherShade" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ff6b6b" />
              <stop offset="40%" stopColor={ballColor} />
              <stop offset="90%" stopColor="#7f1d1d" />
              <stop offset="100%" stopColor="#450a0a" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#leatherShade)" stroke="#ffffff" strokeWidth="1.5" />
          <path d="M 14,50 Q 50,22 86,50" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="3,3" />
          <path d="M 14,50 Q 50,78 86,50" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="3,3" />
        </svg>
      </div>

      <div style={{
        position: 'absolute',
        top: '40%',
        left: '52%',
        transform: 'translate(-50%, -50%)',
        width: '280px',
        height: '280px',
        borderRadius: '50%',
        border: `4px solid ${theme?.accentPrimary || '#ffd700'}`,
        boxShadow: `0 0 40px ${theme?.accentPrimary || '#ffd700'}, inset 0 0 30px ${theme?.accentPrimary || '#ffd700'}`,
        animation: 'shockwavePulse 0.65s 0.55s ease-out forwards',
        opacity: 0
      }} />

      <style>{`
        @keyframes cometStreak {
          0% { transform: scaleX(0) rotate(-25deg); opacity: 0; }
          40% { transform: scaleX(1) rotate(-25deg); opacity: 1; }
          100% { transform: scaleX(1.3) rotate(-25deg); opacity: 0; }
        }
        @keyframes cricketBallFly {
          0% { transform: translate(0, 0) scale(0.4) rotate(0deg); opacity: 1; }
          85% { transform: translate(45vw, -45vh) scale(1.4) rotate(720deg); opacity: 1; }
          100% { transform: translate(48vw, -48vh) scale(2.2) rotate(900deg); opacity: 0; }
        }
        @keyframes shockwavePulse {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

/** Variety 2: Sixer Boundary Firework Sparks */
export const SixerFireworkFlash = ({ theme }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: '45%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        animation: 'sixerPop 1.1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${theme?.accentPrimary || '#ffd700'}, #f97316)`,
          color: '#000',
          fontWeight: 900,
          fontSize: '3.5rem',
          padding: '0.8rem 2.5rem',
          borderRadius: '20px',
          boxShadow: `0 0 50px ${theme?.accentPrimary || '#ffd700'}`,
          letterSpacing: '4px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span>🏏</span>
          <span>NEW BID!</span>
        </div>
      </div>

      {[...Array(16)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '45%',
            left: '50%',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: i % 2 === 0 ? (theme?.accentPrimary || '#ffd700') : '#38bdf8',
            boxShadow: '0 0 15px #fff',
            animation: `sparkBurst 0.9s ease-out forwards`,
            transform: `rotate(${i * 22.5}deg) translate(0, 0)`
          }}
        />
      ))}

      <style>{`
        @keyframes sixerPop {
          0% { transform: translate(-50%, -50%) scale(0.2) rotate(-15deg); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.15) rotate(0deg); opacity: 1; }
          80% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.3) translateY(-30px); opacity: 0; }
        }
        @keyframes sparkBurst {
          0% { opacity: 1; transform: rotate(var(--rot)) translate(0, 0) scale(1); }
          100% { opacity: 0; transform: rotate(var(--rot)) translate(${Math.random() * 250 + 100}px, 0) scale(0.2); }
        }
      `}</style>
    </div>
  );
};

/** Variety 3: 3D Auctioneer Gavel Slam */
export const GavelBidSlam = ({ theme }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: '38%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'gavelSlam 1.1s ease forwards'
      }}>
        <svg viewBox="0 0 200 160" width="180" height="140">
          <defs>
            <linearGradient id="goldGavel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor={theme?.accentPrimary || '#ffd700'} />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <rect x="50" y="125" width="100" height="20" rx="4" fill="url(#goldGavel)" stroke="#000" strokeWidth="2" />
          <g style={{ transformOrigin: '140px 125px', animation: 'hammerSwing 0.7s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards' }}>
            <rect x="130" y="40" width="14" height="85" rx="3" fill="#d97706" transform="rotate(-35 140 120)" />
            <rect x="70" y="25" width="60" height="30" rx="6" fill="url(#goldGavel)" stroke="#000" strokeWidth="2" transform="rotate(-35 140 120)" />
          </g>
        </svg>
      </div>

      <div style={{
        position: 'absolute',
        top: '46%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '320px',
        height: '160px',
        borderRadius: '50%',
        border: `4px solid ${theme?.accentPrimary || '#ffd700'}`,
        animation: 'gavelWave 0.7s 0.45s ease-out forwards',
        opacity: 0
      }} />

      <style>{`
        @keyframes hammerSwing {
          0% { transform: rotate(-55deg); }
          60% { transform: rotate(0deg); }
          75% { transform: rotate(-10deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes gavelWave {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
        @keyframes gavelSlam {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.15); }
        }
      `}</style>
    </div>
  );
};

/** Variety 4: Electric Lightning Surge */
export const LightningBidSurge = ({ theme }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <svg viewBox="0 0 1000 800" width="100%" height="100%" preserveAspectRatio="none" style={{ animation: 'lightningFlash 0.9s ease-out forwards' }}>
        <path
          d="M 500,0 L 480,200 L 530,230 L 460,450 L 520,480 L 490,750"
          fill="none"
          stroke={theme?.accentSecondary || '#00e5ff'}
          strokeWidth="6"
          filter="drop-shadow(0 0 18px #00e5ff)"
        />
        <path
          d="M 500,0 L 480,200 L 530,230 L 460,450 L 520,480 L 490,750"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.5"
        />
      </svg>
      <style>{`
        @keyframes lightningFlash {
          0% { opacity: 0; }
          10% { opacity: 1; }
          20% { opacity: 0.3; }
          30% { opacity: 1; }
          60% { opacity: 0.8; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

/** Variety 5: Blazing Fireball Meteor Blast */
export const FireballBidBlast = ({ theme }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: '40%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '4.5rem',
        animation: 'meteorSlam 0.8s cubic-bezier(0.1, 0.9, 0.2, 1) forwards',
        filter: 'drop-shadow(0 0 35px #ff4500)'
      }}>
        🔥
      </div>
      <div style={{
        position: 'absolute',
        top: '45%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,69,0,0.5) 0%, rgba(255,140,0,0.2) 50%, transparent 70%)',
        animation: 'fireShockwave 0.8s ease-out forwards'
      }} />
      <style>{`
        @keyframes meteorSlam {
          0% { transform: translate(-50%, -200%) scale(0.3) rotate(-45deg); opacity: 0; }
          60% { transform: translate(-50%, -50%) scale(1.6) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
        }
        @keyframes fireShockwave {
          0% { transform: translate(-50%, -50%) scale(0.1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

/** Variety 6: Cyber Laser Target Lock */
export const LaserTargetBidStrike = ({ theme }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: '45%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '260px',
        height: '260px',
        border: `3px dashed ${theme?.accentPrimary || '#00ff88'}`,
        borderRadius: '50%',
        animation: 'radarSpin 1s linear forwards'
      }} />
      <div style={{
        position: 'absolute',
        top: '45%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontWeight: 900,
        fontSize: '2rem',
        color: theme?.accentPrimary || '#00ff88',
        letterSpacing: '4px',
        textShadow: `0 0 20px ${theme?.accentPrimary || '#00ff88'}`,
        animation: 'targetLock 0.9s ease-out forwards'
      }}>
        🎯 [BID LOCKED]
      </div>
      <style>{`
        @keyframes radarSpin {
          0% { transform: translate(-50%, -50%) rotate(0deg) scale(0.2); opacity: 0; }
          50% { transform: translate(-50%, -50%) rotate(180deg) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(360deg) scale(1.4); opacity: 0; }
        }
        @keyframes targetLock {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.3); }
        }
      `}</style>
    </div>
  );
};

/** Variety 7: Golden Coins & Confetti Burst */
export const GoldenCoinsBidBurst = ({ theme }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {[...Array(14)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '45%',
            left: `${25 + (i * 4)}%`,
            fontSize: '2.5rem',
            animation: `coinPop 1s ease-out forwards`,
            animationDelay: `${i * 0.04}s`,
            filter: 'drop-shadow(0 0 15px #ffd700)'
          }}
        >
          🪙
        </div>
      ))}
      <style>{`
        @keyframes coinPop {
          0% { transform: translateY(0) scale(0.2) rotate(0deg); opacity: 1; }
          50% { transform: translateY(-120px) scale(1.3) rotate(180deg); opacity: 1; }
          100% { transform: translateY(80px) scale(0.8) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

/** Master Bid Animation Engine with Variety Selector */
export const BidAnimationEngine = ({ triggerKey, theme, variety = 'random' }) => {
  const [animating, setAnimating] = useState(false);
  const [activeVariety, setActiveVariety] = useState('ball_strike');

  useEffect(() => {
    if (!triggerKey) return;
    
    // Choose variety
    if (variety === 'random') {
      const options = ['ball_strike', 'sixer_flash', 'gavel_slam', 'lightning_surge', 'fireball_blast', 'laser_strike', 'golden_coins'];
      const pick = options[Math.floor(Math.random() * options.length)];
      setActiveVariety(pick);
    } else {
      setActiveVariety(variety);
    }

    setAnimating(true);
    const timer = setTimeout(() => {
      setAnimating(false);
    }, 1300);
    return () => clearTimeout(timer);
  }, [triggerKey, variety]);

  if (!animating) return null;

  if (activeVariety === 'sixer_flash') return <SixerFireworkFlash theme={theme} />;
  if (activeVariety === 'gavel_slam') return <GavelBidSlam theme={theme} />;
  if (activeVariety === 'lightning_surge') return <LightningBidSurge theme={theme} />;
  if (activeVariety === 'fireball_blast') return <FireballBidBlast theme={theme} />;
  if (activeVariety === 'laser_strike') return <LaserTargetBidStrike theme={theme} />;
  if (activeVariety === 'golden_coins') return <GoldenCoinsBidBurst theme={theme} />;
  return <CricketBallBidStrike theme={theme} />;
};

/**
 * =========================================================================
 * 3. SOLD ANIMATION VARIETIES
 * =========================================================================
 */

/** Sold Variety 1: Crossed Golden Bats & Stumps */
export const SoldCrossedBats = ({ theme }) => {
  const accentColor = theme?.accentPrimary || '#ffd700';

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.2rem' }}>
      <div style={{ position: 'absolute', inset: -40, pointerEvents: 'none', overflow: 'hidden' }}>
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(i * 4.3) % 100}%`,
              top: '-20px',
              width: `${(i % 3) * 4 + 8}px`,
              height: `${(i % 2) * 6 + 10}px`,
              background: i % 3 === 0 ? accentColor : i % 3 === 1 ? '#39ff14' : '#38bdf8',
              borderRadius: i % 2 === 0 ? '50%' : '2px',
              animation: `confettiFall ${2 + (i % 4) * 0.5}s infinite linear`,
              animationDelay: `${(i * 0.15)}s`,
              transform: `rotate(${i * 35}deg)`
            }}
          />
        ))}
      </div>

      <div style={{ width: '140px', height: '110px', animation: 'trophyPop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
        <svg viewBox="0 0 160 120" width="100%" height="100%">
          <defs>
            <linearGradient id="goldGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor={accentColor} />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* Left Bat */}
          <g transform="rotate(-30 80 70)">
            <rect x="74" y="20" width="12" height="65" rx="3" fill="url(#goldGlow)" filter="url(#glowEffect)" />
            <rect x="77" y="5" width="6" height="20" rx="2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1" />
          </g>

          {/* Right Bat */}
          <g transform="rotate(30 80 70)">
            <rect x="74" y="20" width="12" height="65" rx="3" fill="url(#goldGlow)" filter="url(#glowEffect)" />
            <rect x="77" y="5" width="6" height="20" rx="2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1" />
          </g>

          {/* 3 Stumps */}
          <g stroke="url(#goldGlow)" strokeWidth="4" strokeLinecap="round">
            <line x1="72" y1="45" x2="72" y2="95" />
            <line x1="80" y1="45" x2="80" y2="95" />
            <line x1="88" y1="45" x2="88" y2="95" />
            <line x1="69" y1="42" x2="91" y2="42" strokeWidth="3.5" stroke="#ffffff" />
          </g>

          <circle cx="80" cy="70" r="16" fill="rgba(15,23,42,0.9)" stroke={accentColor} strokeWidth="2.5" />
          <text x="80" y="76" textAnchor="middle" fill={accentColor} fontSize="18" fontWeight="bold">👑</text>
        </svg>
      </div>

      <style>{`
        @keyframes trophyPop {
          0% { transform: scale(0.3) rotate(-15deg); opacity: 0; }
          70% { transform: scale(1.15) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes confettiFall {
          0% { transform: translateY(-30px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(320px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

/** Sold Variety 2: Grand Stadium Fireworks Burst */
export const SoldGrandFireworks = ({ theme }) => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
      <div style={{ fontSize: '4rem', animation: 'fireworkRocket 1s ease infinite alternate' }}>
        🎆 🏆 🎆
      </div>
      <style>{`
        @keyframes fireworkRocket {
          0% { transform: scale(0.9) translateY(0); filter: drop-shadow(0 0 10px #ffd700); }
          100% { transform: scale(1.2) translateY(-10px); filter: drop-shadow(0 0 35px #38bdf8); }
        }
      `}</style>
    </div>
  );
};

/** Sold Variety 3: 3D Giant Golden Hammer & Hologram SOLD Stamp */
export const SoldHammerStamp = ({ theme }) => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
      <div style={{
        background: `linear-gradient(135deg, ${theme?.accentPrimary || '#ffd700'}, #f59e0b)`,
        color: '#000',
        fontWeight: 900,
        fontSize: '2rem',
        padding: '0.6rem 2rem',
        borderRadius: '12px',
        border: '3px solid #fff',
        boxShadow: `0 0 40px ${theme?.accentPrimary || '#ffd700'}`,
        transform: 'rotate(-5deg)',
        animation: 'stampSlam 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        🔨 OFFICIAL SEALED
      </div>
      <style>{`
        @keyframes stampSlam {
          0% { transform: scale(3) rotate(-25deg); opacity: 0; }
          100% { transform: scale(1) rotate(-5deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

/** Sold Variety 4: Stadium Floodlight Glory */
export const SoldStadiumSpotlight = ({ theme }) => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
      <div style={{
        fontSize: '3.5rem',
        animation: 'gloryPulse 1s ease-in-out infinite alternate',
        filter: `drop-shadow(0 0 40px ${theme?.accentPrimary || '#ffd700'})`
      }}>
        🌟 🏏 🌟
      </div>
      <style>{`
        @keyframes gloryPulse {
          0% { transform: scale(0.85); opacity: 0.8; }
          100% { transform: scale(1.25); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

/** Sold Variety 5: Holographic Franchise Lock */
export const SoldHologramLock = ({ theme }) => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
      <div style={{
        background: 'rgba(0,0,0,0.8)',
        border: `3px solid ${theme?.accentPrimary || '#00ff88'}`,
        borderRadius: '16px',
        padding: '10px 24px',
        color: theme?.accentPrimary || '#00ff88',
        fontWeight: 900,
        fontSize: '1.6rem',
        letterSpacing: '3px',
        boxShadow: `0 0 50px ${theme?.accentPrimary || '#00ff88'}`,
        animation: 'hologramPulse 0.8s ease-out infinite alternate'
      }}>
        🔒 SQUAD SECURED
      </div>
      <style>{`
        @keyframes hologramPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 20px rgba(0,255,136,0.4); }
          100% { transform: scale(1.05); box-shadow: 0 0 50px rgba(0,255,136,0.9); }
        }
      `}</style>
    </div>
  );
};

/** Master Sold Animation Engine */
export const SoldCelebrationStumps = ({ theme, variety = 'random' }) => {
  const chosenVariety = useMemo(() => {
    if (variety === 'random') {
      const opts = ['crossed_bats', 'mega_fireworks', 'hammer_stamp', 'stadium_spotlight', 'hologram_lock'];
      return opts[Math.floor(Math.random() * opts.length)];
    }
    return variety;
  }, [variety]);

  if (chosenVariety === 'mega_fireworks') return <SoldGrandFireworks theme={theme} />;
  if (chosenVariety === 'hammer_stamp') return <SoldHammerStamp theme={theme} />;
  if (chosenVariety === 'stadium_spotlight') return <SoldStadiumSpotlight theme={theme} />;
  if (chosenVariety === 'hologram_lock') return <SoldHologramLock theme={theme} />;
  return <SoldCrossedBats theme={theme} />;
};

/**
 * =========================================================================
 * 4. UNSOLD ANIMATION VARIETIES
 * =========================================================================
 */

/** Unsold Variety 1: Shattered Stumps & Flying Bails */
export const UnsoldWicketFall = () => {
  return (
    <div style={{ width: '130px', height: '95px', margin: '0 auto 1rem', position: 'relative' }}>
      <svg viewBox="0 0 140 100" width="100%" height="100%">
        <circle cx="70" cy="50" r="45" fill="rgba(239, 68, 68, 0.18)" filter="blur(8px)" />
        <line x1="70" y1="30" x2="70" y2="85" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="58" y1="35" x2="55" y2="85" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" style={{ animation: 'tiltStump 1s ease forwards' }} />
        <line x1="82" y1="30" x2="85" y2="85" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" style={{ transformOrigin: '85px 85px', animation: 'fallStump 0.8s ease-out forwards' }} />
        <line x1="55" y1="28" x2="70" y2="28" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" style={{ transformOrigin: '60px 28px', animation: 'flyBailLeft 0.8s ease-out forwards' }} />
        <line x1="70" y1="28" x2="85" y2="28" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" style={{ transformOrigin: '80px 28px', animation: 'flyBailRight 0.8s ease-out forwards' }} />
      </svg>
      <style>{`
        @keyframes tiltStump { 0% { transform: rotate(0deg); } 100% { transform: rotate(-15deg); } }
        @keyframes fallStump { 0% { transform: rotate(0deg); } 100% { transform: rotate(65deg) translate(15px, 10px); } }
        @keyframes flyBailLeft { 0% { transform: translate(0, 0) rotate(0deg); opacity: 1; } 100% { transform: translate(-35px, -35px) rotate(-180deg); opacity: 0.6; } }
        @keyframes flyBailRight { 0% { transform: translate(0, 0) rotate(0deg); opacity: 1; } 100% { transform: translate(40px, -45px) rotate(220deg); opacity: 0.6; } }
      `}</style>
    </div>
  );
};

/** Unsold Variety 2: Third Umpire Red Siren & OUT Flasher */
export const UnsoldUmpireSiren = () => {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' }}>
      <div style={{
        background: '#ef4444',
        color: '#fff',
        fontWeight: 900,
        fontSize: '1.4rem',
        padding: '0.5rem 1.8rem',
        borderRadius: '8px',
        letterSpacing: '3px',
        boxShadow: '0 0 35px rgba(239,68,68,0.8)',
        animation: 'sirenBlink 0.6s infinite alternate'
      }}>
        🚨 DECISION: UNSOLD
      </div>
      <style>{`
        @keyframes sirenBlink {
          0% { opacity: 0.6; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

/** Unsold Variety 3: Raincloud & Sad Pitch Walkout */
export const UnsoldRainWalk = () => {
  return (
    <div style={{ width: '100%', textAlign: 'center', fontSize: '3rem', marginBottom: '0.8rem', animation: 'rainBounce 1.2s infinite alternate' }}>
      🌧️ ⚡ 🌧️
      <style>{`
        @keyframes rainBounce {
          0% { transform: translateY(0); filter: drop-shadow(0 0 10px #38bdf8); }
          100% { transform: translateY(-8px); filter: drop-shadow(0 0 25px #ef4444); }
        }
      `}</style>
    </div>
  );
};

/** Unsold Variety 4: Frost Freeze & Shatter */
export const UnsoldIceFreeze = () => {
  return (
    <div style={{ width: '100%', textAlign: 'center', fontSize: '3rem', marginBottom: '0.8rem', animation: 'icePulse 1s ease infinite alternate' }}>
      ❄️ 🧊 ❄️
      <div style={{ fontSize: '1rem', color: '#38bdf8', fontWeight: 800, letterSpacing: '2px', marginTop: '4px' }}>
        ROUND PASSED
      </div>
      <style>{`
        @keyframes icePulse {
          0% { transform: scale(0.9); filter: drop-shadow(0 0 10px #38bdf8); }
          100% { transform: scale(1.15); filter: drop-shadow(0 0 30px #ffffff); }
        }
      `}</style>
    </div>
  );
};

/** Unsold Variety 5: Gavel Tap & PASSED Stamp */
export const UnsoldGavelPass = () => {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' }}>
      <div style={{
        background: 'rgba(239, 68, 68, 0.2)',
        border: '3px solid #ef4444',
        borderRadius: '12px',
        padding: '6px 20px',
        color: '#ef4444',
        fontWeight: 900,
        fontSize: '1.4rem',
        letterSpacing: '3px',
        transform: 'rotate(-4deg)',
        boxShadow: '0 0 30px rgba(239,68,68,0.5)',
        animation: 'passStamp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        🔨 PASSED / UNSOLD
      </div>
      <style>{`
        @keyframes passStamp {
          0% { transform: scale(2.5) rotate(-20deg); opacity: 0; }
          100% { transform: scale(1) rotate(-4deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

/** Master Unsold Animation Engine */
export const UnsoldAnimationEngine = ({ variety = 'random' }) => {
  const chosenVariety = useMemo(() => {
    if (variety === 'random') {
      const opts = ['broken_stumps', 'umpire_siren', 'rainy_walk', 'ice_freeze', 'gavel_pass'];
      return opts[Math.floor(Math.random() * opts.length)];
    }
    return variety;
  }, [variety]);

  if (chosenVariety === 'umpire_siren') return <UnsoldUmpireSiren />;
  if (chosenVariety === 'rainy_walk') return <UnsoldRainWalk />;
  if (chosenVariety === 'ice_freeze') return <UnsoldIceFreeze />;
  if (chosenVariety === 'gavel_pass') return <UnsoldGavelPass />;
  return <UnsoldWicketFall />;
};
