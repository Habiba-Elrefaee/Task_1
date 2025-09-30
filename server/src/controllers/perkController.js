import Joi from 'joi'; //package for validation
import { Perk } from '../models/Perk.js';
import mongoose from 'mongoose'; // Add this import

// validation schema for creating/updating a perk
const perkSchema = Joi.object({
  // check that title is at least 2 characters long, and required
  title: Joi.string().min(2).required(),
  // description is optional
  description: Joi.string().allow(''), //allowed to be empty string
  // category must be one of the defined values, default to 'other'
  category: Joi.string().valid('food','tech','travel','fitness','other').default('other'),
  // discountPercent must be between 0 and 100, default to 0
  discountPercent: Joi.number().min(0).max(100).default(0),
  // merchant is optional
  merchant: Joi.string().allow('')

}); 

  

// Filter perks by exact title match if title query parameter is provided 
export async function filterPerks(req, res, next) {
  try {
    const { title } = req.query     ;
    if (title) {
      const perks = await Perk.find ({ title: title}).sort({ createdAt: -1 });
      console.log(perks);
      res.status(200).json(perks)
    }
    else {
      res.status(400).json({ message: 'Title query parameter is required' });
    }
  } catch (err) { next(err); }
}


// Get a single perk by ID 
export async function getPerk(req, res, next) {
  try {
    const perk = await Perk.findById(req.params.id);
    console.log(perk);
    if (!perk) return res.status(404).json({ message: 'Perk not found' });
    res.json({ perk });
    // next() is used to pass errors to the error handling middleware
  } catch (err) { next(err); }
}

// get all perks
export async function getAllPerks(req, res, next) {
  try {
    const perks = await Perk.find().sort({ createdAt: -1 });
    res.json(perks);
  } catch (err) { next(err); }
}

// Create a new perk
export async function createPerk(req, res, next) {
  try {
    // validate request body against schema
    const { value, error } = perkSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });
     // ...value spreads the validated fields
    const doc = await Perk.create({ ...value});
    res.status(201).json({ perk: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate perk for this merchant' });
    next(err);
  }
}
// TODO
// Update an existing perk by ID and validate only the fields that are being updated 
export async function updatePerk(req, res, next) {
  try {
    const { id } = req.params; // Get the perk ID from the URL parameters
    const updates = req.body; // Get the fields to update from the request body

    // Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid perk ID' });
    }

    // Define allowed fields to prevent updating restricted fields like _id, createdAt, etc.
    const allowedUpdates = ['title', 'description', 'category', 'discountPercent', 'merchant'];
    const updateKeys = Object.keys(updates);

    // Check if all provided fields are allowed
    const isValidUpdate = updateKeys.every((key) => allowedUpdates.includes(key));
    if (!isValidUpdate) {
      return res.status(400).json({ message: 'Invalid fields provided for update' });
    }

    // Validate the provided fields against schema constraints
    const errors = [];

    if (updates.title && typeof updates.title !== 'string') {
      errors.push('Title must be a string');
    }

    if (updates.description && typeof updates.description !== 'string') {
      errors.push('Description must be a string');
    }

    if (updates.category && !['food', 'tech', 'travel', 'fitness', 'other'].includes(updates.category)) {
      errors.push('Category must be one of: food, tech, travel, fitness, other');
    }

    if (updates.discountPercent !== undefined) {
      if (typeof updates.discountPercent !== 'number' || updates.discountPercent < 0 || updates.discountPercent > 100) {
        errors.push('Discount percent must be a number between 0 and 100');
      }
    }

    if (updates.merchant && typeof updates.merchant !== 'string') {
      errors.push('Merchant must be a string');
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation errors', errors });
    }

    // Find and update the perk
    const perk = await Perk.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true } // Return the updated document and run schema validators
    );

    // Check if the perk exists
    if (!perk) {
      return res.status(404).json({ message: 'Perk not found' });
    }

    // Return the updated perk
    res.status(200).json({ perk });
  } catch (error) {
    // Pass any unexpected errors to the error-handling middleware
    next(error);
  }
}


// Delete a perk by ID
export async function deletePerk(req, res, next) {
  try {
    const doc = await Perk.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Perk not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
}
