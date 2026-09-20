import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { normalizeMobile } from '../utils/phoneUtils';
import { tshirtSizes } from '../data/data';

// Helper: Normalize strings for flexible matching
const cleanKey = (str) => (str || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');

// Header field mapping definitions
const HEADER_MAPPINGS = {
  first_name: ['firstname', 'fname', 'first_name', 'first', 'playerfirstname'],
  last_name: ['lastname', 'lname', 'last_name', 'surname', 'playerlastname'],
  full_name: ['fullname', 'name', 'playername', 'full_name'],
  mobile: ['mobile', 'phone', 'contact', 'mobilenumber', 'phonenumber', 'contactnumber', 'mobileno', 'phoneno', 'cell'],
  email: ['email', 'emailid', 'mail', 'emailaddress'],
  dob: ['dob', 'dateofbirth', 'birthdate', 'birth_date', 'date_of_birth'],
  gender: ['gender', 'sex'],
  area: ['area', 'city', 'location', 'town', 'address', 'locality'],
  player_role: ['playerrole', 'role', 'specialization', 'player_role', 'playingrole', 'playertype', 'type'],
  batting_style: ['battingstyle', 'batting', 'batting_style', 'batsmantype', 'battinghand', 'battingtype'],
  bowling_style: ['bowlingstyle', 'bowling', 'bowling_style', 'bowlertype', 'bowlingarm', 'bowlingtype'],
  tshirt_name: ['tshirtname', 'tshirtprintname', 't_shirtname', 'jerseyname', 'shirtname', 'printname', 'nameonjersey'],
  tshirt_size: ['tshirtsize', 't_shirtsize', 'jerseysize', 'size', 'shirtsize'],
  tshirt_number: ['tshirtnumber', 't_shirtnumber', 'jerseynumber', 'number', 'jerseyno', 'tshirtno'],
  is_captain: ['iscaptain', 'captain', 'is_captain', 'teamcaptain'],
  is_icon: ['isicon', 'icon', 'is_icon', 'iconplayer'],
  is_owner: ['isowner', 'owner', 'is_owner', 'teamowner'],
  photo_url: ['photourl', 'photo', 'image', 'photo_url', 'imageurl', 'profilepic', 'profilepicture'],
  aadhar_card_url: ['aadharurl', 'aadhar', 'aadharcard', 'aadhar_url', 'aadharcardurl', 'idproof']
};

/**
 * Identify target field for a given column header name
 */
const mapHeaderToField = (headerName) => {
  const cleaned = cleanKey(headerName);
  for (const [field, aliases] of Object.entries(HEADER_MAPPINGS)) {
    if (aliases.some(alias => cleanKey(alias) === cleaned)) {
      return field;
    }
  }
  return null;
};

/**
 * Normalizers for specific field types
 */
const normalizeGender = (val) => {
  if (!val) return 'Male'; // default
  const str = val.toString().trim().toLowerCase();
  if (str === 'f' || str.startsWith('fem') || str === 'female' || str === 'woman' || str === 'girl') {
    return 'Female';
  }
  return 'Male';
};

const normalizeRole = (val) => {
  if (!val) return 'All Rounder'; // default fallback
  const str = val.toString().trim().toLowerCase();
  if (str.includes('bat') || str === 'batter' || str === 'batsman') return 'Batter';
  if (str.includes('bowl') || str === 'bowler') return 'Bowler';
  if (str.includes('keep') || str.includes('wk') || str.includes('wicket')) return 'Wicket Keeper';
  if (str.includes('all') || str.includes('round') || str.includes('ar')) return 'All Rounder';
  return 'All Rounder';
};

const normalizeBattingStyle = (val) => {
  if (!val) return 'Right Hand';
  const str = val.toString().trim().toLowerCase();
  if (str.includes('left') || str === 'lhb' || str === 'l') return 'Left Hand';
  return 'Right Hand';
};

const normalizeBowlingStyle = (val) => {
  if (!val) return 'Right Arm Medium';
  const str = val.toString().trim().toLowerCase();
  if (str === 'none' || str === 'no' || str === '-' || str === 'na' || str === 'n/a') return 'None';
  if (str.includes('left')) {
    if (str.includes('spin') || str.includes('slow')) return 'Left Arm Spin';
    return 'Left Arm Fast';
  }
  if (str.includes('spin') || str.includes('leg') || str.includes('off')) return 'Right Arm Spin';
  if (str.includes('fast') || str.includes('pace')) return 'Right Arm Fast';
  if (str.includes('med')) return 'Right Arm Medium';
  return 'Right Arm Medium';
};

const normalizeTshirtSize = (val) => {
  if (!val) return '';
  const str = val.toString().trim().toUpperCase();
  // Check exact match in list
  const found = tshirtSizes.find(s => s.toUpperCase() === str || s.toUpperCase().startsWith(str + ' ') || s.toUpperCase().includes(`(${str})`));
  if (found) return found;

  // Numeric matches like 36 -> "36 (S)"
  const numMatch = tshirtSizes.find(s => s.startsWith(str));
  if (numMatch) return numMatch;

  return str;
};

const normalizeDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val.toISOString().split('T')[0];
  }
  // Excel serial date number
  if (typeof val === 'number') {
    const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(jsDate.getTime()) ? null : jsDate.toISOString().split('T')[0];
  }
  const str = val.toString().trim();
  // Try parsing formats: YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const dmy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
};

