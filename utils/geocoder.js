const axios = require('axios');

/**
 * Geocoding utility using OpenStreetMap's Nominatim API
 * This replaces the Mapbox geocoding service
 */
const geocodeAddress = async (location, country) => {
  try {
    // Format the query string with more specific location details
    const query = encodeURIComponent(`${location}, ${country}`);
    console.log(`Geocoding location: ${location}, ${country}`);
    
    // Call Nominatim API with proper headers and parameters
    // Adding more parameters for better results
    const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: {
        q: query,
        format: 'json',
        limit: 1,
        addressdetails: 1,  // Get detailed address information
        countrycodes: country.length === 2 ? country : undefined // Use country code if provided
      },
      headers: {
        'User-Agent': 'WanderLust App' // Required by Nominatim's usage policy
      }
    });
    
    // Add delay to respect Nominatim usage policy (1 request per second)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if we got results
    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      console.log(`Geocoding success for ${location}, coordinates: [${result.lon}, ${result.lat}]`);
      
      // Create GeoJSON Point format (same as what Mapbox returns)
      return {
        type: 'Point',
        coordinates: [
          parseFloat(result.lon), // longitude first in GeoJSON
          parseFloat(result.lat)  // latitude second in GeoJSON
        ]
      };
    }
    
    // If no results, try a more generic search with just the location name
    console.log(`No results found for ${location}, ${country}. Trying with just location name...`);
    const fallbackResponse = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: {
        q: location,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'WanderLust App'
      }
    });
    
    // Add delay to respect Nominatim usage policy
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (fallbackResponse.data && fallbackResponse.data.length > 0) {
      const fallbackResult = fallbackResponse.data[0];
      console.log(`Fallback geocoding success for ${location}, coordinates: [${fallbackResult.lon}, ${fallbackResult.lat}]`);
      
      return {
        type: 'Point',
        coordinates: [
          parseFloat(fallbackResult.lon),
          parseFloat(fallbackResult.lat)
        ]
      };
    }
    
    console.log(`No geocoding results found for ${location}`);
    // Return default coordinates if no results
    return {
      type: 'Point',
      coordinates: [0, 0]
    };
  } catch (error) {
    console.error('Geocoding error:', error.message);
    
    // Return default coordinates on error
    return {
      type: 'Point',
      coordinates: [0, 0]
    };
  }
};

module.exports = { geocodeAddress };