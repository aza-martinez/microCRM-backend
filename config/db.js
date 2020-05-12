const mongoose = require('mongoose');
require('dotenv').config({ path: 'variables.env' });

const conectarDB = async () => {
    try {
        console.log('CONECTION DB STRING', process.env.DB_MONGO)
        await mongoose.connect(process.env.DB_MONGO, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
            useCreateIndex: true,
        })
        console.log('DB CONECTADA')
    } catch (error) {
        console.log('hubo un error al conectad con la bd');
        console.log(error);
        process.exit(1); // detener la app
    }
}

module.exports = conectarDB;