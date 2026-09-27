const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Cấu hình sử dụng file .env
dotenv.config();

const app = express();

// Middleware cơ bản
app.use(express.json()); 
app.use(cors());         

// Lấy thông tin cấu hình từ file .env
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Kiểm tra xem MONGO_URI đã có chưa
if (!MONGO_URI) {
    console.error("Lỗi: Chưa cấu hình MONGO_URI trong file .env!");
    process.exit(1);
}
// Khai báo Routes
const authRoute = require('./routes/auth');
app.use('/api/auth', authRoute);

const userRoute = require('./routes/users');
app.use('/api/users', userRoute);

const postRoute = require('./routes/posts');
app.use('/api/posts', postRoute);
// Kết nối với MongoDB thông qua Mongoose
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ Kết nối thành công đến cơ sở dữ liệu MongoDB Atlas!');
        
        // Khởi động Server lắng nghe sau khi kết nối DB thành công
        app.listen(PORT, () => {
            console.log(`🚀 Server đang chạy trên cổng http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('❌ Lỗi kết nối MongoDB:', error.message);
    });