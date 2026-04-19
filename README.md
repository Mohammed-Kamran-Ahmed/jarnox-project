# 📈 JARNOX — Stock Data Intelligence Dashboard

A full-stack financial data platform built for the Jarnox Internship Assignment.  
Collects real-time NSE stock data, exposes clean REST APIs, and visualizes insights through an interactive React dashboard.

---

## 🚀 Live Demo

| Service | URL |
|---|---|
| Frontend | https://jarnox-project-z7ew.vercel.app/ |
| Backend API | https://jarnox-project-ydk6.onrender.com |


---

## 🧩 Features

- 📊 **Real-time stock data** via `yfinance` for top NSE companies
- 📉 **Interactive price chart** with 7-day Moving Average and Prediction line
- 🔢 **Calculated metrics** — Daily Return, MA7, 52W High/Low, Volatility Score
- 🏆 **Top Gainers & Losers** sidebar updated on every load
- 🔀 **Stock comparison** — head-to-head performance of any two companies
- ⚡ **Server-side caching** with `lru_cache` to avoid redundant API calls
- 📅 **Time filters** — 30-day and 90-day views

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI |
| Data | yfinance, Pandas, NumPy |
| Frontend | React, Chart.js |
| Deployment | Render (backend), Vercel (frontend) |

---

## 📁 Project Structure

```
jarnox/
├── main.py              # FastAPI backend
├── requirements.txt     # Python dependencies
├── README.md
└── frontend/
    └── src/
        └── App.js       # React frontend
```

---

## 🛠️ Local Setup

### Backend

```bash
# 1. Clone the repo
git clone https://github.com/Mohammed-Kamran-Ahmed/jarnox-project
cd jarnox-dashboard

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the server
uvicorn main:app --reload
```

Backend runs at: `http://localhost:8000`  


---

### Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs at: `http://localhost:3000`

> Make sure `App.js` has `const API = "http://localhost:8000"` for local development.

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/companies` | GET | Returns list of all tracked companies |
| `/data/{symbol}?days=30` | GET | Returns last N days of OHLC + metrics |
| `/summary/{symbol}` | GET | Returns 52W high, low, avg, volatility |
| `/compare?symbol1=X&symbol2=Y` | GET | Compares cumulative performance of two stocks |
| `/top` | GET | Returns top 3 gainers and losers |

Full interactive docs available at `/docs` (Swagger UI).

---

## 📊 Calculated Metrics

| Metric | Formula |
|---|---|
| Daily Return | `(Close - Open) / Open` |
| 7-day Moving Average | `Close.rolling(7).mean()` |
| Prediction | `Close.rolling(3).mean().shift(-1)` |
| Volatility Score | `Close.pct_change().std() * 100` |
| 52W High / Low | `High.max()` / `Low.min()` over 365 days |

---

## 💡 Custom Insight — Volatility Score

Beyond the required metrics, a **Volatility Score** was added to each stock summary.  
It measures the standard deviation of daily percentage returns over the past year, giving a quick signal of how "risky" or "stable" a stock has been — useful for comparing stocks beyond just price movement.

---

## ☁️ Deployment

### Backend → Render
1. Push code to GitHub
2. New Web Service on [render.com](https://render.com)
3. Start command: `uvicorn main:app --host 0.0.0.0 --port 8000`

### Frontend → Vercel
1. Update `const API` in `App.js` to your Render URL
2. Connect GitHub repo to [vercel.com](https://vercel.com)
3. Deploy

---

## 👤 Author

Built with ❤️ as part of the Jarnox Internship Assignment.
