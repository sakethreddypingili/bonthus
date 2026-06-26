import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
const envPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

const app = express();
app.use(cors());
app.use(express.json());

const url = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '';
const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectRef = match ? match[1] : '';
const password = process.env.SUPABASE_DB_PASSWORD;

if (!projectRef || !password) {
    console.error('Missing credentials in environment');
    process.exit(1);
}

const db = new pg.Pool({
    host: 'aws-1-ap-south-1.pooler.supabase.com',
    port: 5432,
    user: `postgres.${projectRef}`,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
});

// 1. GET /api/customers/search?phone=...
app.get('/api/customers/search', async (req, res) => {
    const { phone } = req.query;
    if (!phone) {
        return res.status(400).json({ success: false, error: 'Phone parameter is required' });
    }
    try {
        const { rows } = await db.query(
            'SELECT * FROM public.customers WHERE phone = $1',
            [phone.trim()]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. POST /api/repairs
app.post('/api/repairs', async (req, res) => {
    const { customer_id, store_id, product_name, product_brand, repair_type, notes, cost } = req.body;
    if (!customer_id || !product_name || !repair_type || cost === undefined) {
        return res.status(400).json({ success: false, error: 'Missing required repair fields' });
    }
    const numericCost = Number(cost);
    if (isNaN(numericCost) || numericCost < 0) {
        return res.status(400).json({ success: false, error: 'Cost must be a positive number' });
    }

    let finalStoreId = store_id;
    if (!finalStoreId || finalStoreId === "00000000-0000-0000-0000-000000000000") {
        try {
            const { rows: storeRows } = await db.query('SELECT id FROM public.stores LIMIT 1');
            if (storeRows && storeRows.length > 0) {
                finalStoreId = storeRows[0].id;
            } else {
                return res.status(400).json({ success: false, error: 'No stores available in database to link repair.' });
            }
        } catch (storeErr) {
            return res.status(500).json({ success: false, error: 'Store validation failed: ' + storeErr.message });
        }
    }

    try {
        const query = `
            INSERT INTO public.repairs (customer_id, store_id, product_name, product_brand, repair_type, notes, cost)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const { rows } = await db.query(query, [
            customer_id,
            finalStoreId,
            product_name,
            product_brand || null,
            repair_type,
            notes || null,
            numericCost
        ]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. GET /api/customers/:id/warranty
app.get('/api/customers/:id/warranty', async (req, res) => {
    try {
        const customerId = req.params.id;
        const query = `
            SELECT 
                i.invoice_number,
                p.name AS product_name,
                p.brand,
                i.created_at AS purchase_date,
                CASE 
                    WHEN i.created_at + INTERVAL '1 year' >= NOW() THEN 'Active'
                    ELSE 'Expired'
                END AS warranty_status,
                (i.created_at + INTERVAL '1 year')::date AS expiry_date
            FROM public.invoices i
            JOIN public.order_items oi ON oi.order_id = i.order_id
            JOIN public.products p ON p.id = oi.product_id
            WHERE i.customer_id = $1
            ORDER BY i.created_at DESC;
        `;
        const { rows } = await db.query(query, [customerId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. GET /api/categories
app.get('/api/categories', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, name, parent_id FROM public.categories ORDER BY name'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Express backend server running on port ${PORT}`);
});