const normalizeBoolean = (val) => {
  if (typeof val === 'boolean') return val;
  if (!val) return false;
  const str = val.toString().trim().toLowerCase();
  return ['true', 'yes', 'y', '1', 'checked', 'owner', 'captain', 'icon'].includes(str);
};

/**
 * Parse an uploaded Excel (.xlsx, .xls) or CSV file
 * @param {File} file - Browser File object
 * @param {Array} existingPlayers - List of currently loaded players in system to check for mobile duplicates
 */
export const parsePlayersExcel = async (file, existingPlayers = []) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error("No sheet found in the uploaded spreadsheet.");
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawJson || rawJson.length < 2) {
          throw new Error("The uploaded sheet is empty or contains only headers.");
        }

        // 1. Identify header row (first non-empty row)
        let headerRowIndex = 0;
        while (headerRowIndex < rawJson.length && (!rawJson[headerRowIndex] || rawJson[headerRowIndex].every(cell => !cell || cell.toString().trim() === ''))) {
          headerRowIndex++;
        }

        if (headerRowIndex >= rawJson.length) {
          throw new Error("Could not find a valid header row in the spreadsheet.");
        }

        const rawHeaders = rawJson[headerRowIndex];
        const fieldMapping = {};

        rawHeaders.forEach((colName, colIdx) => {
          if (colName) {
            const field = mapHeaderToField(colName.toString().trim());
            if (field) {
              fieldMapping[colIdx] = field;
            }
          }
        });

        // Check if at least first_name (or full_name) and mobile are mapped
        const mappedFields = Object.values(fieldMapping);
        const hasName = mappedFields.includes('first_name') || mappedFields.includes('full_name');
        const hasMobile = mappedFields.includes('mobile');

        if (!hasName || !hasMobile) {
          throw new Error("Spreadsheet must contain at least 'Name' (or 'First Name') and 'Mobile' columns.");
        }

        // Build set of existing normalized mobile numbers in database
        const existingMobilesSet = new Set(
          existingPlayers
            .map(p => normalizeMobile(p.mobile))
            .filter(Boolean)
        );

        // Track mobiles seen inside this Excel file to catch intra-file duplicates
        const fileMobilesCount = new Map();

        const parsedRows = [];
        const dataRows = rawJson.slice(headerRowIndex + 1);

        dataRows.forEach((row, idx) => {
          // Check if entire row is empty
          if (!row || row.every(cell => cell === '' || cell === null || cell === undefined)) {
            return;
          }

          const rowNumber = headerRowIndex + 2 + idx; // 1-indexed Excel row number
          const rowObj = {};

          // Extract mapped values
          Object.keys(fieldMapping).forEach(colIdx => {
            const field = fieldMapping[colIdx];
            const rawVal = row[colIdx];
            rowObj[field] = rawVal !== undefined ? rawVal : '';
          });

          // Handle Name splitting if full_name is provided instead of first/last name
          let firstName = (rowObj.first_name || '').toString().trim();
          let lastName = (rowObj.last_name || '').toString().trim();

          if (!firstName && rowObj.full_name) {
            const parts = rowObj.full_name.toString().trim().split(/\s+/);
            firstName = parts[0] || '';
            lastName = parts.slice(1).join(' ') || '.';
          }
          if (!lastName) {
            lastName = '.';
          }

          const rawMobile = (rowObj.mobile || '').toString().trim();
          const normMobile = normalizeMobile(rawMobile);

          // Track occurrences inside file
          if (normMobile) {
            fileMobilesCount.set(normMobile, (fileMobilesCount.get(normMobile) || 0) + 1);
          }

          const playerRecord = {
            rowNumber,
            first_name: firstName,
            last_name: lastName,
            mobile: rawMobile,
            normalized_mobile: normMobile,
            email: (rowObj.email || '').toString().trim() || null,
            dob: normalizeDate(rowObj.dob),
            gender: normalizeGender(rowObj.gender),
            area: (rowObj.area || '').toString().trim() || null,
            player_role: normalizeRole(rowObj.player_role),
            batting_style: normalizeBattingStyle(rowObj.batting_style),
            bowling_style: normalizeBowlingStyle(rowObj.bowling_style),
            tshirt_name: (rowObj.tshirt_name || '').toString().trim() || null,
            tshirt_size: normalizeTshirtSize(rowObj.tshirt_size) || null,
            tshirt_number: (rowObj.tshirt_number || '').toString().trim() || null,
            is_captain: normalizeBoolean(rowObj.is_captain),
            is_icon: normalizeBoolean(rowObj.is_icon),
            is_owner: normalizeBoolean(rowObj.is_owner),
            photo_url: (rowObj.photo_url || '').toString().trim() || null,
            aadhar_card_url: (rowObj.aadhar_card_url || '').toString().trim() || null
          };

          // Validation
          const errors = [];
          const warnings = [];

          if (!firstName) errors.push("Missing First Name");
          if (!rawMobile) {
            errors.push("Missing Mobile Number");
          } else if (!normMobile || normMobile.length < 10) {
            errors.push(`Invalid Mobile Number format (${rawMobile})`);
          }

          if (normMobile && existingMobilesSet.has(normMobile)) {
            errors.push("Mobile number already exists in tournament database");
          }

          if (normMobile && (fileMobilesCount.get(normMobile) > 1)) {
            errors.push("Duplicate mobile number within this Excel file");
          }

          if (!rowObj.gender) {
            warnings.push("Gender defaulted to Male");
          }
          if (!rowObj.player_role) {
            warnings.push("Role defaulted to All Rounder");
          }

          parsedRows.push({
            rowNumber,
            data: playerRecord,
            isValid: errors.length === 0,
            errors,
            warnings
          });
        });

        resolve({
          totalRows: parsedRows.length,
          validRowsCount: parsedRows.filter(r => r.isValid).length,
          invalidRowsCount: parsedRows.filter(r => !r.isValid).length,
          headersDetected: mappedFields,
          rows: parsedRows
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(new Error("Failed to read file: " + err.message));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Generate and download a sample Excel template for importing players
 */
export const downloadPlayerImportTemplate = () => {
  const headers = [
    "First Name",
    "Last Name",
    "Mobile",
    "Gender",
    "Player Role",
    "Batting Style",
    "Bowling Style",
    "Area",
    "DOB",
    "Email",
    "T-Shirt Name",
    "T-Shirt Size",
    "T-Shirt Number",
    "Is Captain",
    "Is Icon",
    "Is Owner"
  ];

  const sampleData = [
    [
      "Virat",
      "Kohli",
      "9876543210",
      "Male",
      "Batter",
      "Right Hand",
      "Right Arm Medium",
      "Delhi",
      "1988-11-05",
      "virat@example.com",
      "VIRAT",
      "40 (L)",
      "18",
      "No",
      "Yes",
      "No"
    ],
    [
      "Jasprit",
      "Bumrah",
      "9876543211",
      "Male",
      "Bowler",
      "Right Hand",
      "Right Arm Fast",
      "Ahmedabad",
      "1993-12-06",
      "jasprit@example.com",
      "BUMRAH",
      "42 (XL)",
      "93",
      "No",
      "No",
      "No"
    ],
    [
      "Smriti",
      "Mandhana",
      "9876543212",
      "Female",
      "Batter",
      "Left Hand",
      "Right Arm Medium",
      "Mumbai",
      "1996-07-18",
      "smriti@example.com",
      "SMRITI",
      "36 (S)",
      "18",
      "Yes",
      "No",
      "No"
    ],
    [
      "Hardik",
      "Pandya",
      "9876543213",
      "Male",
      "All Rounder",
      "Right Hand",
      "Right Arm Fast",
      "Baroda",
      "1993-10-11",
      "hardik@example.com",
      "HARDIK",
      "40 (L)",
      "33",
      "No",
      "No",
      "No"
    ]
  ];

  const wsData = [headers, ...sampleData];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths for nice presentation
  ws['!cols'] = [
    { wch: 15 }, // First Name
    { wch: 15 }, // Last Name
    { wch: 16 }, // Mobile
    { wch: 12 }, // Gender
    { wch: 16 }, // Player Role
    { wch: 15 }, // Batting Style
    { wch: 18 }, // Bowling Style
    { wch: 15 }, // Area
    { wch: 14 }, // DOB
    { wch: 22 }, // Email
    { wch: 16 }, // T-Shirt Name
    { wch: 14 }, // T-Shirt Size
    { wch: 14 }, // T-Shirt Number
    { wch: 12 }, // Is Captain
    { wch: 12 }, // Is Icon
    { wch: 12 }  // Is Owner
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Players Template");

  XLSX.writeFile(wb, "Cricket_Auction_Player_Import_Template.xlsx");
};

/**
 * Batch insert valid players into Supabase
 * @param {string} auctionId - Active auction UUID
 * @param {Array} validPlayerRows - Array of validated player row objects
 * @param {Function} onProgress - Progress callback ({ current, total, percent, statusText })
 */
export const importPlayersBatch = async (auctionId, validPlayerRows, onProgress) => {
  if (!auctionId) throw new Error("Active Auction ID is required for import.");
  if (!validPlayerRows || validPlayerRows.length === 0) {
    throw new Error("No valid players provided to import.");
  }

  // 1. Get current highest player number in this auction
  const { data: maxData, error: maxError } = await supabase
    .from('auction_players')
    .select('player_number')
    .eq('auction_id', auctionId)
    .order('player_number', { ascending: false })
    .limit(1);

  if (maxError) throw maxError;

  let nextPlayerNumber = (maxData && maxData.length > 0 && maxData[0].player_number != null)
    ? maxData[0].player_number + 1
    : 1;

  const total = validPlayerRows.length;
  let successCount = 0;
  const errors = [];

  for (let i = 0; i < total; i++) {
    const row = validPlayerRows[i];
    const p = row.data;

    const progressPct = Math.round(((i + 1) / total) * 100);
    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        percent: progressPct,
        statusText: `Importing player ${i + 1} of ${total}: ${p.first_name} ${p.last_name}...`
      });
    }

    try {
      // Step A: Insert into players table
      const playerPayload = {
        branch: null,
        first_name: p.first_name,
        last_name: p.last_name,
        mobile: p.mobile,
        email: p.email || null,
        dob: p.dob || null,
        area: p.area || null,
        gender: p.gender || 'Male',
        photo_url: p.photo_url || null,
        aadhar_card_url: p.aadhar_card_url || null,
        player_role: p.player_role,
        batting_style: p.batting_style,
        bowling_style: p.bowling_style,
        tshirt_name: p.tshirt_name || null,
        tshirt_size: p.tshirt_size || null,
        tshirt_number: p.tshirt_number || null
      };

      const { data: newPlayerData, error: pInsertError } = await supabase
        .from('players')
        .insert([playerPayload])
        .select('id')
        .single();

      if (pInsertError) throw pInsertError;

      // Step B: Insert into auction_players table with auto-approval
      const apPayload = {
        auction_id: auctionId,
        player_id: newPlayerData.id,
        approval_status: 'approved',
        is_captain: !!p.is_captain,
        is_icon: !!p.is_icon,
        is_owner: !!p.is_owner,
        player_number: nextPlayerNumber++
      };

      const { error: apInsertError } = await supabase
        .from('auction_players')
        .insert([apPayload]);

      if (apInsertError) {
        // Rollback player row if auction_players fails
        await supabase.from('players').delete().eq('id', newPlayerData.id);
        throw apInsertError;
      }

      successCount++;
    } catch (rowErr) {
      console.error(`Error importing row ${row.rowNumber} (${p.first_name}):`, rowErr);
      errors.push({
        rowNumber: row.rowNumber,
        playerName: `${p.first_name} ${p.last_name}`,
        error: rowErr.message || 'Database error occurred'
      });
    }
  }

  return {
    successCount,
    failedCount: errors.length,
    errors
  };
};
