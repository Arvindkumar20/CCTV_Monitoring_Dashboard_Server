import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  state: String,
  pincode: String,
  country: {
    type: String,
    default: "India"
  }
}, { _id: false });

export default addressSchema;