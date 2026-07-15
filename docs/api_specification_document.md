# API Specification Document
## Project: Healthcare Appointment & Follow-up Manager

This document defines the complete REST API specification. Designed from the perspective of an API Architect, it outlines endpoints, payloads, validation rules, status codes, and error conditions across all modules.

---

## 1. Global Standard Formats

### 1.1 Error Response Template
```json
{
  "success": false,
  "errorCode": "ERR_ERROR_CODE",
  "message": "User-friendly description of error context.",
  "timestamp": "2026-07-12T14:14:25Z",
  "details": []
}
```

### 1.2 Pagination Query Parameters
*   `page`: `integer` (default: `1`)
*   `limit`: `integer` (default: `20`, max: `100`)

---

## 2. API Endpoint Specification

---

### 2.1 Authentication Module

#### Endpoint: Register User
*   **Purpose**: Allows patients to register a new account.
*   **HTTP Method**: `POST`
*   **URL**: `/api/v1/auth/register`
*   **Authentication Required**: No
*   **Role Required**: None
*   **Request Body**:
    ```json
    {
      "email": "patient@example.com",
      "password": "StrongPassword123!",
      "firstName": "John",
      "lastName": "Doe",
      "dob": "1990-05-15",
      "phoneNumber": "+1234567890"
    }
    ```
*   **Validation**: 
    *   `email` must be valid format.
    *   `password` min 8 chars, 1 uppercase, 1 number, 1 special char.
    *   `dob` must be past date.
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "message": "User registered successfully.",
      "data": { "userId": "user-uuid-1234" }
    }
    ```
*   **Possible Errors**: 
    *   `400 Bad Request`: Validation failure.
    *   `409 Conflict` (`ERR_EMAIL_TAKEN`): Email already in use.

#### Endpoint: Login User
*   **Purpose**: Authenticate user and issue session token.
*   **HTTP Method**: `POST`
*   **URL**: `/api/v1/auth/login`
*   **Authentication Required**: No
*   **Role Required**: None
*   **Request Body**:
    ```json
    {
      "email": "patient@example.com",
      "password": "StrongPassword123!"
    }
    ```
*   **Validation**: `email` valid, `password` non-empty.
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "accessToken": "jwt-access-token-string",
        "mfaRequired": false,
        "user": { "id": "user-uuid-1234", "role": "PATIENT" }
      }
    }
    ```
*   **Possible Errors**:
    *   `401 Unauthorized` (`ERR_INVALID_CREDENTIALS`): Bad email/password.

---

### 2.2 Users & Profiles Module

#### Endpoint: Get Self Profile
*   **Purpose**: Retrieve logged-in user's profile card.
*   **HTTP Method**: `GET`
*   **URL**: `/api/v1/users/profile`
*   **Authentication Required**: Yes
*   **Role Required**: `PATIENT`, `DOCTOR`, `ADMIN`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "id": "user-uuid-1234",
        "email": "user@example.com",
        "role": "PATIENT",
        "patientProfile": {
          "firstName": "John",
          "lastName": "Doe",
          "dob": "1990-05-15"
        }
      }
    }
    ```
*   **Possible Errors**:
    *   `401 Unauthorized`: Token missing or expired.

---

### 2.3 Doctors Module

#### Endpoint: Search/List Doctors
*   **Purpose**: Patient-facing doctor directory with filters.
*   **HTTP Method**: `GET`
*   **URL**: `/api/v1/doctors`
*   **Authentication Required**: Yes
*   **Role Required**: `PATIENT`
*   **Pagination / Filtering / Sorting**:
    *   Query params: `page`, `limit`, `specialty` (filter), `search` (name filter), `sortBy` (e.g., name, rating), `sortOrder` (asc/desc).
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "doctors": [
          {
            "id": "doc-uuid-5678",
            "firstName": "Sarah",
            "lastName": "Jenkins",
            "specialty": "Cardiology"
          }
        ],
        "meta": { "total": 1, "page": 1, "totalPages": 1 }
      }
    }
    ```

---

### 2.4 Patients Module

