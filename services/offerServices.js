const offerSchema = require('../models/offersModel');
const { default: mongoose } = require('mongoose');
const productSchema = require('../models/productModel');
const cron = require('node-cron');
const axios = require("axios");
const categorySchema = require('../models/CategoryModel');

async function getAllChildCategories(parentCategoryId, db, categorySchema) {
    const Category = db.model('Category', categorySchema);

    // Find the parent category and populate its children
    const parentCategory = await Category.findById(parentCategoryId).populate('children');

    if (!parentCategory) {
        return [];
    }

    // Initialize a Set with the parent category ID
    let allCategories = new Set([parentCategoryId]);

    // Recursively add child categories
    for (let child of parentCategory.children) {
        const nestedChildCategories = await getAllChildCategories(child, db, categorySchema);
        nestedChildCategories.forEach(catId => allCategories.add(catId));
    }

    return Array.from(allCategories);
}

exports.createOffer = async (req, res) => {
    const { databaseName } = req.query;
    const offerData = req.body;

    if (!databaseName) {
        return res.status(400).send({ error: "Database name is required" });
    }

    const db = mongoose.connection.useDb(databaseName);
    const Offer = db.model('Offer', offerSchema);
    const Product = db.model('Product', productSchema);

    try {
        if (offerData.cat != [] && offerData.cat.length > 0) {
            // Get all child categories, including the parent category
            const allCategories = await getAllChildCategories(offerData.cat, db, categorySchema);

            // Find products in all these categories
            const products = await Product.find({ category: { $in: allCategories } });
            const applicableProducts = products.map(product => product.id);
            offerData.applicableProducts = applicableProducts;
        } else if (offerData.brand !== '') {

            // Find products by brand
            const products = await Product.find({ brand: offerData.brand });
            const applicableProducts = products.map(product => product.id);
            offerData.applicableProducts = applicableProducts;

        }
        else {
            // Find products by id
            const products = await Product.find({ _id: { $in: offerData.applicableProducts } });
            const applicableProducts = products.map(product => product._id.toString());

            offerData.applicableProducts = applicableProducts;

        }

        // Create and save the new offer
        const offer = new Offer(offerData);
        await offer.save();

        res.status(200).json({ status: "success", data: offer });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Internal server error" });
    }
};

// Function to update offer status for a specific database

const updateOfferStatusForDatabase = async (databaseName) => {
    const db = mongoose.connection.useDb(databaseName);
    const Product = db.model('Product', productSchema);
    const Offer = db.model('Offer', offerSchema);

    try {
        const currentDate = new Date();
        const currentHour = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), currentDate.getHours() + 3, 0, 0, 0);


        // Find offers that end at the current hour
        const offersEndDate = await Offer.find({ endDate: currentHour });
        const offersStartDate = await Offer.find({ startDate: currentHour });
        if (offersEndDate.length > 0) {
            console.log("test")
            for (const offer of offersEndDate) {
                // Deactivate the offer
                offer.isActive = false;
                await offer.save();
                console.log(`Offer deactivated in database ${databaseName}`);

                // Update price in products
                const products = await Product.find({ _id: { $in: offer.applicableProducts } });
                for (const product of products) {
                    product.priceAftereDiscount = 0;
                    await product.save();
                }
            }
        }
        if (offersStartDate.length > 0) {
            console.log("test")
            for (const offer of offersStartDate) {
                // Deactivate the offer
                offer.isActive = true;
                await offer.save();
                console.log(`Offer deactivated in database ${databaseName}`);

                // Update price in products
                const products = await Product.find({ _id: { $in: offer.applicableProducts } });
                for (const product of products) {
                    product.priceAftereDiscount = product.taxPrice * (1 - (offer.discountPercentage / 100));
                    await product.save();
                }
            }
        }

    } catch (error) {
        console.error(`Failed to update offer status in database ${databaseName}:`, error);
    }
};

// Function to fetch all subscriber databases
const fetchAllSubscriberDatabases = async () => {
    try {
        console.log('Fetching subscriber databases...');

        // Make a request to get all subscriber databases
        const response = await axios.get("https://api2.smartinb.ai:4001/api/subscribers");



        if (response.data.status === "success") {
            const subscriberDatabases = response.data.data.map(user => user.dbName);
            console.log("Subscriber databases:", subscriberDatabases);
            return subscriberDatabases;
        } else {
            throw new Error("Failed to fetch subscriber databases.");
        }
    } catch (error) {
        console.error("Error fetching subscriber databases:", error);
        return [];
    }
};

// Schedule the function to run every hour
cron.schedule('0 * * * *', async () => {
    console.log('Running offer status update task for all databases...');

    // Fetch all subscriber databases
    const subscriberDatabases = await fetchAllSubscriberDatabases();
    for (const dbName of subscriberDatabases) {
        await updateOfferStatusForDatabase(dbName);
    }
});

exports.updateOffer = async (req, res) => {
    const { databaseName } = req.query;
    const offerId = req.params.id;
    const updateData = req.body;

    if (!databaseName) {
        return res.status(400).send({ error: "Database name is required" });
    }

    try {
        const db = mongoose.connection.useDb(databaseName);
        const Offer = db.model('Offer', offerSchema);

        const updatedOffer = await Offer.findOneAndUpdate({ _id: offerId }, updateData, { new: true, runValidators: true });

        if (!updatedOffer) {
            return res.status(404).send({ error: "Offer not found" });
        }
        res.status(200).json({ status: "success", data: updatedOffer });
    } catch (error) {
        res.status(500).send({ error: "Failed to update offer" });
    }
}

exports.deleteOffer = async (req, res) => {
    const { databaseName } = req.query;
    const offerId = req.params.id;

    if (!databaseName) {
        return res.status(400).send({ error: "Database name is required" });
    }

    try {
        const db = mongoose.connection.useDb(databaseName);

        const Offer = db.model('Offer', offerSchema);
        const Product = db.model('Product', productSchema);


        const offer = await Offer.findByIdAndDelete(offerId);
        const products = await Product.find({ _id: { $in: offer.applicableProducts } });
        for (const product of products) {
            product.priceAftereDiscount = 0;
            await product.save();
        }
        if (!offer) {
            return res.status(404).send({ error: "Offer not found" });
        }

        res.send({ message: "Offer deleted successfully" });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}

exports.getOffer = async (req, res) => {
    const { databaseName } = req.query;

    if (!databaseName) {
        return res.status(400).send({ error: "Database name is required" });
    }

    try {
        // Use the specified database
        const db = mongoose.connection.useDb(databaseName);
        const pageSize = 10;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * pageSize;
        const Offer = db.model('Offer', offerSchema);

        // Get total count of documents for pagination
        const totalItems = await Offer.countDocuments();

        // Apply pagination to the query
        const offers = await Offer.find().skip(skip).limit(pageSize).sort({ createdAt: -1 });

        const totalPages = Math.ceil(totalItems / pageSize);

        res.status(200).json({
            status: "success",
            pages: totalPages,
            results: offers.length,
            data: offers
        });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}

exports.getOneOffer = async (req, res) => {
    const { databaseName } = req.query;
    const offerId = req.params.id;

    if (!databaseName) {
        return res.status(400).send({ error: "Database name is required" });
    }

    try {
        const db = mongoose.connection.useDb(databaseName);

        const Offer = db.model('Offer', offerSchema);
        const Product = db.model('Product', productSchema);

        const offer = await Offer.findById(offerId).populate('applicableProducts');

        if (!offer) {
            return res.status(404).send({ error: "Offer not found" });
        }

        res.status(200).json({ status: "success", data: offer })
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}
