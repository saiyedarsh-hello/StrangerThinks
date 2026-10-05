# Hawkins Protocol — Security Backend

Standalone Node.js + Express TypeScript service that protects all tournament questions, answers, parity calculations, and ciphers from client inspection.

---

## 🔒 Security Architecture
- **Complete Client Isolation**: The frontend browser bundle never receives correct answers, regexes, target values, or evaluation logic.
- **Sanitized Public DTOs**: `GET /api/chapters` returns only the challenge prompt and option text with `isCorrect` stripped completely.
- **Server-Side Verification**: `POST /api/chapters/validate` evaluates submissions against the isolated in-memory vault.
- **Brute-Force Rate Limiting**: Built-in rate limiter throttles repeated verification attempts per IP/team.

---

## 🚀 Running the Backend

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Run in Development Mode (Live Reload)
```bash
npm run dev
```
Server starts on **http://localhost:5000**.

### 3. Production Build & Start
```bash
npm run build
npm start
```

---

## 📡 API Reference

### 1. Health Check
- **`GET /api/health`**
  - **Response**: `{ "status": "ONLINE", "sector": "HAWKINS_MAINFRAME_BACKEND" }`

### 2. Chapters
- **`GET /api/chapters`**
  - Returns all 7 chapters in sanitized form (zero answers, zero `isCorrect` flags).
- **`GET /api/chapters/:id`**
  - Returns a single sanitized chapter.
- **`POST /api/chapters/validate`**
  - **Payload**:
    ```json
    {
      "chapterId": 1,
      "taskId": "ch1-quiz",
      "answer": "A",
      "teamId": "T01"
    }
    ```
  - **Success Response**:
    ```json
    {
      "success": true,
      "pointsAwarded": 100,
      "message": "TELEMETRY VERIFIED · CLEARANCE GRANTED",
      "completionLore": { ... }
    }
    ```
  - **Failure Response**:
    ```json
    {
      "success": false,
      "pointsAwarded": 0,
      "error": "INVALID_CREDENTIALS",
      "message": "ACCESS DENIED · INCONSISTENT WITH VECTOR TELEMETRY"
    }
    ```

### 3. Radiometer & Lab Keypad
- **`POST /api/radiometer/validate-pin`**
  - **Payload**: `{ "pinIndex": 0, "answer": "8" }`
  - **Response**: `{ "success": true, "digit": "8", "pointsAwarded": 25 }`
- **`POST /api/radiometer/validate-keypad`**
  - **Payload**: `{ "code": "83479" }`
  - **Response**: `{ "success": true, "pointsAwarded": 100 }`
