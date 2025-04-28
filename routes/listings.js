const express = require("express");
const router = express.Router({mergeParams: true});
const Listing = require("../models/listing.js");
const wrapAsync = require("../utils/wrapAsync.js");
const {isLoggedIn, isOwner, validateListing} = require("../middleware.js");
const multer = require("multer");
const {storage} = require("../cloudConfig.js");
const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    }
});

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size too large. Maximum size is 2MB.' });
        }
        return res.status(400).json({ error: err.message });
    }
    next(err);
};


const listingController = require("../controllers/listings.js");

router
    .route("/")
    .get(wrapAsync(listingController.index))
    .post(isLoggedIn,upload.single("listing[image]"), validateListing, wrapAsync(listingController.createListing));

// Search Route
router.get("/search", wrapAsync(listingController.searchListings));


//New Route
router.get("/new", isLoggedIn, listingController.renderNewForm);

router
   .route("/:id")
   .get( wrapAsync(listingController.showListing))
   .put( isLoggedIn, isOwner, upload.single("listing[image]"), validateListing,wrapAsync(listingController.updateListing))
   .delete( isLoggedIn, isOwner,wrapAsync(listingController.destroyListing));

//Edit Route
router.get("/:id/edit", isLoggedIn, isOwner,wrapAsync(listingController.renderEditForm));

module.exports = router;