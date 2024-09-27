const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const app = express();
const port = 8080;
const audioDirectory = 'uploads/'; 

app.use(cors());
app.set('views', path.join(__dirname, 'public', 'views'));

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index');
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, audioDirectory)
  },
  filename: function (req, file, cb) {
    cb(null, req.body.name)
  }
})

const upload = multer({ storage: storage })

app.use(express.static('public'));
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

app.post('/upload', upload.fields([{ name: 'name', maxCount: 1 }, { name: 'blob' }]), async (req, res) => {
  try {
    const { name, blob } = req.files;

    res.status(200).send('File uploaded successfully!');
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send('Error uploading file');
  }
});

const uploadDir = path.join(__dirname, 'uploads');

app.get('/audioList', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      res.status(500).json({ error: 'Error reading audio files' });
      return;
    }

    const wavFiles = files.filter(file => {
      return path.extname(file).toLowerCase() === '.wav';
    });

    res.json(wavFiles);
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
