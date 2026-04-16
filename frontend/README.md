# AI Voice Agent Frontend

This is an optional Angular front end for submitting outbound call requests to the Python backend.

## Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the frontend:

```bash
npm start
```

3. Open `http://localhost:4200`.

## Notes

- The app sends POST requests to `http://localhost:3000/api/call` by default.
- Update `src/environments/environment.ts` if your backend is running on a different host or port.
