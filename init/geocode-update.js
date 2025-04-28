// Script to update old listings with proper geocoding coordinates
require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('../models/listing');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapBoxToken = process.env.MAPBOX_TOKEN || "pk.eyJ1Ijoia3Jpc2hkZXYiLCJhIjoiY2x5ZXJlNnRiMGFnMzJxbzZqZWJqMnJnZSJ9.Rl9-FLt9zVl9nZm3NZEwrA";
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });

// Connect to MongoDB
const dbUrl = process.env.ATLAS_URL || 'mongodb://localhost:27017/wanderlust';
mongoose.connect(dbUrl)
  .then(() => {
    console.log('DATABASE CONNECTED!');
    updateListingsGeocoding();
  })
  .catch(err => {
    console.error('MONGO CONNECTION ERROR!');
    console.error(err);
  });

async function updateListingsGeocoding() {
  try {
    // Find all listings with missing or default coordinates (0,0)
    const listings = await Listing.find({
      $or: [
        { 'geometry.coordinates': [0, 0] },
        { 'geometry.coordinates': { $exists: false } },
        { geometry: { $exists: false } }
      ]
    });

    console.log(`Found ${listings.length} listings with missing or default coordinates`);

    let updatedCount = 0;
    let errorCount = 0;

    // Process each listing
    for (const listing of listings) {
      try {
        if (!listing.location || !listing.country) {
          console.log(`Skipping listing ${listing._id}: Missing location or country`);
          continue;
        }

        // Get geocoding data
        const geoData = await geocoder.forwardGeocode({
          query: `${listing.location}, ${listing.country}`,
          limit: 1
        }).send();

        // Update listing if geocoding data is available
        if (geoData.body.features && geoData.body.features.length > 0) {
          listing.geometry = geoData.body.features[0].geometry;
          await listing.save();
          updatedCount++;
          console.log(`Updated listing ${listing._id}: ${listing.title}`);
        } else {
          console.log(`No geocoding data found for listing ${listing._id}: ${listing.title}`);
          errorCount++;
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Error updating listing ${listing._id}:`, err);
        errorCount++;
      }
    }

    console.log(`\nGeocoding update complete!`);
    console.log(`Updated: ${updatedCount} listings`);
    console.log(`Errors/Skipped: ${errorCount} listings`);
  } catch (err) {
    console.error('Error in update process:', err);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
}