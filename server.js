const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors({
  origin: 'https://recipes-frontend-1.onrender.com',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // credentials: true, // only if you need cookies
}));

const SECRET_TOKEN = "secretToken";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Helpers to read/write recipes.json
function readRecipes(callback) {
  fs.readFile('recipes.json', 'utf8', (err, data) => {
    if (err) return callback(err);
    try {
      const recipes = JSON.parse(data);
      callback(null, recipes);
    } catch (e) {
      callback(e);
    }
  });
}

function writeRecipes(recipes, callback) {
  fs.writeFile('recipes.json', JSON.stringify(recipes, null, 2), callback);
}

// GET all recipes
app.get('/recipes', (req, res) => {
  readRecipes((err, recipes) => {
    if (err) return res.status(500).json({ error: 'Error reading recipes.' });
    res.json(recipes);
  });
});

// POST create/update recipe (with optional image)
app.post('/recipes', upload.single('image'), (req, res) => {
  const accessToken = req.body.accessToken;
  if (accessToken !== SECRET_TOKEN)
    return res.status(403).json({ error: 'Invalid access token.' });
  
  let newRecipe;
  try {
    newRecipe = JSON.parse(req.body.recipe);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid recipe JSON.' });
  }
  
  if (req.file) newRecipe.imageUrl = `/uploads/${req.file.filename}`;
  
  readRecipes((err, recipes) => {
    if (err) return res.status(500).json({ error: 'Error reading recipes.' });
    
    const index = recipes.findIndex(r => r.id === newRecipe.id);
    if (index !== -1) {
      recipes[index] = newRecipe; // update
    } else {
      recipes.push(newRecipe); // add new
    }
    
    writeRecipes(recipes, (err) => {
      if (err) return res.status(500).json({ error: 'Error saving recipe.' });
      res.json(newRecipe);
    });
  });
});

// POST delete recipe
app.post('/recipes/delete', (req, res) => {
  const { id, accessToken } = req.body;
  if (accessToken !== SECRET_TOKEN)
    return res.status(403).json({ error: 'Invalid access token.' });
  
  readRecipes((err, recipes) => {
    if (err) return res.status(500).json({ error: 'Error reading recipes.' });
    
    const newRecipes = recipes.filter(r => r.id !== id);
    if (newRecipes.length === recipes.length)
      return res.status(404).json({ error: 'Recipe not found.' });
    
    writeRecipes(newRecipes, (err) => {
      if (err) return res.status(500).json({ error: 'Error deleting recipe.' });
      res.json({ message: 'Recipe deleted successfully.' });
    });
  });
});

// POST copy recipe
app.post('/recipes/copy', (req, res) => {
  const { id, accessToken } = req.body;
  if (accessToken !== SECRET_TOKEN)
    return res.status(403).json({ error: 'Invalid access token.' });
  
  readRecipes((err, recipes) => {
    if (err) return res.status(500).json({ error: 'Error reading recipes.' });
    
    const recipeToCopy = recipes.find(r => r.id === id);
    if (!recipeToCopy)
      return res.status(404).json({ error: 'Recipe not found.' });
    
    // Create a copy with a new id and modified title
    const newRecipe = { 
      ...recipeToCopy, 
      id: Date.now().toString(), 
      title: recipeToCopy.title + " (Copy)" 
    };
    recipes.push(newRecipe);
    
    writeRecipes(recipes, (err) => {
      if (err) return res.status(500).json({ error: 'Error copying recipe.' });
      res.json(newRecipe);
    });
  });
});

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
