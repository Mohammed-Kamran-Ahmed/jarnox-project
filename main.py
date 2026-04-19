from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from functools import lru_cache

app = FastAPI()

# CORS (allow React frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stock list
COMPANIES = [
    {"symbol": "RELIANCE.NS", "name": "Reliance"},
    {"symbol": "TCS.NS", "name": "TCS"},
    {"symbol": "INFY.NS", "name": "Infosys"},
    {"symbol": "HDFCBANK.NS", "name": "HDFC Bank"},
    {"symbol": "TATAMOTORS.NS", "name": "Tata Motors"}
]

# Fetch + clean data
@lru_cache(maxsize=10)
def fetch_stock(symbol):
    end = datetime.now()
    start = end - timedelta(days=365)

    try:
        df = yf.download(symbol, start=start, end=end, progress=False)
    except:
        return None

    if df is None or df.empty:
        return None

    # Fix multi-index issue
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    # Keep required columns + force numeric
    df = df[['Open', 'High', 'Low', 'Close']].apply(pd.to_numeric, errors='coerce')

    # Fill missing values
    df = df.ffill().bfill()

    # Metrics
    df['MA7'] = df['Close'].rolling(7).mean()
    df['Prediction'] = df['Close'].rolling(3).mean().shift(-1)
    df['Daily_Return'] = (df['Close'] - df['Open']) / df['Open']

    # Final cleanup
    df = df.replace([float("inf"), float("-inf")], 0)
    df = df.fillna(0)

    return df


# ------------------ APIs ------------------

@app.get("/companies")
def get_companies():
    return COMPANIES


@app.get("/data/{symbol}")
def get_data(symbol: str, days: int = 30):
    df = fetch_stock(symbol)

    if df is None:
        raise HTTPException(status_code=404, detail="No data")

    df = df.tail(int(days)).reset_index()

    # Fix date column
    if 'Date' not in df.columns:
        df.rename(columns={'index': 'Date'}, inplace=True)

    df['Date'] = df['Date'].dt.strftime('%b %d')

    return df[['Date', 'Close', 'MA7', 'Prediction', 'Daily_Return']].to_dict(orient="records")


@app.get("/summary/{symbol}")
def get_summary(symbol: str):
    df = fetch_stock(symbol)

    if df is None:
        raise HTTPException(status_code=404, detail="No data")

    current = float(df['Close'].iloc[-1])
    prev = float(df['Close'].iloc[-2])

    return {
        "current": round(current, 2),
        "change": round(((current - prev) / prev) * 100, 2),
        "high": round(float(df['High'].max()), 2),
        "low": round(float(df['Low'].min()), 2),
        "avg": round(float(df['Close'].mean()), 2),
        "volatility": round(float(df['Close'].pct_change().std() * 100), 2)
    }


@app.get("/compare")
def compare(symbol1: str, symbol2: str):
    df1 = fetch_stock(symbol1)
    df2 = fetch_stock(symbol2)

    if df1 is None or df2 is None:
        raise HTTPException(status_code=404, detail="Comparison data unavailable")

    return {
        "symbol1": symbol1,
        "symbol2": symbol2,
        "perf1": round(float(df1['Close'].pct_change().sum()), 2),
        "perf2": round(float(df2['Close'].pct_change().sum()), 2)
    }


@app.get("/top")
def top():
    results = []

    for c in COMPANIES:
        df = fetch_stock(c["symbol"])

        if df is None or df.empty:
            continue

        try:
            change = float(df['Close'].pct_change().iloc[-1] * 100)

            if pd.isna(change):
                continue

            results.append((c["name"], change))
        except:
            continue

    if not results:
        return {"gainers": [], "losers": []}

    results.sort(key=lambda x: x[1], reverse=True)

    return {
        "gainers": results[:3],
        "losers": results[-3:]
    }