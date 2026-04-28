# Boarding House Management System (MVP)

A simple Flask app to manage tenants, rooms, rent payments, movement tracking, and reporting.

## Features
- Tenant management (add/search/move out)
- Room management (create/view occupancy)
- Room assignment and transfer history
- Payment recording with paid/partial/unpaid/overdue status
- Monthly reporting (income, outstanding balances, paid/unpaid)
- Receipt generation and print support

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask --app app.py init-db
python app.py
```

Open `http://localhost:5000`.
