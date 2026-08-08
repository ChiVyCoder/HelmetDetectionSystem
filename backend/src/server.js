const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const config = require('./config/config');
const videoRoutes = require('./routes/videoRoutes');

// Đảm bảo thư mục upload tồn tại
if (!fs.existsSync(config.UPLOAD_DIR)) {
    fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
}

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/video', videoRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Helmet Detection Backend đang chạy', ai_service: config.AI_SERVICE_URL });
});

app.listen(config.PORT, () => {
    console.log('='.repeat(50));
    console.log(`Backend đang chạy tại: http://localhost:${config.PORT}`);
    console.log(`AI Service trỏ tới: ${config.AI_SERVICE_URL}`);
    console.log('='.repeat(50));
});
