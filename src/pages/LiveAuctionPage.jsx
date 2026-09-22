import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import PageHeader from '../components/PageHeader';
import { Loader } from '../components/Loader';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { getOptimizedImageUrl } from '../services/cloudinary';
import { soundEngine } from '../services/soundEffects';
import { Volume2, VolumeX } from 'lucide-react';
import IndianCurrencyDisplay from '../components/IndianCurrencyDisplay';
import { formatIndianCurrencyWords } from '../utils/currencyUtils';
import { calculateTeamMaxBid } from '../utils/auctionUtils';

const getTeamInitials = (name) => {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return words.map(w => w.charAt(0)).join('').toUpperCase();
};

const getPlayerInitials = (p) => {
  if (!p) return '';
  return ((p.first_name?.charAt(0) || '') + (p.last_name?.charAt(0) || '')).toUpperCase();
};

const LiveAuctionPage = () => {
    const isAuthenticated = localStorage.getItem('cap_admin_auth') === 'true';
    const [searchParams] = useSearchParams();
    const auctionCode = searchParams.get('code') || localStorage.getItem('cap_admin_selected_auction_code');

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('live_auction_tab') || 'bidding'); // 'bidding', 'sold', 'unsold'
    const [isMuted, setIsMuted] = useState(soundEngine.isMuted());

    const [activeAuction, setActiveAuction] = useState(null);
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [activePlayer, setActivePlayer] = useState(null);

    // Search and Filter States
    const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('live_auction_search') || '');
    const [roleFilter, setRoleFilter] = useState(() => sessionStorage.getItem('live_auction_role') || 'ALL');
    const genderParam = searchParams.get('gender');
    const initialGender = (genderParam && (genderParam.toLowerCase() === 'female' || genderParam.toLowerCase() === 'male'))
        ? (genderParam.toLowerCase() === 'female' ? 'Female' : 'Male')
        : (sessionStorage.getItem('live_auction_gender_session') || 'Male');
    const [liveGenderSession, setLiveGenderSession] = useState(initialGender); // 'Male' or 'Female'

    // Direct Custom Bidding States
    const [customBid, setCustomBid] = useState('');
    const [customBidTeam, setCustomBidTeam] = useState('');

    // Reserve Rule Enforcement State (Strict vs Flexible, persisted per auction)
    const [enforceReserveRule, setEnforceReserveRule] = useState(() => {
        return localStorage.getItem(`enforce_reserve_${auctionCode}`) !== 'false';
    });

    // Direct / Free Player Assignment States
    const [showDirectAssignModal, setShowDirectAssignModal] = useState(false);
    const [selectedAssignTeam, setSelectedAssignTeam] = useState('');
    const [assignPriceMode, setAssignPriceMode] = useState('free'); // 'free' | 'base_price'
    const [assigningPendingPlayer, setAssigningPendingPlayer] = useState(null);

    // Sold & Unsold Tab Search and Gender Filter States
    const [soldSearchTerm, setSoldSearchTerm] = useState(() => sessionStorage.getItem('live_auction_sold_search') || '');
    const [unsoldSearchTerm, setUnsoldSearchTerm] = useState(() => sessionStorage.getItem('live_auction_unsold_search') || '');
    const [soldGenderFilter, setSoldGenderFilter] = useState(() => sessionStorage.getItem('live_auction_sold_gender') || 'ALL');
    const [unsoldGenderFilter, setUnsoldGenderFilter] = useState(() => sessionStorage.getItem('live_auction_unsold_gender') || 'ALL');

    useEffect(() => { sessionStorage.setItem('live_auction_search', searchTerm); }, [searchTerm]);
    useEffect(() => { sessionStorage.setItem('live_auction_role', roleFilter); }, [roleFilter]);
    useEffect(() => { sessionStorage.setItem('live_auction_gender_session', liveGenderSession); }, [liveGenderSession]);
    useEffect(() => { sessionStorage.setItem('live_auction_sold_search', soldSearchTerm); }, [soldSearchTerm]);
    useEffect(() => { sessionStorage.setItem('live_auction_unsold_search', unsoldSearchTerm); }, [unsoldSearchTerm]);
    useEffect(() => { sessionStorage.setItem('live_auction_sold_gender', soldGenderFilter); }, [soldGenderFilter]);
    useEffect(() => { sessionStorage.setItem('live_auction_unsold_gender', unsoldGenderFilter); }, [unsoldGenderFilter]);
    useEffect(() => { sessionStorage.setItem('live_auction_tab', activeTab); }, [activeTab]);

    useEffect(() => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        fetchData();

        // Real-time subscription for bidding updates
        const subscription = supabase
            .channel('auction_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_players' }, payload => {
                const { eventType, new: updatedPlayer, old: oldPlayer } = payload;
                if (
                    eventType === 'UPDATE' &&
                    updatedPlayer &&
                    updatedPlayer.auction_status === 'active' &&
                    oldPlayer &&
                    oldPlayer.auction_status === 'active'
                ) {
                    // Update active player's bid details locally without fetching all players
                    setActivePlayer(prev => {
                        if (prev && prev.id === updatedPlayer.id) {
                            return {
                                ...prev,
                                current_bid_price: updatedPlayer.current_bid_price,
                                current_bid_team_id: updatedPlayer.current_bid_team_id,
                                previous_bid_price: updatedPlayer.previous_bid_price,
                                previous_bid_team_id: updatedPlayer.previous_bid_team_id
                            };
                        }
                        return prev;
                    });
                    // Also update in main players list
                    setPlayers(prevPlayers => {
                        return prevPlayers.map(p => {
                            if (p.id === updatedPlayer.id) {
                                return {
                                    ...p,
                                    current_bid_price: updatedPlayer.current_bid_price,
                                    current_bid_team_id: updatedPlayer.current_bid_team_id,
                                    previous_bid_price: updatedPlayer.previous_bid_price,
                                    previous_bid_team_id: updatedPlayer.previous_bid_team_id
                                };
                            }
                            return p;
                        });
                    });
                } else {
                    fetchData(); // Sync lists for other changes (status, team assignment, etc.)
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [isAuthenticated, auctionCode]);

    const fetchData = async () => {
        try {
            if (!auctionCode) {
                setLoading(false);
                return;
            }

            // Fetch Active Auction by Code
            const { data: auctionData, error: auctionError } = await supabase
                .from('auctions')
                .select('*')
                .eq('auction_code', auctionCode)
                .maybeSingle();

            if (auctionError && auctionError.code !== 'PGRST116') throw auctionError;
            setActiveAuction(auctionData);

            if (auctionData) {
                // Fetch Teams
                const { data: tData } = await supabase.from('auction_teams').select('*').eq('auction_id', auctionData.id);
                setTeams(tData || []);

                // Fetch All Auction Players (to find active and sold)
                const { data: apData } = await supabase
                    .from('auction_players')
                    .select('*, players(*)')
                    .eq('auction_id', auctionData.id)
                    .eq('approval_status', 'approved');

                // Sort by player_number ascending, putting null player_numbers at the end
                const sortedPlayers = (apData || []).sort((a, b) => {
                    const numA = a.player_number != null ? a.player_number : Infinity;
                    const numB = b.player_number != null ? b.player_number : Infinity;
                    if (numA !== numB) return numA - numB;
                    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
                });
                setPlayers(sortedPlayers);

                // Find currently active player
                const currentActive = sortedPlayers?.find(p => p.auction_status === 'active');
                setActivePlayer(currentActive || null);
                if (currentActive?.players?.gender) {
                    const pGender = currentActive.players.gender.trim().toLowerCase();
                    if (pGender === 'female') setLiveGenderSession('Female');
                    else if (pGender === 'male') setLiveGenderSession('Male');
                }
            }
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    const startAuctionForPlayer = async (auctionPlayerId) => {
        try {
            setActionLoading(true);

            // Check if any other player is active
            if (activePlayer) {
                alert("Another player is already active. Please finish that auction first.");
                return;
            }

            const { error } = await supabase
                .from('auction_players')
                .update({
                    auction_status: 'active',
                    current_bid_price: activeAuction.base_price,
                    current_bid_team_id: null
                })
                .eq('id', auctionPlayerId);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            alert("Failed to start auction");
        } finally {
            setActionLoading(false);
        }
    };

    const placeBid = async (teamId) => {
        if (!activePlayer || actionLoading) return;

        try {
            setActionLoading(true);

            // Calculate next bid
            const basePrice = activeAuction?.base_price || 0;
            const currentBid = activePlayer.current_bid_price || 0;
            let nextBid = 0;

            if (!activePlayer.current_bid_team_id) {
                nextBid = basePrice;
            } else {
                nextBid = currentBid + basePrice;
            }

            // Check max players & max allowed bid for this team
            const maxPlayers = activeAuction?.max_players || 11;
            const targetTeam = teams.find(t => t.id === teamId);
            const teamPlayers = players.filter(p => p.team_id === teamId && p.id !== activePlayer.id);

            const isAlreadyInTeam = activePlayer.team_id === teamId;
            if (!isAlreadyInTeam && teamPlayers.length >= maxPlayers) {
                alert(`Cannot place bid! ${targetTeam?.team_name || 'Team'} has already reached the maximum squad limit of ${maxPlayers} players.`);
                return;
            }

            // Calculate max allowed bid using reserve rule
            const { maxBid, futureSlots, reserveNeeded } = calculateTeamMaxBid(targetTeam, activeAuction, teamPlayers, enforceReserveRule);

            if (nextBid > maxBid) {
                const reserveMsg = enforceReserveRule
                    ? `\n\nRule: Team must reserve ₹${reserveNeeded.toLocaleString('en-IN')} to buy remaining ${futureSlots} players at base price ₹${basePrice.toLocaleString('en-IN')}. (You can toggle Reserve Lock OFF in the top toolbar if not enforcing this).`
                    : '';
                alert(`Cannot place bid of ₹${nextBid.toLocaleString('en-IN')}!\n\nMax allowed bid for "${targetTeam?.team_name || 'Team'}" is ₹${maxBid.toLocaleString('en-IN')}.${reserveMsg}`);
                return;
            }

            const { error } = await supabase
                .from('auction_players')
                .update({
                    current_bid_price: nextBid,
                    current_bid_team_id: teamId,
                    previous_bid_price: activePlayer.current_bid_price || 0,
                    previous_bid_team_id: activePlayer.current_bid_team_id || null
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            soundEngine.playBidChime();
            
            // Update activePlayer and players array locally for immediate reactivity
            setActivePlayer(prev => ({
                ...prev,
                current_bid_price: nextBid,
                current_bid_team_id: teamId,
                previous_bid_price: prev.current_bid_price || 0,
                previous_bid_team_id: prev.current_bid_team_id || null
            }));
            setPlayers(prevPlayers => prevPlayers.map(p => {
                if (p.id === activePlayer.id) {
                    return {
                        ...p,
                        current_bid_price: nextBid,
                        current_bid_team_id: teamId,
                        previous_bid_price: activePlayer.current_bid_price || 0,
                        previous_bid_team_id: activePlayer.current_bid_team_id || null
                    };
                }
                return p;
            }));
        } catch (err) {
            alert("Failed to place bid");
        } finally {
            setActionLoading(false);
        }
    };

    const placeCustomBid = async (e) => {
        if (e) e.preventDefault();
        if (!activePlayer || actionLoading) return;
        if (!customBid || !customBidTeam) {
            alert("Please enter a bid amount and select a team.");
            return;
        }

        const bidAmount = parseInt(customBid, 10);
        if (isNaN(bidAmount)) {
            alert("Please enter a valid number for bid amount.");
            return;
        }

        if (bidAmount < 0) {
            alert("Bid amount must be a positive number.");
            return;
        }

        // Check max players & max allowed bid
        const maxPlayers = activeAuction?.max_players || 11;
        const teamId = customBidTeam;
        const targetTeam = teams.find(t => String(t.id) === String(teamId));
        if (!targetTeam) {
            alert("Selected team was not found.");
            return;
        }

        const teamPlayers = players.filter(p => String(p.team_id) === String(targetTeam.id) && p.id !== activePlayer.id);

        const isAlreadyInTeam = activePlayer.team_id === targetTeam.id;
        if (!isAlreadyInTeam && teamPlayers.length >= maxPlayers) {
            alert(`Cannot place bid! ${targetTeam.team_name} has already reached the maximum squad limit of ${maxPlayers} players.`);
            return;
        }

        // Calculate max allowed bid using reserve rule
        const { maxBid, futureSlots, reserveNeeded } = calculateTeamMaxBid(targetTeam, activeAuction, teamPlayers, enforceReserveRule);
        const basePrice = activeAuction?.base_price || 0;

        if (bidAmount > maxBid) {
            const reserveMsg = enforceReserveRule
                ? `\n\nRule: Team must reserve ₹${reserveNeeded.toLocaleString('en-IN')} to buy remaining ${futureSlots} players at base price ₹${basePrice.toLocaleString('en-IN')}. (You can toggle Reserve Lock OFF in the top toolbar if not enforcing this).`
                : '';
            alert(`Cannot place custom bid of ₹${bidAmount.toLocaleString('en-IN')}!\n\nMax allowed bid for "${targetTeam.team_name}" is ₹${maxBid.toLocaleString('en-IN')}.${reserveMsg}`);
            return;
        }

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({
                    current_bid_price: bidAmount,
                    current_bid_team_id: targetTeam.id,
                    previous_bid_price: activePlayer.current_bid_price || 0,
                    previous_bid_team_id: activePlayer.current_bid_team_id || null
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            soundEngine.playBidChime();

            // Update activePlayer and players array locally for immediate reactivity
            setActivePlayer(prev => ({
                ...prev,
                current_bid_price: bidAmount,
                current_bid_team_id: targetTeam.id,
                previous_bid_price: prev.current_bid_price || 0,
                previous_bid_team_id: prev.current_bid_team_id || null
            }));
            setPlayers(prevPlayers => prevPlayers.map(p => {
                if (p.id === activePlayer.id) {
                    return {
                        ...p,
                        current_bid_price: bidAmount,
                        current_bid_team_id: targetTeam.id,
                        previous_bid_price: activePlayer.current_bid_price || 0,
                        previous_bid_team_id: activePlayer.current_bid_team_id || null
                    };
                }
                return p;
            }));

            // Reset form
            setCustomBid('');
            setCustomBidTeam('');
        } catch (err) {
            alert("Failed to place custom bid");
        } finally {
            setActionLoading(false);
        }
    };

    const finalizeDirectAssign = async (teamId, priceMode = 'free') => {
        if (!activePlayer || actionLoading) return;
        const targetTeam = teams.find(t => String(t.id) === String(teamId));
        if (!targetTeam) {
            alert("Please choose a team to receive this player.");
            return;
        }

        const maxPlayers = activeAuction?.max_players || 11;
        const teamPlayers = players.filter(p => String(p.team_id) === String(targetTeam.id) && p.id !== activePlayer.id);
        if (teamPlayers.length >= maxPlayers) {
            alert(`Cannot assign player! ${targetTeam.team_name} has already reached the maximum squad limit of ${maxPlayers} players.`);
            return;
        }

        const basePrice = activeAuction?.base_price || 0;
        const isBasePrice = priceMode === 'base_price';
        const finalPrice = isBasePrice ? basePrice : 0;

        // If Base Price mode, check team purse
        const maxBudget = activeAuction?.max_budget || 0;
        const spent = teamPlayers.reduce((acc, p) => acc + (p.sold_price || 0), 0);
        const remainingPurse = maxBudget > 0 ? (maxBudget - spent) : Infinity;

        if (isBasePrice && maxBudget > 0 && remainingPurse < basePrice) {
            alert(`Cannot assign at Base Price! ${targetTeam.team_name} only has ₹${remainingPurse.toLocaleString('en-IN')} remaining, but base price is ₹${basePrice.toLocaleString('en-IN')}.`);
            return;
        }

        const playerName = `${activePlayer.players?.first_name || ''} ${activePlayer.players?.last_name || ''}`.trim();
        const confirmMsg = isBasePrice
            ? `Assign ${playerName} to "${targetTeam.team_name}" at BASE PRICE (₹${basePrice.toLocaleString('en-IN')})?\n\nThis will add them to the squad and deduct ₹${basePrice.toLocaleString('en-IN')} from their purse.`
            : `Give ${playerName} to "${targetTeam.team_name}" for FREE (₹0)?\n\nThis will add them to the squad at ₹0 cost without deducting purse.`;

        if (!window.confirm(confirmMsg)) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({
                    auction_status: 'sold',
                    team_id: targetTeam.id,
                    sold_price: finalPrice,
                    current_bid_price: 0,
                    current_bid_team_id: null,
                    previous_bid_price: 0,
                    previous_bid_team_id: null
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            soundEngine.playSoldGavelSound();
            setShowDirectAssignModal(false);
            setSelectedAssignTeam('');
            await fetchData();
        } catch (err) {
            console.error("Direct player assignment failed:", err);
            alert("Failed to assign player.");
        } finally {
            setActionLoading(false);
        }
    };

    const assignPendingPlayerDirect = async (targetPlayer, teamId, priceMode = 'free') => {
        if (!targetPlayer || actionLoading) return;
        const targetTeam = teams.find(t => String(t.id) === String(teamId));
        if (!targetTeam) {
            alert("Please choose a team.");
            return;
        }

        const maxPlayers = activeAuction?.max_players || 11;
        const teamPlayers = players.filter(p => String(p.team_id) === String(targetTeam.id));
        if (teamPlayers.length >= maxPlayers) {
            alert(`Cannot assign player! ${targetTeam.team_name} has already reached the maximum squad limit of ${maxPlayers} players.`);
            return;
        }

        const basePrice = activeAuction?.base_price || 0;
        const isBasePrice = priceMode === 'base_price';
        const finalPrice = isBasePrice ? basePrice : 0;

        const maxBudget = activeAuction?.max_budget || 0;
        const spent = teamPlayers.reduce((acc, p) => acc + (p.sold_price || 0), 0);
        const remainingPurse = maxBudget > 0 ? (maxBudget - spent) : Infinity;

        if (isBasePrice && maxBudget > 0 && remainingPurse < basePrice) {
            alert(`Cannot assign at Base Price! ${targetTeam.team_name} only has ₹${remainingPurse.toLocaleString('en-IN')} remaining, but base price is ₹${basePrice.toLocaleString('en-IN')}.`);
            return;
        }

        const playerName = `${targetPlayer.players?.first_name || ''} ${targetPlayer.players?.last_name || ''}`.trim();
        const confirmMsg = isBasePrice
            ? `Assign ${playerName} to "${targetTeam.team_name}" at BASE PRICE (₹${basePrice.toLocaleString('en-IN')})?\n\nThis will directly add them to the squad and deduct ₹${basePrice.toLocaleString('en-IN')} from their purse.`
            : `Give ${playerName} to "${targetTeam.team_name}" for FREE (₹0)?\n\nThis will directly add them to the squad at ₹0 cost without running an auction.`;

        if (!window.confirm(confirmMsg)) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({
                    auction_status: 'sold',
                    team_id: targetTeam.id,
                    sold_price: finalPrice,
                    current_bid_price: 0,
                    current_bid_team_id: null,
                    previous_bid_price: 0,
                    previous_bid_team_id: null
                })
                .eq('id', targetPlayer.id);

            if (error) throw error;
            soundEngine.playSoldGavelSound();
            setAssigningPendingPlayer(null);
            setSelectedAssignTeam('');
            await fetchData();
        } catch (err) {
            console.error("Pending player assignment failed:", err);
            alert("Failed to assign player.");
        } finally {
            setActionLoading(false);
        }
    };

    const undoLastBid = async () => {
        if (!activePlayer || actionLoading || !activePlayer.current_bid_team_id) return;
        if (!window.confirm("Undo the last bid?")) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({
                    current_bid_price: activePlayer.previous_bid_price || 0,
                    current_bid_team_id: activePlayer.previous_bid_team_id || null,
                    previous_bid_price: 0,
                    previous_bid_team_id: null
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            
            // Update activePlayer and players array locally for immediate reactivity
            setActivePlayer(prev => ({
                ...prev,
                current_bid_price: prev.previous_bid_price || 0,
                current_bid_team_id: prev.previous_bid_team_id || null,
                previous_bid_price: 0,
                previous_bid_team_id: null
            }));
            setPlayers(prevPlayers => prevPlayers.map(p => {
                if (p.id === activePlayer.id) {
                    return {
                        ...p,
                        current_bid_price: activePlayer.previous_bid_price || 0,
                        current_bid_team_id: activePlayer.previous_bid_team_id || null,
                        previous_bid_price: 0,
                        previous_bid_team_id: null
                    };
                }
                return p;
            }));
        } catch (err) {
            console.error(err);
            alert("Failed to undo bid.");
        } finally {
            setActionLoading(false);
        }
    };

    const cancelActiveAuction = async () => {
        if (!activePlayer || actionLoading) return;
        if (!window.confirm(`Stop auction for ${activePlayer.players.first_name} and return them to pending list?`)) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({
                    auction_status: 'pending',
                    team_id: null,
                    sold_price: 0,
                    current_bid_price: 0,
                    current_bid_team_id: null,
                    previous_bid_price: 0,
                    previous_bid_team_id: null
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to cancel auction.");
        } finally {
            setActionLoading(false);
        }
    };

    const finalizeSold = async () => {
        if (!activePlayer || !activePlayer.current_bid_team_id) return;

        const maxPlayers = activeAuction?.max_players || 11;
        const targetTeam = teams.find(t => String(t.id) === String(activePlayer.current_bid_team_id));
        const teamPlayers = players.filter(p => String(p.team_id) === String(activePlayer.current_bid_team_id));

        const isAlreadyInTeam = activePlayer.team_id === activePlayer.current_bid_team_id;
        if (!isAlreadyInTeam && teamPlayers.length >= maxPlayers) {
            alert(`Cannot sell player! ${targetTeam?.team_name || 'Team'} has already reached the maximum squad limit of ${maxPlayers} players.`);
            return;
        }

        if (!window.confirm(`Mark ${activePlayer.players.first_name} as SOLD for ₹${activePlayer.current_bid_price}?`)) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({
                    auction_status: 'sold',
                    team_id: activePlayer.current_bid_team_id,
                    sold_price: activePlayer.current_bid_price
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            soundEngine.playSoldGavelSound();
            await fetchData();
        } catch (err) {
            alert("Failed to finalize auction");
        } finally {
            setActionLoading(false);
        }
    };

    const markUnsold = async () => {
        if (!activePlayer) return;
        if (!window.confirm(`Mark ${activePlayer.players.first_name} as UNSOLD?`)) return;

        try {
            setActionLoading(true);
            const ownerTeam = activePlayer.owner_team_id || activePlayer.previous_bid_team_id;
            const { error } = await supabase
                .from('auction_players')
                .update({
                    auction_status: 'unsold',
                    team_id: activePlayer.is_owner ? ownerTeam : null,
                    sold_price: 0,
                    current_bid_price: 0,
                    current_bid_team_id: null
                })
                .eq('id', activePlayer.id);

            if (error) throw error;
            soundEngine.playUnsoldBuzzerSound();
            await fetchData();
        } catch (err) {
            alert("Failed to mark as unsold");
        } finally {
            setActionLoading(false);
        }
    };

    const revertPlayer = async (player) => {
        if (!window.confirm(`Are you sure you want to REVERT ${player.players.first_name} to pending status? This will unassign them from their team and refund the ₹${player.sold_price?.toLocaleString()}.`)) return;

        try {
            setActionLoading(true);
            const ownerTeam = player.owner_team_id || player.previous_bid_team_id;
            const { error } = await supabase
                .from('auction_players')
                .update({
                    auction_status: 'pending',
                    team_id: player.is_owner ? ownerTeam : null,
                    sold_price: 0,
                    current_bid_price: 0,
                    current_bid_team_id: null
                })
                .eq('id', player.id);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to revert player.");
        } finally {
            setActionLoading(false);
        }
    };

    const restartPlayer = async (player) => {
        if (!window.confirm(`Restart auction for ${player.players.first_name}? This will move them back to the pending list.`)) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({
                    auction_status: 'pending',
                    team_id: null,
                    sold_price: 0,
                    current_bid_price: 0,
                    current_bid_team_id: null
                })
                .eq('id', player.id);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to restart player.");
        } finally {
            setActionLoading(false);
        }
    };

    const restartAllUnsold = async () => {
        const unsoldOnes = players.filter(p => p.auction_status === 'unsold');
        if (unsoldOnes.length === 0) return;
        if (!window.confirm(`Are you sure you want to RESTART ALL ${unsoldOnes.length} unsold players and move them back to the pending list?`)) return;

        try {
            setActionLoading(true);
            const { error } = await supabase
                .from('auction_players')
                .update({
                    auction_status: 'pending',
                    team_id: null,
                    sold_price: 0,
                    current_bid_price: 0,
                    current_bid_team_id: null
                })
                .in('id', unsoldOnes.map(p => p.id));

            if (error) throw error;
            await fetchData();
            alert("All unsold players moved back to pending.");
        } catch (err) {
            console.error(err);
            alert("Failed to restart all unsold players.");
        } finally {
            setActionLoading(false);
        }
    };

    if (!isAuthenticated) return <Navigate to="/admin" replace />;
    if (!auctionCode || (!loading && !activeAuction)) return <Navigate to="/admin" replace />;
    if (loading) return <Loader message="OPENING AUCTION STADIUM..." />;

    const pendingPlayers = players.filter(p => {
        const matchesStatus = !['sold', 'unsold', 'active'].includes(p.auction_status) && !p.is_icon && !p.is_captain;
        const lowSearch = searchTerm.toLowerCase();
        const matchesSearch = (p.players.first_name + ' ' + p.players.last_name).toLowerCase().includes(lowSearch) || 
                              (p.player_number && p.player_number.toString().includes(searchTerm));
        const matchesRole = roleFilter === 'ALL' || p.players.player_role === roleFilter;
        const matchesGender = !activeAuction?.is_separate_gender || (p.players?.gender || '').toLowerCase() === liveGenderSession.toLowerCase();
        return matchesStatus && matchesSearch && matchesRole && matchesGender;
    });
    const soldPlayers = players.filter(p => {
        if (p.auction_status !== 'sold' || p.is_icon || p.is_captain) return false;

        // Gender filter: respect explicit filter or separate gender session
        const pGender = (p.players?.gender || 'Male').toLowerCase();
        let matchesGender = true;
        if (soldGenderFilter !== 'ALL') {
            matchesGender = pGender === soldGenderFilter.toLowerCase();
        } else if (activeAuction?.is_separate_gender) {
            matchesGender = pGender === liveGenderSession.toLowerCase();
        }

        // Search filter
        const lowSearch = soldSearchTerm.toLowerCase().trim();
        const team = teams.find(t => t.id === p.team_id);
        const fullName = `${p.players?.first_name || ''} ${p.players?.last_name || ''}`.toLowerCase();
        const numStr = p.player_number != null ? p.player_number.toString() : '';
        const teamNameStr = (team?.team_name || '').toLowerCase();
        const matchesSearch = !lowSearch || fullName.includes(lowSearch) || numStr.includes(lowSearch) || teamNameStr.includes(lowSearch);

        return matchesGender && matchesSearch;
    });

    const unsoldPlayers = players.filter(p => {
        if (p.auction_status !== 'unsold') return false;

        // Gender filter
        const pGender = (p.players?.gender || 'Male').toLowerCase();
        let matchesGender = true;
        if (unsoldGenderFilter !== 'ALL') {
            matchesGender = pGender === unsoldGenderFilter.toLowerCase();
        } else if (activeAuction?.is_separate_gender) {
            matchesGender = pGender === liveGenderSession.toLowerCase();
        }

        // Search filter
        const lowSearch = unsoldSearchTerm.toLowerCase().trim();
        const fullName = `${p.players?.first_name || ''} ${p.players?.last_name || ''}`.toLowerCase();
        const numStr = p.player_number != null ? p.player_number.toString() : '';
        const roleStr = (p.players?.player_role || '').toLowerCase();
        const stateStr = (p.players?.state || '').toLowerCase();
        const matchesSearch = !lowSearch || fullName.includes(lowSearch) || numStr.includes(lowSearch) || roleStr.includes(lowSearch) || stateStr.includes(lowSearch);

        return matchesGender && matchesSearch;
    });

    // Display teams filtered by session if separate gender auction mode is enabled
    const displayTeams = teams.filter(t => {
        if (!activeAuction?.is_separate_gender) return true;
        const tGen = (t.gender || 'Male').toLowerCase();
        return tGen === liveGenderSession.toLowerCase() || tGen === 'both';
    });

    // Get unique roles for filter
    const roles = ['ALL', ...new Set(players.map(p => p.players.player_role).filter(Boolean))];
    const winningTeam = activePlayer?.current_bid_team_id ? teams.find(t => t.id === activePlayer.current_bid_team_id) : null;

    return (
        <div className="flex-col min-h-screen">
            <div className="spotlight"></div>
            <PageHeader title="Live Auction Control" showLogos={false} />

            <main className="container-fluid" style={{ flex: 1, padding: '1.5rem 2rem 4rem', zIndex: 1, position: 'relative', width: '100%', maxWidth: '100%' }}>

                {/* Separate Gender Session Switcher (if enabled for this auction) */}
                {activeAuction?.is_separate_gender && (
                    <div style={{
                        background: 'rgba(0,0,0,0.5)',
                        padding: '1rem 1.5rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,215,0,0.3)',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>⚡</span>
                            <div>
                                <div style={{ color: 'var(--accent-gold)', fontWeight: 'bold', fontSize: '0.95rem' }}>
                                    SEPARATE GENDER AUCTION SESSION
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    Switch session to manage Male or Female bidding & teams separately
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                            <button
                                type="button"
                                onClick={() => setLiveGenderSession('Male')}
                                className="btn"
                                style={{
                                    padding: '0.6rem 1.25rem',
                                    fontWeight: 'bold',
                                    borderRadius: '30px',
                                    background: liveGenderSession === 'Male' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'rgba(255,255,255,0.08)',
                                    color: '#fff',
                                    border: liveGenderSession === 'Male' ? '2px solid #60a5fa' : '1px solid var(--glass-border)',
                                    boxShadow: liveGenderSession === 'Male' ? '0 0 15px rgba(59,130,246,0.5)' : 'none'
                                }}
                            >
                                ♂ MALE SESSION ({teams.filter(t => (t.gender || 'Male').toLowerCase() === 'male').length} Teams)
                            </button>
                            <button
                                type="button"
                                onClick={() => setLiveGenderSession('Female')}
                                className="btn"
                                style={{
                                    padding: '0.6rem 1.25rem',
                                    fontWeight: 'bold',
                                    borderRadius: '30px',
                                    background: liveGenderSession === 'Female' ? 'linear-gradient(135deg, #ec4899, #be185d)' : 'rgba(255,255,255,0.08)',
                                    color: '#fff',
                                    border: liveGenderSession === 'Female' ? '2px solid #f472b6' : '1px solid var(--glass-border)',
                                    boxShadow: liveGenderSession === 'Female' ? '0 0 15px rgba(236,72,153,0.5)' : 'none'
                                }}
                            >
                                ♀ FEMALE SESSION ({teams.filter(t => (t.gender || 'Male').toLowerCase() === 'female').length} Teams)
                            </button>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <button
                        onClick={() => setActiveTab('bidding')}
                        className={`btn ${activeTab === 'bidding' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.6rem 1.5rem', background: activeTab === 'bidding' ? 'var(--accent-gold)' : 'transparent' }}
                    >
                        LIVE BIDDING
                    </button>
                    <button
                        onClick={() => setActiveTab('sold')}
                        className={`btn ${activeTab === 'sold' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.6rem 1.5rem', background: activeTab === 'sold' ? 'var(--accent-gold)' : 'transparent' }}
                    >
                        SOLD PLAYERS ({soldPlayers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('unsold')}
                        className={`btn ${activeTab === 'unsold' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.6rem 1.5rem', background: activeTab === 'unsold' ? 'var(--accent-gold)' : 'transparent' }}
                    >
                        UNSOLD ({unsoldPlayers.length})
                    </button>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                            type="button"
                            onClick={() => {
                                const nextVal = !enforceReserveRule;
                                setEnforceReserveRule(nextVal);
                                if (auctionCode) {
                                    localStorage.setItem(`enforce_reserve_${auctionCode}`, String(nextVal));
                                }
                            }}
                            className="btn btn-outline"
                            style={{
                                padding: '0.55rem 0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontSize: '0.82rem',
                                fontWeight: 'bold',
                                borderRadius: '8px',
                                borderColor: enforceReserveRule ? 'var(--accent-green)' : '#f59e0b',
                                color: enforceReserveRule ? 'var(--accent-green)' : '#f59e0b',
                                background: enforceReserveRule ? 'rgba(57, 255, 20, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                                cursor: 'pointer'
                            }}
                            title={enforceReserveRule ? "Strict Reserve Mode: Teams must reserve base price for all remaining future slots. Click to switch to Flexible mode." : "Flexible Mode: Teams can bid full remaining purse without base price reserve lock. Click to switch to Strict mode."}
                        >
                            {enforceReserveRule ? '🛡️ Reserve Lock: ON (Strict)' : '⚡ Reserve Lock: OFF (Flexible)'}
                        </button>
                        <button
                          onClick={() => setIsMuted(soundEngine.toggleMute())}
                          className="btn btn-outline"
                          style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
                          title={isMuted ? "Unmute Sound Effects" : "Mute Sound Effects"}
                        >
                          {isMuted ? <VolumeX size={16} color="#ef4444" /> : <Volume2 size={16} color="var(--accent-green)" />}
                          {isMuted ? 'Muted' : 'Sound ON'}
                        </button>
                        <Link to={`/draw?code=${auctionCode}`} className="btn" style={{ padding: '0.6rem 1rem', background: 'var(--accent-gold)', color: '#000', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>🎰 Random Draw</Link>
                        <Link to="/team-details" className="btn btn-outline" style={{ padding: '0.6rem 1rem' }}>Team Squad & Purse</Link>
                        <Link to="/admin" className="btn btn-outline" style={{ padding: '0.6rem 1rem' }}>Back to Admin</Link>
                    </div>
                </div>

                {activeTab === 'bidding' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>

                        {/* Center Stage: Active Bidding */}
                        <div className="glass-panel" style={{ padding: '2.5rem', minHeight: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            {!activePlayer ? (
                                <div style={{ color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏏</div>
                                    <h3>No Active Auction</h3>
                                    <p>Select a player from the "Pending Players" list on the right to start bidding.</p>
                                </div>
                            ) : (
                                <div style={{ width: '100%' }}>
                                    <div className="badge badge-success" style={{ marginBottom: '2rem', fontSize: '1rem', padding: '0.5rem 1.5rem', borderRadius: '50px', background: 'var(--accent-gold)', color: '#000', fontWeight: 'bold' }}>LIVE BIDDING</div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3rem', marginBottom: '3rem' }}>
                                        <div style={{ position: 'relative' }}>
                                            {activePlayer.players.photo_url ? (
                                                <img
                                                    src={getOptimizedImageUrl(activePlayer.players.photo_url, 500)}
                                                    alt="Player"
                                                    style={{ width: 180, height: 220, objectFit: 'contain', objectPosition: 'top center', backgroundColor: '#090d16', borderRadius: '15px', border: '4px solid var(--accent-gold)', boxShadow: '0 0 30px rgba(255,215,0,0.3)' }}
                                                />
                                            ) : (
                                                <div style={{ width: 180, height: 220, borderRadius: '15px', border: '4px solid var(--accent-gold)', background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(0,0,0,0.4))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-gold)', boxShadow: '0 0 30px rgba(255,215,0,0.3)' }}>
                                                    {getPlayerInitials(activePlayer.players)}
                                                </div>
                                            )}
                                            <div style={{ position: 'absolute', bottom: -15, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-gold)', color: '#000', padding: '0.3rem 1rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                {activePlayer.players.player_role}
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'left' }}>
                                            <h1 style={{ fontSize: '3rem', margin: 0, color: 'var(--text-main)' }}>
                                                {activePlayer.player_number && <span style={{ color: 'var(--accent-gold)', marginRight: '1rem' }}>#{activePlayer.player_number}</span>}
                                                {activePlayer.players.first_name} {activePlayer.players.last_name}
                                            </h1>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', margin: '0.4rem 0' }}>
                                              Base Price: ₹{(activeAuction.base_price || 0).toLocaleString('en-IN')}
                                              {activePlayer.players.gender && (
                                                <span style={{ marginLeft: '1rem', color: activePlayer.players.gender.toLowerCase() === 'female' ? '#f472b6' : '#60a5fa', fontWeight: 'bold' }}>
                                                  ({activePlayer.players.gender})
                                                </span>
                                              )}
                                            </p>

                                            <div style={{ marginTop: '2rem', background: 'rgba(255,215,0,0.1)', padding: '1.5rem', borderRadius: '10px', border: '1px solid var(--accent-gold)', overflow: 'hidden' }}>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '2px' }}>Current Highest Bid</div>
                                                {(() => {
                                                    const bidVal = activePlayer.current_bid_price || activeAuction.base_price || 0;
                                                    return (
                                                        <div style={{ margin: '0.6rem 0 0.8rem 0' }}>
                                                            <IndianCurrencyDisplay 
                                                                amount={bidVal} 
                                                                size="2xl" 
                                                                color="var(--text-main)" 
                                                                subtextColor="var(--accent-gold)" 
                                                            />
                                                        </div>
                                                    );
                                                })()}
                                                <div style={{ fontSize: '1.1rem', color: winningTeam ? 'var(--accent-green)' : '#ff4444' }}>
                                                    {winningTeam ? `By: ${winningTeam.team_name}` : 'No Bids Yet'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Top Action Controls Bar */}
                                    <div style={{
                                        background: 'rgba(15, 23, 42, 0.95)',
                                        border: '1px solid rgba(255, 215, 0, 0.3)',
                                        borderRadius: '12px',
                                        padding: '1rem 1.5rem',
                                        margin: '1.5rem 0',
                                        display: 'flex',
                                        gap: '1rem',
                                        justify: 'center',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        boxShadow: '0 8px 25px rgba(0,0,0,0.5)'
                                    }}>
                                        <button
                                            onClick={undoLastBid}
                                            disabled={actionLoading || !activePlayer.current_bid_team_id}
                                            className="btn btn-outline"
                                            style={{ padding: '0.7rem 1.5rem', color: '#f59e0b', borderColor: '#f59e0b', fontSize: '1rem', fontWeight: 'bold' }}
                                        >
                                            ↩️ UNDO BID
                                        </button>
                                        <button
                                            onClick={finalizeSold}
                                            disabled={actionLoading || !activePlayer.current_bid_team_id}
                                            className="btn btn-primary"
                                            style={{ padding: '0.7rem 2.2rem', background: '#10b981', borderColor: '#10b981', fontSize: '1.05rem', fontWeight: 'bold' }}
                                        >
                                            🔨 SOLD
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedAssignTeam(activePlayer.current_bid_team_id || '');
                                                setAssignPriceMode('free');
                                                setShowDirectAssignModal(true);
                                            }}
                                            disabled={actionLoading || !activePlayer}
                                            className="btn"
                                            style={{ padding: '0.7rem 1.6rem', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#fff', fontSize: '1rem', fontWeight: 'bold', border: '1px solid #c084fc' }}
                                            title="Assign this active player directly to a team (Free ₹0 or Base Price)"
                                        >
                                            ⚡ DIRECT ASSIGN
                                        </button>
                                        <button
                                            onClick={markUnsold}
                                            disabled={actionLoading}
                                            className="btn"
                                            style={{ padding: '0.7rem 1.6rem', background: '#ef4444', color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}
                                        >
                                            ❌ UNSOLD
                                        </button>
                                        <button
                                            onClick={cancelActiveAuction}
                                            disabled={actionLoading}
                                            className="btn btn-outline"
                                            style={{ padding: '0.7rem 1.4rem', color: '#94a3b8', borderColor: '#94a3b8', fontSize: '0.95rem' }}
                                        >
                                            ⏹️ CANCEL
                                        </button>
                                    </div>

                                    {/* Bidding Controls */}
                                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                                        {/* Custom Direct Bid Form */}
                                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-color)', borderRadius: '10px', padding: '1.5rem', marginBottom: '2rem', textAlign: 'left' }}>
                                            <h4 style={{ color: 'var(--accent-gold)', marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                ⚡ DIRECT CUSTOM BID
                                            </h4>
                                            <form onSubmit={placeCustomBid} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
                                                <div style={{ flex: '1 1 200px' }}>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Bid Amount (₹)</label>
                                                    <input 
                                                        type="number" 
                                                        placeholder="e.g. 50000" 
                                                        value={customBid}
                                                        onChange={e => setCustomBid(e.target.value)}
                                                        className="form-input" 
                                                        style={{ width: '100%', padding: '0.6rem' }}
                                                        min="0"
                                                        required
                                                    />
                                                </div>
                                                <div style={{ flex: '1 1 200px' }}>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Select Bidding Team</label>
                                                    <select 
                                                        value={customBidTeam}
                                                        onChange={e => setCustomBidTeam(e.target.value)}
                                                        className="form-select"
                                                        style={{ width: '100%', padding: '0.6rem' }}
                                                        required
                                                    >
                                                        <option value="">-- Choose Team --</option>
                                                        {displayTeams.map(team => (
                                                            <option key={team.id} value={team.id}>{team.team_name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button 
                                                    type="submit" 
                                                    disabled={actionLoading || !customBid || !customBidTeam}
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.6rem 2rem', height: 'fit-content', background: 'var(--accent-gold)', color: '#000', fontWeight: 'bold' }}
                                                >
                                                    Apply Custom Bid
                                                </button>
                                            </form>
                                        </div>

                                        <h4 style={{ color: 'var(--text-muted)', marginBottom: '1.2rem', textAlign: 'left' }}>PLACE BID FOR:</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                                            {displayTeams.map(team => {
                                                 const maxPlayers = activeAuction?.max_players || 11;
                                                 const teamSquad = players.filter(p => p.team_id === team.id);
                                                 const teamSquadExcludingActive = players.filter(p => p.team_id === team.id && p.id !== activePlayer?.id);
                                                 const squadCount = teamSquad.length;
                                                 const isFull = squadCount >= maxPlayers;
                                                 const isCurrentBidder = activePlayer && team.id === activePlayer.current_bid_team_id;

                                                 const maxBudget = activeAuction?.max_budget || 0;
                                                 const spent = teamSquad.reduce((acc, p) => acc + (p.sold_price || 0), 0);
                                                 const remainingPurse = maxBudget - spent;

                                                 // Max Bid calculation with enforceReserveRule
                                                 const maxBidInfo = calculateTeamMaxBid(team, activeAuction, teamSquadExcludingActive, enforceReserveRule);
                                                 const basePrice = activeAuction?.base_price || 0;
                                                 const currentBid = activePlayer?.current_bid_price || 0;
                                                 const nextBid = !activePlayer?.current_bid_team_id ? basePrice : (currentBid + basePrice);
                                                 const cannotAffordNext = !isCurrentBidder && (nextBid > maxBidInfo.maxBid);

                                                 return (
                                                     <button
                                                         key={team.id}
                                                         onClick={() => placeBid(team.id)}
                                                         disabled={actionLoading || (isFull && !isCurrentBidder) || cannotAffordNext}
                                                         className="btn btn-outline"
                                                         style={{
                                                             display: 'flex',
                                                             flexDirection: 'column',
                                                             alignItems: 'center',
                                                             gap: '0.35rem',
                                                             padding: '0.8rem 0.6rem',
                                                             position: 'relative',
                                                             borderColor: isCurrentBidder ? 'var(--accent-gold)' : isFull ? '#ef4444' : cannotAffordNext ? 'rgba(239,68,68,0.5)' : 'var(--border-color)',
                                                             background: isCurrentBidder ? 'rgba(255,215,0,0.15)' : isFull ? 'rgba(239,68,68,0.1)' : cannotAffordNext ? 'rgba(239,68,68,0.05)' : 'transparent',
                                                             opacity: (isFull && !isCurrentBidder) || cannotAffordNext ? 0.65 : 1,
                                                             cursor: (isFull && !isCurrentBidder) || cannotAffordNext ? 'not-allowed' : 'pointer'
                                                         }}
                                                     >
                                                         {team.logo_url ? (
                                                             <img src={team.logo_url} alt="Logo" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                                                         ) : (
                                                             <div style={{ width: 44, height: 44, borderRadius: '6px', background: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold' }}>
                                                                 {getTeamInitials(team.team_name)}
                                                             </div>
                                                         )}
                                                         <span style={{ fontSize: '0.88rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{team.team_name}</span>
                                                         <span style={{
                                                             fontSize: '0.72rem',
                                                             fontWeight: 'bold',
                                                             padding: '0.12rem 0.45rem',
                                                             borderRadius: '4px',
                                                             background: isFull ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)',
                                                             color: isFull ? '#ef4444' : 'var(--text-muted)'
                                                         }}>
                                                             {isFull ? `FULL (${squadCount}/${maxPlayers})` : `Squad: ${squadCount}/${maxPlayers}`}
                                                         </span>
                                                         {maxBudget > 0 ? (
                                                             <>
                                                                 <span style={{
                                                                     fontSize: '0.72rem',
                                                                     fontWeight: 'bold',
                                                                     padding: '0.12rem 0.45rem',
                                                                     borderRadius: '4px',
                                                                     background: remainingPurse < 0 ? 'rgba(239,68,68,0.2)' : 'rgba(57,255,20,0.12)',
                                                                     color: remainingPurse < 0 ? '#ef4444' : 'var(--accent-green)',
                                                                     border: remainingPurse < 0 ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(57,255,20,0.3)'
                                                                 }}>
                                                                     Purse: ₹{remainingPurse.toLocaleString('en-IN')}
                                                                 </span>
                                                                 <span style={{
                                                                     fontSize: '0.72rem',
                                                                     fontWeight: 'bold',
                                                                     padding: '0.12rem 0.45rem',
                                                                     borderRadius: '4px',
                                                                     background: cannotAffordNext ? 'rgba(239,68,68,0.2)' : 'rgba(255,215,0,0.15)',
                                                                     color: cannotAffordNext ? '#ef4444' : 'var(--accent-gold)',
                                                                     border: cannotAffordNext ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,215,0,0.3)'
                                                                 }}>
                                                                     {cannotAffordNext ? `Cap: ₹${maxBidInfo.maxBid.toLocaleString('en-IN')}` : `Max Bid: ₹${maxBidInfo.maxBid.toLocaleString('en-IN')}`}
                                                                 </span>
                                                             </>
                                                         ) : (
                                                             <span style={{
                                                                 fontSize: '0.72rem',
                                                                 fontWeight: 'bold',
                                                                 padding: '0.12rem 0.45rem',
                                                                 borderRadius: '4px',
                                                                 background: 'rgba(57,255,20,0.1)',
                                                                 color: 'var(--accent-green)',
                                                                 border: '1px solid rgba(57,255,20,0.3)'
                                                             }}>
                                                                 Spent: ₹{spent.toLocaleString('en-IN')}
                                                             </span>
                                                         )}
                                                     </button>
                                                 );
                                             })}
                                        </div>

                                        <div style={{ display: 'flex', gap: '1.2rem', marginTop: '3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={undoLastBid}
                                                disabled={actionLoading || !activePlayer.current_bid_team_id}
                                                className="btn btn-outline"
                                                style={{ padding: '1rem 2rem', color: '#f59e0b', borderColor: '#f59e0b', fontSize: '1.1rem' }}
                                            >
                                                ↩️ UNDO BID
                                            </button>
                                            <button
                                                onClick={finalizeSold}
                                                disabled={actionLoading || !activePlayer.current_bid_team_id}
                                                className="btn btn-primary"
                                                style={{ padding: '1rem 3rem', background: '#10b981', borderColor: '#10b981', fontSize: '1.1rem' }}
                                            >
                                                🔨 SOLD
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedAssignTeam(activePlayer.current_bid_team_id || '');
                                                    setAssignPriceMode('free');
                                                    setShowDirectAssignModal(true);
                                                }}
                                                disabled={actionLoading || !activePlayer}
                                                className="btn"
                                                style={{ padding: '1rem 2rem', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', border: '1px solid #c084fc' }}
                                                title="Assign this active player directly to a team (Free ₹0 or Base Price)"
                                            >
                                                ⚡ DIRECT ASSIGN
                                            </button>
                                            <button
                                                onClick={markUnsold}
                                                disabled={actionLoading}
                                                className="btn"
                                                style={{ padding: '1rem 2rem', background: '#ef4444', color: '#fff', fontSize: '1.1rem' }}
                                            >
                                                ❌ UNSOLD
                                            </button>
                                            <button
                                                onClick={cancelActiveAuction}
                                                disabled={actionLoading}
                                                className="btn btn-outline"
                                                style={{ padding: '1rem 2rem', color: '#94a3b8', borderColor: '#94a3b8', fontSize: '1.1rem' }}
                                            >
                                                ⏹️ CANCEL
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Top Right Active Player Bidding Controls Box */}
                            {activePlayer && (
                                <div className="glass-panel" style={{ padding: '1.2rem', border: '2px solid var(--accent-gold)', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.95)', boxShadow: '0 8px 25px rgba(255,215,0,0.2)' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-gold)', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span>⚡ LIVE BID ACTIONS</span>
                                        <span style={{ fontSize: '0.75rem', color: '#10b981' }}>#{activePlayer.player_number || ''}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                        <button
                                            onClick={undoLastBid}
                                            disabled={actionLoading || !activePlayer.current_bid_team_id}
                                            className="btn btn-outline"
                                            style={{ padding: '0.65rem 0.6rem', color: '#f59e0b', borderColor: '#f59e0b', fontSize: '0.82rem', fontWeight: 'bold', width: '100%' }}
                                        >
                                            ↩️ UNDO BID
                                        </button>
                                        <button
                                            onClick={finalizeSold}
                                            disabled={actionLoading || !activePlayer.current_bid_team_id}
                                            className="btn btn-primary"
                                            style={{ padding: '0.65rem 0.6rem', background: '#10b981', borderColor: '#10b981', fontSize: '0.85rem', fontWeight: 'bold', width: '100%' }}
                                        >
                                            🔨 SOLD
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedAssignTeam(activePlayer.current_bid_team_id || '');
                                                setAssignPriceMode('free');
                                                setShowDirectAssignModal(true);
                                            }}
                                            disabled={actionLoading || !activePlayer}
                                            className="btn"
                                            style={{ padding: '0.65rem 0.6rem', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#fff', fontSize: '0.82rem', fontWeight: 'bold', gridColumn: 'span 2' }}
                                            title="Assign this active player directly to a team (Free ₹0 or Base Price)"
                                        >
                                            ⚡ DIRECT ASSIGN / FREE
                                        </button>
                                        <button
                                            onClick={markUnsold}
                                            disabled={actionLoading}
                                            className="btn"
                                            style={{ padding: '0.65rem 0.6rem', background: '#ef4444', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', width: '100%' }}
                                        >
                                            ❌ UNSOLD
                                        </button>
                                        <button
                                            onClick={cancelActiveAuction}
                                            disabled={actionLoading}
                                            className="btn btn-outline"
                                            style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', borderColor: '#94a3b8', fontSize: '0.82rem', width: '100%' }}
                                        >
                                            ⏹️ CANCEL
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Sidebar: Pending Players */}
                            <div className="glass-panel" style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
                            <h3 style={{ color: 'var(--accent-gold)', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>PENDING PLAYERS ({pendingPlayers.length})</h3>
                            
                            {/* Search and Filters */}
                            <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                <input 
                                    type="text" 
                                    placeholder="Search name or number..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.9rem' }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ROLE:</span>
                                    <select 
                                        value={roleFilter}
                                        onChange={(e) => setRoleFilter(e.target.value)}
                                        style={{ flex: 1, padding: '0.4rem', background: '#1a1a1a', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                                    >
                                        {roles.map(role => <option key={role} value={role}>{role}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {pendingPlayers.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No players found.</p>
                                ) : (
                                    pendingPlayers.map(p => (
                                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px' }}>
                                            <Link to={`/player/${p.players?.id || p.player_id}`} state={{ from: location.pathname + location.search }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, textDecoration: 'none', color: 'inherit' }}>
                                                {p.players.photo_url ? (
                                                    <img src={getOptimizedImageUrl(p.players.photo_url, 100)} alt="P" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'contain', backgroundColor: '#0f172a' }} />
                                                ) : (
                                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>
                                                        {getPlayerInitials(p.players)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                        {p.player_number && <span style={{ color: 'var(--accent-gold)', marginRight: '0.5rem' }}>#{p.player_number}</span>}
                                                        {p.players.first_name} {p.players.last_name}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                      {p.players.player_role}
                                                    </div>
                                                </div>
                                            </Link>
                                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                <button
                                                    onClick={() => {
                                                        setSelectedAssignTeam('');
                                                        setAssignPriceMode('free');
                                                        setAssigningPendingPlayer(p);
                                                    }}
                                                    disabled={actionLoading || activePlayer}
                                                    className="btn"
                                                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}
                                                    title="Assign this player directly to a team (Free ₹0 or Base Price)"
                                                >
                                                    ⚡ Assign
                                                </button>
                                                <button
                                                    onClick={() => startAuctionForPlayer(p.id)}
                                                    disabled={actionLoading || activePlayer}
                                                    className="btn btn-outline"
                                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                                                >
                                                    Start
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                    </div>
                ) : activeTab === 'sold' ? (
                    /* Tab 2: Sold Players List */
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 style={{ color: 'var(--accent-gold)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <span>SOLD PLAYERS REGISTRY</span>
                                    {activeAuction?.is_separate_gender && (
                                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px', background: liveGenderSession === 'Female' ? 'rgba(236,72,153,0.25)' : 'rgba(59,130,246,0.25)', color: liveGenderSession === 'Female' ? '#f472b6' : '#60a5fa', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 'bold' }}>
                                            {liveGenderSession.toUpperCase()} SESSION
                                        </span>
                                    )}
                                </h3>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                    Showing {soldPlayers.length} sold players
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                {activeAuction?.is_separate_gender && (
                                    <select
                                        value={soldGenderFilter}
                                        onChange={(e) => setSoldGenderFilter(e.target.value)}
                                        className="input"
                                        style={{ padding: '0.5rem 0.8rem', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
                                        title="Filter Sold Players by Gender"
                                    >
                                        <option value="ALL">🚻 Session: {liveGenderSession} (Default)</option>
                                        <option value="Male">♂ Male Only</option>
                                        <option value="Female">♀ Female Only</option>
                                    </select>
                                )}

                                <div style={{ position: 'relative', width: '260px' }}>
                                    <input
                                        type="text"
                                        placeholder="🔍 Search sold player or team..."
                                        value={soldSearchTerm}
                                        onChange={(e) => setSoldSearchTerm(e.target.value)}
                                        className="input"
                                        style={{ width: '100%', padding: '0.5rem 2.2rem 0.5rem 0.8rem', fontSize: '0.85rem' }}
                                    />
                                    {soldSearchTerm && (
                                        <button
                                            onClick={() => setSoldSearchTerm('')}
                                            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {soldPlayers.length === 0 ? (
                            <p className="text-muted text-center" style={{ padding: '3rem' }}>
                                {soldSearchTerm ? `No sold players matching "${soldSearchTerm}".` : 'No sold players found for this session.'}
                            </p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)', color: 'var(--accent-gold)' }}>
                                            <th style={{ padding: '1rem', width: '80px' }}>No.</th>
                                            <th style={{ padding: '1rem' }}>Player</th>
                                            <th style={{ padding: '1rem' }}>Role</th>
                                            <th style={{ padding: '1rem' }}>Sold To Team</th>
                                            <th style={{ padding: '1rem', textAlign: 'right' }}>Sold Price</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {soldPlayers.map(p => {
                                            const team = teams.find(t => t.id === p.team_id);
                                            return (
                                                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                                                    <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>#{p.player_number || '-'}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <Link to={`/player/${p.players?.id || p.player_id}`} state={{ from: location.pathname + location.search }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}>
                                                            {p.players.photo_url ? (
                                                                <img src={getOptimizedImageUrl(p.players.photo_url, 100)} alt="P" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'contain', backgroundColor: '#0f172a' }} />
                                                            ) : (
                                                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>
                                                                    {getPlayerInitials(p.players)}
                                                                </div>
                                                            )}
                                                            <div>{p.players.first_name} {p.players.last_name}</div>
                                                        </Link>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>{p.players.player_role}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            {team?.logo_url ? (
                                                                <img src={team.logo_url} alt="L" style={{ width: 25, height: 25, objectFit: 'contain' }} />
                                                            ) : team ? (
                                                                <div style={{ width: 25, height: 25, borderRadius: '4px', background: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>
                                                                    {getTeamInitials(team.team_name)}
                                                                </div>
                                                            ) : null}
                                                            {team?.team_name || 'Unknown Team'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                        {Number(p.sold_price) > 0 ? (
                                                            <IndianCurrencyDisplay amount={p.sold_price} size="sm" color="var(--accent-gold)" align="right" />
                                                        ) : (
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
                                                                🎁 FREE (₹0)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => revertPlayer(p)}
                                                            disabled={actionLoading}
                                                            className="btn btn-outline"
                                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: '#ff4444', borderColor: '#ff4444' }}
                                                        >
                                                            Revert
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Tab 3: Unsold Players List */
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 style={{ color: 'var(--accent-gold)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <span>UNSOLD PLAYERS LIST</span>
                                    {activeAuction?.is_separate_gender && (
                                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px', background: liveGenderSession === 'Female' ? 'rgba(236,72,153,0.25)' : 'rgba(59,130,246,0.25)', color: liveGenderSession === 'Female' ? '#f472b6' : '#60a5fa', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 'bold' }}>
                                            {liveGenderSession.toUpperCase()} SESSION
                                        </span>
                                    )}
                                </h3>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                    Showing {unsoldPlayers.length} unsold players
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                {activeAuction?.is_separate_gender && (
                                    <select
                                        value={unsoldGenderFilter}
                                        onChange={(e) => setUnsoldGenderFilter(e.target.value)}
                                        className="input"
                                        style={{ padding: '0.5rem 0.8rem', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
                                        title="Filter Unsold Players by Gender"
                                    >
                                        <option value="ALL">🚻 Session: {liveGenderSession} (Default)</option>
                                        <option value="Male">♂ Male Only</option>
                                        <option value="Female">♀ Female Only</option>
                                    </select>
                                )}

                                <div style={{ position: 'relative', width: '240px' }}>
                                    <input
                                        type="text"
                                        placeholder="🔍 Search unsold player..."
                                        value={unsoldSearchTerm}
                                        onChange={(e) => setUnsoldSearchTerm(e.target.value)}
                                        className="input"
                                        style={{ width: '100%', padding: '0.5rem 2.2rem 0.5rem 0.8rem', fontSize: '0.85rem' }}
                                    />
                                    {unsoldSearchTerm && (
                                        <button
                                            onClick={() => setUnsoldSearchTerm('')}
                                            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {unsoldPlayers.length > 0 && (
                                    <button 
                                        onClick={restartAllUnsold}
                                        disabled={actionLoading}
                                        className="btn"
                                        style={{ background: '#3b82f6', color: '#fff', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 'bold' }}
                                    >
                                        🔄 RESTART ALL ({unsoldPlayers.length})
                                    </button>
                                )}
                            </div>
                        </div>
                        {unsoldPlayers.length === 0 ? (
                            <p className="text-muted text-center" style={{ padding: '3rem' }}>
                                {unsoldSearchTerm ? `No unsold players matching "${unsoldSearchTerm}".` : 'No unsold players available for this session.'}
                            </p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)', color: 'var(--accent-gold)' }}>
                                            <th style={{ padding: '1rem', width: '80px' }}>No.</th>
                                            <th style={{ padding: '1rem' }}>Player</th>
                                            <th style={{ padding: '1rem' }}>Role</th>
                                            <th style={{ padding: '1rem' }}>State</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {unsoldPlayers.map(p => (
                                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                                                <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>#{p.player_number || '-'}</td>
                                                <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    {p.players.photo_url ? (
                                                        <img src={getOptimizedImageUrl(p.players.photo_url, 100)} alt="P" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'contain', backgroundColor: '#0f172a' }} />
                                                    ) : (
                                                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>
                                                            {getPlayerInitials(p.players)}
                                                        </div>
                                                    )}
                                                    <div>{p.players.first_name} {p.players.last_name}</div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>{p.players.player_role}</td>
                                                <td style={{ padding: '1rem' }}>{p.players.state}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedAssignTeam('');
                                                                setAssignPriceMode('free');
                                                                setAssigningPendingPlayer(p);
                                                            }}
                                                            disabled={actionLoading || activePlayer}
                                                            className="btn"
                                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}
                                                            title="Assign unsold player to a team (Free ₹0 or Base Price)"
                                                        >
                                                            ⚡ Assign
                                                        </button>
                                                        <button
                                                            onClick={() => restartPlayer(p)}
                                                            disabled={actionLoading}
                                                            className="btn btn-outline"
                                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: '#3b82f6', borderColor: '#3b82f6' }}
                                                        >
                                                            Revert
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Modal for Active Player Direct Assignment (Free ₹0 vs Base Price) */}
                {showDirectAssignModal && activePlayer && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}>
                        <div className="glass-panel" style={{
                            maxWidth: '540px',
                            width: '100%',
                            padding: '2rem',
                            background: '#0f172a',
                            border: '2px solid #a855f7',
                            borderRadius: '16px',
                            boxShadow: '0 20px 50px rgba(168, 85, 247, 0.35)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                                    ⚡ DIRECT PLAYER ASSIGNMENT
                                </h3>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Base Price: ₹{(activeAuction?.base_price || 0).toLocaleString('en-IN')}
                                </span>
                            </div>

                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.2rem', lineHeight: 1.5 }}>
                                Assign active player <strong>{activePlayer.players.first_name} {activePlayer.players.last_name}</strong> (#{activePlayer.player_number || ''}) directly to a team.
                            </p>

                            {/* Price Mode Choice */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                                    Select Assignment Pricing:
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setAssignPriceMode('free')}
                                        style={{
                                            padding: '0.8rem',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            border: assignPriceMode === 'free' ? '2px solid #a855f7' : '1px solid var(--border-color)',
                                            background: assignPriceMode === 'free' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.03)',
                                            color: '#fff',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#c084fc', marginBottom: '0.2rem' }}>
                                            🎁 FREE (₹0)
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            No purse deduction
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setAssignPriceMode('base_price')}
                                        style={{
                                            padding: '0.8rem',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            border: assignPriceMode === 'base_price' ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)',
                                            background: assignPriceMode === 'base_price' ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255,255,255,0.03)',
                                            color: '#fff',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--accent-gold)', marginBottom: '0.2rem' }}>
                                            💰 BASE PRICE
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            ₹{(activeAuction?.base_price || 0).toLocaleString('en-IN')} from purse
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Team Selector */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                                    Select Receiving Team:
                                </label>
                                <select
                                    value={selectedAssignTeam}
                                    onChange={(e) => setSelectedAssignTeam(e.target.value)}
                                    className="form-select"
                                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid #a855f7', borderRadius: '8px', fontSize: '0.95rem' }}
                                >
                                    <option value="">-- Choose Team --</option>
                                    {displayTeams.map(t => {
                                        const maxPlayers = activeAuction?.max_players || 11;
                                        const maxBudget = activeAuction?.max_budget || 0;
                                        const basePrice = activeAuction?.base_price || 0;
                                        const sq = players.filter(p => p.team_id === t.id && p.id !== activePlayer.id);
                                        const isFull = sq.length >= maxPlayers;
                                        const spent = sq.reduce((acc, p) => acc + (p.sold_price || 0), 0);
                                        const remainingPurse = maxBudget > 0 ? (maxBudget - spent) : Infinity;
                                        const cannotAffordBase = assignPriceMode === 'base_price' && maxBudget > 0 && remainingPurse < basePrice;
                                        const disabled = isFull || cannotAffordBase;

                                        let label = `${t.team_name} (Squad: ${sq.length}/${maxPlayers})`;
                                        if (maxBudget > 0) {
                                            label += ` | Purse: ₹${remainingPurse.toLocaleString('en-IN')}`;
                                        }
                                        if (isFull) {
                                            label += ' - [SQUAD FULL]';
                                        } else if (cannotAffordBase) {
                                            label += ' - [INSUFFICIENT PURSE]';
                                        }

                                        return (
                                            <option key={t.id} value={t.id} disabled={disabled}>
                                                {label}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => { setShowDirectAssignModal(false); setSelectedAssignTeam(''); }}
                                    className="btn btn-outline"
                                    style={{ padding: '0.6rem 1.2rem' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => finalizeDirectAssign(selectedAssignTeam, assignPriceMode)}
                                    disabled={!selectedAssignTeam || actionLoading}
                                    className="btn"
                                    style={{
                                        padding: '0.6rem 1.5rem',
                                        background: assignPriceMode === 'base_price' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                        color: assignPriceMode === 'base_price' ? '#000' : '#fff',
                                        fontWeight: 'bold',
                                        border: 'none',
                                        borderRadius: '8px'
                                    }}
                                >
                                    {assignPriceMode === 'base_price' ? `Confirm Base Price (₹${(activeAuction?.base_price || 0).toLocaleString('en-IN')})` : 'Confirm Free (₹0)'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal for Pending / Unsold Player Direct Assignment (Free ₹0 vs Base Price) */}
                {assigningPendingPlayer && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}>
                        <div className="glass-panel" style={{
                            maxWidth: '540px',
                            width: '100%',
                            padding: '2rem',
                            background: '#0f172a',
                            border: '2px solid #a855f7',
                            borderRadius: '16px',
                            boxShadow: '0 20px 50px rgba(168, 85, 247, 0.35)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                                    ⚡ DIRECT PLAYER ASSIGNMENT
                                </h3>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Base Price: ₹{(activeAuction?.base_price || 0).toLocaleString('en-IN')}
                                </span>
                            </div>

                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.2rem', lineHeight: 1.5 }}>
                                Assign <strong>{assigningPendingPlayer.players.first_name} {assigningPendingPlayer.players.last_name}</strong> (#{assigningPendingPlayer.player_number || ''}) directly to a team without running an auction.
                            </p>

                            {/* Price Mode Choice */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                                    Select Assignment Pricing:
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setAssignPriceMode('free')}
                                        style={{
                                            padding: '0.8rem',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            border: assignPriceMode === 'free' ? '2px solid #a855f7' : '1px solid var(--border-color)',
                                            background: assignPriceMode === 'free' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.03)',
                                            color: '#fff',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#c084fc', marginBottom: '0.2rem' }}>
                                            🎁 FREE (₹0)
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            No purse deduction
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setAssignPriceMode('base_price')}
                                        style={{
                                            padding: '0.8rem',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            border: assignPriceMode === 'base_price' ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)',
                                            background: assignPriceMode === 'base_price' ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255,255,255,0.03)',
                                            color: '#fff',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--accent-gold)', marginBottom: '0.2rem' }}>
                                            💰 BASE PRICE
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            ₹{(activeAuction?.base_price || 0).toLocaleString('en-IN')} from purse
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Team Selector */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                                    Select Receiving Team:
                                </label>
                                <select
                                    value={selectedAssignTeam}
                                    onChange={(e) => setSelectedAssignTeam(e.target.value)}
                                    className="form-select"
                                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid #a855f7', borderRadius: '8px', fontSize: '0.95rem' }}
                                >
                                    <option value="">-- Choose Team --</option>
                                    {displayTeams.map(t => {
                                        const maxPlayers = activeAuction?.max_players || 11;
                                        const maxBudget = activeAuction?.max_budget || 0;
                                        const basePrice = activeAuction?.base_price || 0;
                                        const sq = players.filter(p => p.team_id === t.id);
                                        const isFull = sq.length >= maxPlayers;
                                        const spent = sq.reduce((acc, p) => acc + (p.sold_price || 0), 0);
                                        const remainingPurse = maxBudget > 0 ? (maxBudget - spent) : Infinity;
                                        const cannotAffordBase = assignPriceMode === 'base_price' && maxBudget > 0 && remainingPurse < basePrice;
                                        const disabled = isFull || cannotAffordBase;

                                        let label = `${t.team_name} (Squad: ${sq.length}/${maxPlayers})`;
                                        if (maxBudget > 0) {
                                            label += ` | Purse: ₹${remainingPurse.toLocaleString('en-IN')}`;
                                        }
                                        if (isFull) {
                                            label += ' - [SQUAD FULL]';
                                        } else if (cannotAffordBase) {
                                            label += ' - [INSUFFICIENT PURSE]';
                                        }

                                        return (
                                            <option key={t.id} value={t.id} disabled={disabled}>
                                                {label}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => { setAssigningPendingPlayer(null); setSelectedAssignTeam(''); }}
                                    className="btn btn-outline"
                                    style={{ padding: '0.6rem 1.2rem' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => assignPendingPlayerDirect(assigningPendingPlayer, selectedAssignTeam, assignPriceMode)}
                                    disabled={!selectedAssignTeam || actionLoading}
                                    className="btn"
                                    style={{
                                        padding: '0.6rem 1.5rem',
                                        background: assignPriceMode === 'base_price' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                        color: assignPriceMode === 'base_price' ? '#000' : '#fff',
                                        fontWeight: 'bold',
                                        border: 'none',
                                        borderRadius: '8px'
                                    }}
                                >
                                    {assignPriceMode === 'base_price' ? `Confirm Base Price (₹${(activeAuction?.base_price || 0).toLocaleString('en-IN')})` : 'Confirm Free (₹0)'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default LiveAuctionPage;
