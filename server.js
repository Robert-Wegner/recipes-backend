const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

// Configure multer to store uploads in ./uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads'); // ensure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// GET all recipes
app.get('/recipes', (req, res) => {
  fs.readFile('recipes.json', 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Error reading recipes.' });
    res.json(JSON.parse(data));
  });
});

// POST new/edited recipe
// Expect a field 'recipe' containing JSON string & optionally an 'image' file
app.post('/recipes', upload.single('image'), (req, res) => {
  fs.readFile('recipes.json', 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Error reading recipes.' });
    let recipes = JSON.parse(data);
    let newRecipe = JSON.parse(req.body.recipe);

    if (req.file) {
      // set imageUrl relative to our static folder
      newRecipe.imageUrl = `/uploads/${req.file.filename}`;
    }

    // For simplicity, push new recipe; you might check if it exists for editing
    recipes.push(newRecipe);

    fs.writeFile('recipes.json', JSON.stringify(recipes, null, 2), (err) => {
      if (err) return res.status(500).json({ error: 'Error saving recipe.' });
      res.json(newRecipe);
    });
  });
});

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
