const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = 3000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== TEST =====
app.get('/', (req, res) => {
    res.send('Server Running 🚀');
});


// ================= REGISTER =================
app.post('/register', (req, res) => {

    const { name, email, password, role, phone, district } = req.body;

    db.query(
        "INSERT INTO users (name,email,password,role,phone,district) VALUES (?,?,?,?,?,?)",
        [name, email, password, role, phone, district],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "DB error" });
            }
            res.json({ message: "Registered successfully" });
        }
    );
});


// ================= LOGIN =================
app.post('/login', (req, res) => {

    const { email, password } = req.body;

    db.query(
        "SELECT * FROM users WHERE email=? AND password=?",
        [email, password],
        (err, result) => {

            if (err) {
                console.log(err);
                return res.status(500).json({ message: "DB error" });
            }

            if (result.length > 0) {
                res.json({ success: true, user: result[0] });
            } else {
                res.json({ success: false });
            }
        }
    );
});


// ================= ADD CROP =================
app.post('/addCrop', (req, res) => {

    const { user_id, crop_name, price, quantity } = req.body;

    if (!user_id || !crop_name) {
        return res.json({ message: "Missing fields" });
    }

    db.query(
        "INSERT INTO crops (user_id,crop_name,price,quantity) VALUES (?,?,?,?)",
        [user_id, crop_name, price, quantity],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Error adding crop" });
            }
            res.json({ message: "Crop added 🌾" });
        }
    );
});


// ================= GET CROPS =================
app.get('/getCrops', (req, res) => {

    db.query("SELECT * FROM crops", (err, result) => {
        if (err) {
            console.log(err);
            return res.json([]);
        }
        res.json(result);
    });
});


// ================= PLACE ORDER =================
// ================= PLACE ORDER =================
app.post('/placeOrder', (req, res) => {

    const { crop_id, buyer_id, quantity } = req.body;
    const qty = parseInt(quantity);

    // 1. Check crop stock
    db.query(
        "SELECT quantity FROM crops WHERE id=?",
        [crop_id],
        (err, result) => {

            if (err) {
                console.log(err);
                return res.json({ message: "DB error" });
            }

            if (!result.length) {
                return res.json({ message: "Crop not found" });
            }

            if (result[0].quantity < qty) {
                return res.json({ message: "Not enough stock" });
            }

            // 2. Insert order
            db.query(
                "INSERT INTO orders (crop_id, buyer_id, quantity) VALUES (?,?,?)",
                [crop_id, buyer_id, qty],
                (err2, result2) => {

                    if (err2) {
                        console.log(err2);
                        return res.json({ message: "Order failed" });
                    }

                    const orderId = result2.insertId;

                    // 3. Reduce stock
                    db.query(
                        "UPDATE crops SET quantity = quantity - ? WHERE id=?",
                        [qty, crop_id],
                        () => {

                            // 4. Create delivery entry
                            db.query(
                                "INSERT INTO deliveries (order_id, delivery_boy) VALUES (?,?)",
                                [orderId, "Not Assigned"]
                            );

                            res.json({ message: "Order placed 🚀" });
                        }
                    );
                }
            );
        }
    );
});
// ================= DEMAND PREDICTION =================
app.get('/demandPrediction', (req, res) => {

    db.query(`
        SELECT crops.crop_name, COUNT(orders.id) as orders
        FROM crops
        LEFT JOIN orders ON crops.id = orders.crop_id
        GROUP BY crops.id
    `, (err, result) => {

        if (err) {
            console.log(err);
            return res.json([]);
        }

        const output = result.map(item => {

            item.orders = item.orders || 0;

            let demand = "Low";
            let suggestion = "Avoid planting ❌";

            if (item.orders >= 3) {
                demand = "Medium";
                suggestion = "Good 👍";
            }
            if (item.orders >= 6) {
                demand = "High";
                suggestion = "Grow more 🚀";
            }

            return { ...item, demand, suggestion };
        });

        res.json(output);
    });
});


// ================= RISK PREDICTION =================
app.get('/riskPrediction', (req, res) => {

    db.query(`
        SELECT crops.crop_name, crops.quantity, COUNT(orders.id) as orders
        FROM crops
        LEFT JOIN orders ON crops.id = orders.crop_id
        GROUP BY crops.id
    `, (err, result) => {

        if (err) {
            console.log(err);
            return res.json([]);
        }

        const output = result.map(item => {

            item.orders = item.orders || 0;

            let risk = "Low";

            if (item.quantity > 50 && item.orders === 0) {
                risk = "High ❌";
            }
            else if (item.quantity > 20 && item.orders < 3) {
                risk = "Medium ⚠️";
            }

            return { ...item, risk };
        });

        res.json(output);
    });
});


