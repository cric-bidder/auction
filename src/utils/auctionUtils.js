/**
 * Calculate the maximum allowable bid a team can place for their next player.
 * 
 * Formula:
 * 1. Remaining Slots = max_players - current_squad_count
 * 2. Future Slots needed after this purchase = Remaining Slots - 1
 * 3. Reserve Budget Needed = Future Slots * base_price
 * 4. Max Allowed Bid = Remaining Budget - Reserve Budget Needed
 * 
 * Example:
 * Max Budget = 10,000,000
 * Max Squad = 11 players
 * Base Price = 200,000
 * Current Squad = 0
 * Remaining Slots = 11, Future Slots = 10
 * Reserve Needed = 10 * 200,000 = 2,000,000
 * Max Bid = 10,000,000 - 2,000,000 = 8,000,000
 */
export const calculateTeamMaxBid = (team, auction, teamSquad = [], enforceReserve = true) => {
    if (!auction || !team) return { maxBid: 0, remainingSlots: 0, reserveNeeded: 0, remainingPurse: 0, canBid: false };

    const maxBudget = auction.max_budget || 0;
    const maxPlayers = auction.max_players || 11;
    const basePrice = auction.base_price || 0;

    // Current players in squad
    const squadCount = teamSquad.length;
    const remainingSlots = Math.max(0, maxPlayers - squadCount);

    if (remainingSlots <= 0) {
        return {
            maxBid: 0,
            remainingSlots: 0,
            reserveNeeded: 0,
            remainingPurse: 0,
            canBid: false,
            reason: 'Squad is full'
        };
    }

    // Money spent so far
    const spent = teamSquad.reduce((acc, p) => acc + (Number(p.sold_price) || 0), 0);
    const remainingPurse = maxBudget > 0 ? (maxBudget - spent) : Infinity;

    if (maxBudget <= 0) {
        return {
            maxBid: Infinity,
            remainingSlots,
            reserveNeeded: 0,
            remainingPurse: Infinity,
            canBid: true
        };
    }

    // Future slots that must be filled after this player
    const futureSlots = Math.max(0, remainingSlots - 1);
    const reserveNeeded = enforceReserve ? (futureSlots * basePrice) : 0;
    const maxBid = Math.max(0, remainingPurse - reserveNeeded);

    return {
        maxBid,
        remainingSlots,
        futureSlots,
        reserveNeeded,
        remainingPurse,
        spent,
        canBid: maxBid >= basePrice,
        reason: maxBid < basePrice ? `Needs ₹${reserveNeeded.toLocaleString('en-IN')} reserve for ${futureSlots} future slots` : ''
    };
};