#### Endpoint: Get Patient Medical Records
*   **Purpose**: Retrieves full medical record history for a patient.
*   **HTTP Method**: `GET`
*   **URL**: `/api/v1/patients/:id/records`
*   **Authentication Required**: Yes
*   **Role Required**: `DOCTOR`, `ADMIN` (or `PATIENT` matching requested ID)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "patientId": "patient-uuid-1111",
        "records": [
          {
            "appointmentId": "app-uuid-9999",
            "visitDate": "2026-07-10",
            "doctorName": "Dr. Sarah Jenkins",
            "clinicalNotes": "Patient presents with minor palpitations..."
          }
        ]
      }
    }
    ```
*   **Possible Errors**:
    *   `403 Forbidden` (`ERR_UNAUTHORIZED_ACCESS`): Patient trying to access another patient's files.

---

### 2.5 Appointments Module

#### Endpoint: Book Appointment
*   **Purpose**: Book an appointment slot.
*   **HTTP Method**: `POST`
*   **URL**: `/api/v1/appointments`
*   **Authentication Required**: Yes
*   **Role Required**: `PATIENT`
*   **Request Body**:
    ```json
    {
      "doctorId": "doc-uuid-5678",
      "scheduledStart": "2026-07-13T10:00:00Z",
      "symptomDescription": "Occasional chest tightness"
    }
    ```
*   **Validation**: `scheduledStart` must be in the future.
*   **Response (210 Created)**:
    ```json
    {
      "success": true,
      "data": {
        "appointmentId": "app-uuid-9999",
        "status": "BOOKED"
      }
    }
    ```
*   **Possible Errors**:
    *   `409 Conflict` (`ERR_SLOT_BOOKED`): Race condition slot double booking.

---

### 2.6 Schedules Module

#### Endpoint: Configure Availability
*   **Purpose**: Doctor configures standard working hours.
*   **HTTP Method**: `PUT`
*   **URL**: `/api/v1/schedules`
*   **Authentication Required**: Yes
*   **Role Required**: `DOCTOR`
*   **Request Body**:
    ```json
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "17:00",
      "slotDurationMinutes": 30
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Availability schedule updated."
    }
    ```

---

### 2.7 Leaves Module

#### Endpoint: Request Leave
*   **Purpose**: Doctor files emergency blockout leave.
*   **HTTP Method**: `POST`
*   **URL**: `/api/v1/leaves`
*   **Authentication Required**: Yes
*   **Role Required**: `DOCTOR`
*   **Request Body**:
    ```json
    {
      "startDate": "2026-08-01T00:00:00Z",
      "endDate": "2026-08-07T23:59:59Z"
    }
    ```
*   **Response (202 Accepted)**:
    ```json
    {
      "success": true,
      "message": "Leave request received. Cancellation processing initialized."
    }
    ```

---

### 2.8 Notifications Module

#### Endpoint: List Patient Notifications
*   **Purpose**: Get recent notification tickers for a patient.
*   **HTTP Method**: `GET`
*   **URL**: `/api/v1/notifications`
*   **Authentication Required**: Yes
*   **Role Required**: `PATIENT`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "notif-uuid-11",
          "subject": "Medication Reminder",
          "body": "Take Lisinopril 10mg.",
          "isRead": false,
          "dispatchedAt": "2026-07-12T08:00:00Z"
        }
      ]
    }
    ```

---

### 2.9 Prescriptions Module

#### Endpoint: Create Prescription
*   **Purpose**: Doctor logs a prescription at appointment end.
*   **HTTP Method**: `POST`
*   **URL**: `/api/v1/prescriptions`
*   **Authentication Required**: Yes
*   **Role Required**: `DOCTOR`
*   **Request Body**:
    ```json
    {
      "appointmentId": "app-uuid-9999",
      "clinicalNotes": "Prescribed ACE inhibitors for hypertension.",
      "medications": [
        {
          "name": "Lisinopril",
          "dosage": "10mg",
          "frequencyCron": "0 8 * * *"
        }
      ]
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "data": { "prescriptionId": "presc-uuid-4444" }
    }
    ```

---

### 2.10 AI Services Module

#### Endpoint: Perform AI Triage
*   **Purpose**: Evaluates symptoms using the LLM gateway.
*   **HTTP Method**: `POST`
*   **URL**: `/api/v1/ai/triage`
*   **Authentication Required**: Yes
*   **Role Required**: `PATIENT`
*   **Request Body**:
    ```json
    {
      "symptomText": "I have sudden breathing tightness and dry cough."
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "urgencyLevel": "URGENT",
        "suggestedSpecialty": "Pulmonology",
        "disclaimer": "AI suggestion only. Dial 911 if experiencing an emergency."
      }
    }
    ```

---

### 2.11 Calendar Sync Module

#### Endpoint: Sync Calendar
*   **Purpose**: Trigger manual synchronization check against Google Calendar.
*   **HTTP Method**: `POST`
*   **URL**: `/api/v1/calendar/sync`
*   **Authentication Required**: Yes
*   **Role Required**: `DOCTOR`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Calendar synchronization completed successfully."
    }
    ```

---

### 2.12 Dashboard Module

#### Endpoint: Get System Metrics
*   **Purpose**: Retrieve operations numbers.
*   **HTTP Method**: `GET`
*   **URL**: `/api/v1/dashboard/metrics`
*   **Authentication Required**: Yes
*   **Role Required**: `ADMIN`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "activeUsers": 1420,
        "totalAppointments": 430,
        "aiPipelineLoad": 12,
        "dbReadLatencyMs": 14
      }
    }
    ```
