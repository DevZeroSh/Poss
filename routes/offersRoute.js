const express = require('express');
const mongoose = require('mongoose');
const { createOffer, getOffer, getOneOffer, updateOffer, deleteOffer } = require('../services/offerServices');

const offersRouter = express.Router();

// Create a new offer
offersRouter.post('/', createOffer);

// Get all offers
offersRouter.get('/', getOffer);

// Get a specific offer by ID
offersRouter.get('/:id', getOneOffer);

// Update an offer
offersRouter.patch('/:id', updateOffer);

// Delete an offer
offersRouter.delete('/:id', deleteOffer);

// Schedule a cron job to deactivate expired offers


// Start the cron job
// No need to call start() method for node-cron 3.x and above

module.exports = offersRouter;
