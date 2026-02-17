# How to Run ResQMeals in Separate Terminals

To run the frontend and backend simultaneously, you need two separate terminal instances.

## 1. Backend Terminal
Open your first terminal and run the following commands:

```bash
cd backend
npm run dev
```
Wait for it to say `Server running on port 5001`.

## 2. Frontend Terminal
Open a **new** terminal window or split pane (in VS Code: `Ctrl + Shift + \` or `Terminal -> New Terminal`).
Then run:

```bash
cd frontend
npm run dev
```
Wait for it to show the local URL (e.g., `http://localhost:5173/`).

## Access the App
Open your browser and navigate to: **[http://localhost:5173/](http://localhost:5173/)**
