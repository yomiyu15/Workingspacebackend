const DEFAULT_LOCATIONS = [
  {
    name: "Bole Innovation Hub",
    city: "Addis Ababa",
    address: "Bole Atlas, Woreda 03",
    timezone: "Africa/Addis_Ababa",
    support_phone: "+251911000001",
  },
  {
    name: "Kazanchis Skyline Center",
    city: "Addis Ababa",
    address: "Kazanchis, Africa Avenue",
    timezone: "Africa/Addis_Ababa",
    support_phone: "+251911000002",
  },
  {
    name: "CMC Tech Park",
    city: "Addis Ababa",
    address: "CMC Michael, Sunshine Tower",
    timezone: "Africa/Addis_Ababa",
    support_phone: "+251911000003",
  },
  {
    name: "Sarbet Creative Campus",
    city: "Addis Ababa",
    address: "Old Airport, Sarbet Road",
    timezone: "Africa/Addis_Ababa",
    support_phone: "+251911000004",
  },
]

const DEFAULT_GALLERY_CATEGORIES = ["Private Offices", "Meeting Rooms", "Hot Desks", "Event Spaces"]

async function seedDefaults(pool) {
  try {
    const locationCount = await pool.query("SELECT COUNT(*) AS count FROM locations")
    if (Number(locationCount.rows[0].count) === 0) {
      for (const loc of DEFAULT_LOCATIONS) {
        const exists = await pool.query("SELECT id FROM locations WHERE name = $1 LIMIT 1", [loc.name])
        if (exists.rows.length === 0) {
          await pool.query(
            `INSERT INTO locations (name, city, address, timezone, support_phone)
             VALUES ($1,$2,$3,$4,$5)`,
            [loc.name, loc.city, loc.address, loc.timezone, loc.support_phone],
          )
        }
      }
    }

    for (const category of DEFAULT_GALLERY_CATEGORIES) {
      await pool.query(
        `INSERT INTO gallery_categories (name)
         VALUES ($1)
         ON CONFLICT (name) DO NOTHING`,
        [category],
      )
    }
  } catch (error) {
    console.error("Failed to seed defaults:", error)
  }
}

module.exports = { seedDefaults }




