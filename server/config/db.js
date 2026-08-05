const mongoose = require('mongoose')
require('dotenv').config()

const DB_URI = process.env.URI

const connectDB = () => {
    return mongoose.connect(DB_URI)
        .then(() => {
            console.log('DB connected to Mongoose')
        })
        .catch((err) => {
            console.log('Error connecting to DB', err)
        })
}

module.exports = connectDB