// ================= ADD REVIEW =================
app.post('/addReview', (req, res) => {

    const { crop_id, buyer_id, rating, comment } = req.body;

    db.query(
        "INSERT INTO reviews (crop_id, buyer_id, rating, comment) VALUES (?,?,?,?)",
        [crop_id, buyer_id, rating, comment],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Error adding review" });
            }
            res.json({ message: "Review added ⭐" });
        }
    );
});
// ================= GET MY CROPS =================
app.get('/myCrops/:id', (req, res) => {

    const userId = req.params.id;

    db.query(
        "SELECT * FROM crops WHERE user_id=?",
        [userId],
        (err, result) => {

            if (err) {
                console.log(err);
                return res.json([]);
            }

            res.json(result);
        }
    );
});
// ================= DISTRICT HEATMAP =================
app.get('/districtHeatmap', (req, res) => {

    db.query(`
        SELECT users.district, COUNT(orders.id) AS total_orders
        FROM orders
        JOIN users ON orders.buyer_id = users.id
        GROUP BY users.district
    `, (err, result) => {

        if (err) {
            console.log(err);
            return res.json([]);
        }

        res.json(result);
    });
});
app.post('/askHelp', (req, res) => {

    const { user_id, question } = req.body;

    db.query(
        "INSERT INTO help_requests (user_id, question) VALUES (?,?)",
        [user_id, question],
        (err) => {

            if (err) {
                console.log(err);
                return res.json({ message: "Error" });
            }

            res.json({ message: "Question sent ✅" });
        }
    );
});
app.get('/myHelp/:id', (req, res) => {

    db.query(
        "SELECT * FROM help_requests WHERE user_id=?",
        [req.params.id],
        (err, result) => {

            if (err) return res.json([]);

            res.json(result);
        }
    );
});
app.get('/allHelp', (req, res) => {

    db.query(
        "SELECT help_requests.*, users.name FROM help_requests JOIN users ON help_requests.user_id = users.id",
        (err, result) => {

            if (err) return res.json([]);

            res.json(result);
        }
    );
});
app.post('/replyHelp', (req, res) => {

    const { id, reply } = req.body;

    db.query(
        "UPDATE help_requests SET reply=?, status='Answered' WHERE id=?",
        [reply, id],
        (err) => {

            if (err) return res.json({ message: "Error" });

            res.json({ message: "Reply sent ✅" });
        }
    );
});
// ================= GET REVIEWS =================
app.get('/getReviews/:crop_id', (req, res) => {

    db.query(`
        SELECT reviews.*, users.name as buyer_name
        FROM reviews
        JOIN users ON reviews.buyer_id = users.id
        WHERE crop_id=?
    `, [req.params.crop_id], (err, result) => {

        if (err) {
            console.log(err);
            return res.json([]);
        }

        res.json(result);
    });
});

// ================= MY ORDERS =================
app.get('/myOrders/:id', (req, res) => {

    const userId = req.params.id;

    db.query(`
        SELECT orders.*, crops.crop_name
        FROM orders
        JOIN crops ON orders.crop_id = crops.id
        WHERE orders.buyer_id = ?
    `, [userId], (err, result) => {

        if (err) {
            console.log(err);
            return res.json([]);
        }

        res.json(result);
    });
});
const axios = require('axios');

// ================= WEATHER API =================
app.get('/weather/:city', async (req, res) => {

    const city = req.params.city;
    const apiKey = "cfdd51ab7b17131846e1a73343a7824c";

    try {
        const response = await axios.get(
            "https://api.openweathermap.org/data/2.5/weather",
            {
                params: {
                    q: city,
                    appid: apiKey,
                    units: "metric"
                }
            }
        );

        const data = response.data;

        res.json({
            city: data.name,
            temp: data.main.temp,
            weather: data.weather[0].description,
            humidity: data.main.humidity,
            wind: data.wind.speed
        });

    } catch (err) {
        console.log(err.response?.data || err.message);
        res.status(500).json({ message: "Weather error" });
    }
});
// db.query(
//     "INSERT INTO orders (crop_id,buyer_id,quantity) VALUES (?,?,?)",
//     [crop_id, buyer_id, qty],
//     (err, result) => {

//         db.query(
//             "UPDATE crops SET quantity = quantity - ? WHERE id=?",
//             [qty, crop_id],
//             () => {

//                 // ✅ DELIVERY CREATED HERE
//                 db.query(
//                     "INSERT INTO deliveries (order_id, delivery_boy) VALUES (?,?)",
//                     [result.insertId, "Not Assigned"]
//                 );

//                 res.json({ message: "Order placed 🚀" });
//             }
//         );
//     }
// );
app.get('/delivery/:order_id', (req, res) => {

    db.query(
        "SELECT * FROM deliveries WHERE order_id=?",
        [req.params.order_id],
        (err, result) => {

            if (err) {
                return res.json([]);
            }

            res.json(result[0] || {});
        }
    );
});
// ================= ADD VEHICLE =================
// ================= ADD VEHICLE =================
app.post('/addVehicle', (req, res) => {

    const { user_id, vehicle_type, vehicle_number, price_per_km } = req.body;

    db.query(
        "INSERT INTO vehicles (user_id, vehicle_type, vehicle_number, price_per_km) VALUES (?,?,?,?)",
        [user_id, vehicle_type, vehicle_number, price_per_km],
        (err) => {

            if (err) {
                console.log(err);
                return res.status(500).json({ message: "DB error" });
            }

            res.json({ message: "Vehicle added 🚚" });
        }
    );
});
// ================= GET VEHICLES =================
app.get('/getVehicles/:user_id', (req, res) => {

    db.query(
        "SELECT * FROM vehicles WHERE user_id=?",
        [req.params.user_id],
        (err, result) => {

            if (err) {
                console.log(err);
                return res.json([]);
            }

            res.json(result);
        }
    );
});
app.get('/getDeliveryPartners/:id', (req, res) => {

    const userId = req.params.id;

    db.query(
        "SELECT * FROM users WHERE role='driver' AND id != ?",
        [userId],
        (err, result) => {

            if (err) return res.json([]);

            res.json(result);
        }
    );
});

// const apiKey = "c8d5fb3e6fb048edd8d7fccc84426960";
// ================= START SERVER =================
app.listen(PORT, () => {
    console.log("Server running on http://localhost:3000");
});