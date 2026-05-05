const express = require("express");
const cors = require("cors");
const Joi = require("joi");
const fs = require("fs").promises;
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PRODUCTS_FILE = path.join(__dirname, "products.json");

// Citire produse din JSON
async function readProducts() {
  const data = await fs.readFile(PRODUCTS_FILE, "utf-8");
  return JSON.parse(data);
}

// Scriere produse în JSON
async function writeProducts(data) {
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(data, null, 2));
}

// Schema validare produs
const productSchema = Joi.object({
  name: Joi.string().trim().min(2).required(),
  price: Joi.number().min(0.01).required(),
  quantity: Joi.number().integer().min(0).required(),
});

// GET - toate produsele
app.get("/api/products", async (req, res) => {
  try {
    const data = await readProducts();
    res.json(data.products);
  } catch (error) {
    res.status(500).json({ error: "Eroare la citirea produselor" });
  }
});

// GET - căutare produs (case-insensitive)
app.get("/api/products/search", async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name) {
      return res.status(400).json({ error: "Parametrul 'name' este obligatoriu" });
    }

    const data = await readProducts();
    const searchTerm = name.toLowerCase();
    
    const found = data.products.filter(p => 
      p.name.toLowerCase().includes(searchTerm)
    );

    if (found.length === 0) {
      return res.status(404).json({ 
        error: "Ne pare rău, produsul nu a fost găsit în magazinul nostru.",
        searchTerm: name
      });
    }

    res.json(found);
  } catch (error) {
    res.status(500).json({ error: "Eroare la căutarea produsului" });
  }
});

// POST - adaugă produs nou
app.post("/api/products", async (req, res) => {
  try {
    const { error, value } = productSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ errors: error.details.map(d => d.message) });
    }

    const data = await readProducts();
    
    // Verificare duplicat
    const duplicate = data.products.find(p => 
      p.name.toLowerCase() === value.name.toLowerCase()
    );
    
    if (duplicate) {
      return res.status(409).json({ 
        error: `Produsul "${value.name}" există deja.`
      });
    }

    const newId = data.products.length > 0 
      ? Math.max(...data.products.map(p => p.id)) + 1 
      : 1;

    const newProduct = {
      id: newId,
      name: value.name,
      price: value.price,
      quantity: value.quantity,
      createdAt: new Date().toISOString()
    };

    data.products.push(newProduct);
    await writeProducts(data);

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: "Eroare la adăugarea produsului" });
  }
});

// PUT - actualizare produs
app.put("/api/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID invalid" });
    }

    const { error, value } = productSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ errors: error.details.map(d => d.message) });
    }

    const data = await readProducts();
    const index = data.products.findIndex(p => p.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: "Produsul nu a fost găsit" });
    }

    data.products[index] = {
      ...data.products[index],
      name: value.name,
      price: value.price,
      quantity: value.quantity,
      updatedAt: new Date().toISOString()
    };

    await writeProducts(data);
    res.json(data.products[index]);
  } catch (error) {
    res.status(500).json({ error: "Eroare la actualizarea produsului" });
  }
});

// DELETE - șterge produs
app.delete("/api/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID invalid" });
    }

    const data = await readProducts();
    const index = data.products.findIndex(p => p.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: "Produsul nu a fost găsit" });
    }

    data.products.splice(index, 1);
    await writeProducts(data);

    res.json({ message: "Produs șters cu succes" });
  } catch (error) {
    res.status(500).json({ error: "Eroare la ștergerea produsului" });
  }
});

// Rută de test
app.get("/", (req, res) => {
  res.json({ 
    message: "Product Search API funcționează!",
    endpoints: {
      getAllProducts: "GET /api/products",
      searchProduct: "GET /api/products/search?name=...",
      addProduct: "POST /api/products",
      updateProduct: "PUT /api/products/:id",
      deleteProduct: "DELETE /api/products/:id"
    }
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✓ Server pornit pe http://localhost:${PORT}`);
});