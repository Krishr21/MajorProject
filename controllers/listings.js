const Listing = require("../models/listing.js");
const {listingSchema} = require("../schema.js");
const ExpressError = require("../utils/ExpressError.js");
const wrapAsync = require("../utils/wrapAsync.js");
const {isLoggedIn, isOwner, validateListing} = require("../middleware.js");
const { geocodeAddress } = require("../utils/geocoder.js");

module.exports.index= async(req,res) => {
    const allListings = await Listing.find({});
    res.render("./listings/index.ejs", {allListings});
};

module.exports.searchListings = async(req,res) => {
    const { q } = req.query;
    let allListings;
    
    if (q) {
        // Search in title, location, and country fields
        allListings = await Listing.find({
            $or: [
                { title: { $regex: q, $options: "i" } },
                { location: { $regex: q, $options: "i" } },
                { country: { $regex: q, $options: "i" } }
            ]
        });
    } else {
        allListings = await Listing.find({});
    }
    
    res.render("./listings/index.ejs", { allListings, searchQuery: q });
};

module.exports.renderNewForm = (req,res) => {
        res.render("./listings/new.ejs");
};

module.exports.showListing = async(req,res,next) => {
        let {id} = req.params;
        const listing = await Listing.findById(id).populate({path:"reviews", populate:{path:"author",},}).populate("owner");
        if(!listing){
            req.flash("error", "Listing not found!");
            return res.redirect("/listings");
        }
        res.render("./listings/show.ejs", {listing});
};

module.exports.createListing = async(req,res,next) => {
        let url = req.file.path;
        let filename = req.file.filename;
        const newListing = new Listing(req.body.listing);
        newListing.owner = req.user._id;
        newListing.image = {url, filename};
        
        // Geocoding for map coordinates using Nominatim
        try {
            // Use the new geocoder utility
            newListing.geometry = await geocodeAddress(
                req.body.listing.location,
                req.body.listing.country
            );
        } catch (err) {
            console.error("Geocoding error:", err.message);
            // Set default geometry if geocoding fails
            newListing.geometry = {
                type: "Point",
                coordinates: [0, 0]
            };
        }
        
        await newListing.save();
        req.flash("success", "New listing Created!");
        res.redirect("/listings");   
};

module.exports.renderEditForm = async(req,res) => {
        let {id} = req.params;
        const listing = await Listing.findById(id);
        if(!listing){
            req.flash("error", "Listing not found!");
            return res.redirect("/listings");
        }

        let originalImageUrl = listing.image.url;
        originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
        res.render("./listings/edit.ejs", {listing , originalImageUrl});
};

module.exports.updateListing = async(req,res) => {
        let {id} = req.params;
        let listing = await Listing.findByIdAndUpdate(id, {...req.body.listing});

        if(typeof req.file !== "undefined"){
            let url = req.file.path;
            let filename = req.file.filename;
            listing.image = {url, filename};
        }
        
        // Update geocoding for map coordinates using Nominatim
        try {
            // Use the new geocoder utility
            listing.geometry = await geocodeAddress(
                req.body.listing.location,
                req.body.listing.country
            );
        } catch (err) {
            console.error("Geocoding error:", err.message);
            // Set default geometry if geocoding fails
            listing.geometry = {
                type: "Point",
                coordinates: [0, 0]
            };
        }
        
        await listing.save();
        req.flash("success", "Listing Updated!");
        res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async(req,res) => {
        let {id} = req.params;
        await Listing.findByIdAndDelete(id);
        req.flash("success", "Listing Deleted!");
        res.redirect("/listings");
};