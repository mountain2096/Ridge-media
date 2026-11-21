const dns = require("node:dns");
const mongoose = require("mongoose");

// Optional. Some networks cannot resolve the "mongodb+srv://" (Atlas) address and fail with a DNS
// ETIMEOUT. Setting DNS_SERVERS=8.8.8.8,1.1.1.1 in .env makes Node use those DNS servers instead.
const configureDnsServers = () => {
    const servers = (process.env.DNS_SERVERS || "").split(",").map((item) => item.trim()).filter(Boolean);
    if (servers.length === 0) return;
    try {
        dns.setServers(servers);
        console.log(`Using DNS servers: ${servers.join(", ")}`);
    } catch (err) {
        console.error("Invalid DNS_SERVERS, using the system DNS:", err.message);
    }
};

const connectDB = async () =>{
    configureDnsServers();
    try {
        await mongoose.connect(process.env.MONGO_URI,{
            serverSelectionTimeoutMS: 5000,
        });

        console.log("MongoDB connected successfully");
    } catch(err){
        console.error("MongoDB connection failed: ", err.message);
        process.exit(1);
    }
};
module.exports = connectDB;
module.exports.configureDnsServers = configureDnsServers;
