import { supabase } from './supabase';
import { deleteFromCloudinary } from './cloudinary';

/**
 * Completely purges all data related to a given auction:
 * 1. Collects all Cloudinary image URLs (auction logo, qr code, team logos, sponsor logos, owner photos, player photos & aadhar cards)
 * 2. Destroys all collected images in Cloudinary
 * 3. Deletes records from Supabase in appropriate foreign key sequence:
 *    - team_owners
 *    - owners (linked to auction's teams or players)
 *    - auction_players
 *    - players (tied to this auction's auction_players)
 *    - sponsors
 *    - invitations
 *    - auction_teams
 *    - auctions
 * 
 * @param {string|number} auctionId - ID of the auction in Supabase
 * @param {function} [onProgress] - Optional callback for status updates (e.g. (statusText, percentage) => {})
 */
export const purgeAuctionData = async (auctionId, onProgress = () => {}) => {
  if (!auctionId) {
    throw new Error("Invalid Auction ID provided for purge.");
  }

  const cloudinaryUrls = new Set();

  onProgress("Fetching tournament details...", 10);

  // 1. Fetch Auction record
  const { data: auction, error: auctionErr } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .single();

  if (auctionErr) throw new Error(`Failed to fetch auction: ${auctionErr.message}`);

  if (auction.auction_logo) cloudinaryUrls.add(auction.auction_logo);
  if (auction.qr_code_url) cloudinaryUrls.add(auction.qr_code_url);

  // 2. Fetch Sponsors
  onProgress("Scanning sponsors & banners...", 20);
  const { data: sponsors, error: sponsorsErr } = await supabase
    .from('sponsors')
    .select('id, photo_url')
    .eq('auction_id', auctionId);

  if (!sponsorsErr && sponsors) {
    sponsors.forEach(s => {
      if (s.photo_url) cloudinaryUrls.add(s.photo_url);
    });
  }

  // 3. Fetch Teams
  onProgress("Scanning teams and logos...", 30);
  const { data: teams, error: teamsErr } = await supabase
    .from('auction_teams')
    .select('id, logo_url')
    .eq('auction_id', auctionId);

  const teamIds = (teams || []).map(t => t.id);
  if (teams) {
    teams.forEach(t => {
      if (t.logo_url) cloudinaryUrls.add(t.logo_url);
    });
  }

  // 4. Fetch Team Owners linked to these teams
  let ownerIds = [];
  if (teamIds.length > 0) {
    onProgress("Scanning team owners...", 40);
    const { data: teamOwners, error: toErr } = await supabase
      .from('team_owners')
      .select('owner_id')
      .in('team_id', teamIds);

    if (!toErr && teamOwners) {
      ownerIds = [...new Set(teamOwners.map(to => to.owner_id).filter(Boolean))];
      
      if (ownerIds.length > 0) {
        const { data: ownersData } = await supabase
          .from('owners')
          .select('id, photo_url')
          .in('id', ownerIds);

        if (ownersData) {
          ownersData.forEach(o => {
            if (o.photo_url) cloudinaryUrls.add(o.photo_url);
          });
        }
      }
    }
  }

  // 5. Fetch Auction Players & associated Players
  onProgress("Scanning registered players & documents...", 50);
  const { data: auctionPlayers, error: apErr } = await supabase
    .from('auction_players')
    .select('id, player_id')
    .eq('auction_id', auctionId);

  const playerIds = (auctionPlayers || []).map(ap => ap.player_id).filter(Boolean);

  if (playerIds.length > 0) {
    // Fetch player media
    const { data: playersData, error: pErr } = await supabase
      .from('players')
      .select('id, photo_url, aadhar_card_url')
      .in('id', playerIds);

    if (!pErr && playersData) {
      playersData.forEach(p => {
        if (p.photo_url) cloudinaryUrls.add(p.photo_url);
        if (p.aadhar_card_url) cloudinaryUrls.add(p.aadhar_card_url);
      });
    }
  }

  // 6. Delete Cloudinary Images
  const urlList = Array.from(cloudinaryUrls).filter(url => typeof url === 'string' && url.includes('cloudinary.com'));
  onProgress(`Purging ${urlList.length} media assets from Cloudinary...`, 65);

  const deletePromises = urlList.map(url =>
    deleteFromCloudinary(url).catch(err => {
      console.warn(`Could not delete image ${url}:`, err);
    })
  );
  await Promise.allSettled(deletePromises);

  // 7. Delete Supabase Database Records in foreign key order
  onProgress("Removing database records...", 80);

  // A. Delete team_owners for teams of this auction
  if (teamIds.length > 0) {
    await supabase.from('team_owners').delete().in('team_id', teamIds);
  }

  // B. Delete owners if they were only linked to this tournament's teams
  if (ownerIds.length > 0) {
    await supabase.from('owners').delete().in('id', ownerIds);
  }

  // C. Delete auction_players
  await supabase.from('auction_players').delete().eq('auction_id', auctionId);

  // D. Delete players records tied to this auction
  if (playerIds.length > 0) {
    await supabase.from('players').delete().in('id', playerIds);
  }

  // E. Delete sponsors
  await supabase.from('sponsors').delete().eq('auction_id', auctionId);

  // F. Delete invitations
  await supabase.from('invitations').delete().eq('auction_id', auctionId);

  // G. Delete auction_teams
  await supabase.from('auction_teams').delete().eq('auction_id', auctionId);

  // H. Finally delete the auction itself
  onProgress("Deleting tournament record...", 95);
  const { error: finalAuctionErr } = await supabase
    .from('auctions')
    .delete()
    .eq('id', auctionId);

  if (finalAuctionErr) {
    throw new Error(`Failed to delete auction record: ${finalAuctionErr.message}`);
  }

  // Clean local storage if it had this auction selected
  const savedCode = localStorage.getItem('cap_admin_selected_auction_code');
  if (savedCode === auction.auction_code) {
    localStorage.removeItem('cap_admin_selected_auction_code');
  }

  onProgress("Auction data and assets completely erased!", 100);
  return { success: true, deletedMediaCount: urlList.length };
};
