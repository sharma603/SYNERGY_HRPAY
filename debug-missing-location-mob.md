# Debug Session: Missing Location MOB Data
Status: [OPEN]
Session ID: missing-location-mob

## 1. Symptoms
The columns "IN LOCATION (MOB)" and "OUT LOCATION (MOB)" are appearing in the Attendance Register table but show as "-" (dash), even though the user expects data to be there.

## 2. Hypotheses
- **H1 (SP Column Mismatch)**: The stored procedure `SynATTENDANCE_REGISTER` returns different column names than `ATT_IN_LOCATION_MOB` and `ATT_OUT_LOCATION_MOB`.
- **H2 (Mapping Logic Error)**: The grouping logic in `attendanceRegisterController.js` is not correctly assigning these values to the final objects.
- **H3 (Null/Empty Data)**: The data is actually NULL or empty in the database for the records being fetched.

## 3. Instrumentation Plan
- Instrument `attendanceRegisterController.js` to log the first few raw records from `SynATTENDANCE_REGISTER` to see the actual column names and values.
- Log the final `paginatedRecords` to see what is being sent to the frontend.

## 4. Evidence Collection
(Pending logs)

## 5. Analysis
(Pending)

## 6. Fix
(Pending)

## 7. Verification
(Pending)
