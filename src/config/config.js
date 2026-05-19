import dotenv from 'dotenv';

dotenv.config();

if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be defined');
}
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined');
}

const config = {
    MONGO_URI: process.env.MONGO_URI,
    JWT_KEY: process.env.JWT_SECRET
};

export default config;