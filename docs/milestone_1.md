# Milestone 1 – Room Management

## Objective

Build the complete room management module and migrate it from a frontend prototype to a real backend using Django REST Framework and PostgreSQL.

## Status

**Completed ✅**

---

## Technology Stack

- Frontend: Next.js + TypeScript
- Backend: Django REST Framework
- Database: PostgreSQL
- API: REST (GET, POST, PATCH)

---

## Completed Features

- Add a new room
- View all active rooms
- View complete room details
- Edit room information
- Change room status
- Deactivate a room (soft delete)
- Persist room data in PostgreSQL

---

## Room Information

### Required Fields

- Room Number/Name
- Room Type
- Price per night
- Status

### Optional Fields

- Description
- Amenities
- Images _(UI only – backend storage pending)_
- Bed Type
- Maximum Occupancy
- Floor/Location
- Internal Notes

---

## Room Statuses

- Available
- Reserved
- Occupied
- Cleaning
- Maintenance

Deactivated rooms are hidden from active listings but remain in the database by setting `active = false`.

---

## Backend Architecture

Next.js communicates with Django through REST APIs.

| Method | Endpoint          | Purpose     |
| ------ | ----------------- | ----------- |
| GET    | `/api/rooms/`     | List rooms  |
| POST   | `/api/rooms/`     | Create room |
| GET    | `/api/rooms/:id/` | View room   |
| PATCH  | `/api/rooms/:id/` | Update room |

---

## Database

The Room model contains:

- Room Number/Name
- Room Type
- Price per Night
- Status
- Description
- Amenities
- Bed Type
- Maximum Occupancy
- Floor/Location
- Internal Notes
- Active
- Created At
- Updated At

---

## Important Notes

- Styling is intentionally postponed until all core modules are completed.
- Room images will be implemented with proper file storage later.
- Soft delete is used instead of permanent deletion to preserve room history.
- Room Management is fully connected to PostgreSQL.

---

## Next Milestone

**Guest Management**

The next module will introduce guest registration before building Reservations, Check-in, and Check-out.

# Milestone 2 – Guest Management

## Objective

Build the guest management module for the lodge management system.

The module allows lodge staff to create, view, search, edit, deactivate, and reactivate guest records. Guest information is stored in the backend database rather than browser storage.

## Completed Features

- Add a new guest
- View all active guests
- View complete guest profile
- Edit guest information
- Deactivate a guest
- Reactivate a deactivated guest
- Search guests by name
- Search guests by phone number
- Preserve deactivated guest records
- Display guest active/inactive status

## Guest Information

### Required Fields

- Full Name
- Phone Number

### Optional Fields

- Email
- Address
- ID Type
- ID Number
- Gender
- Notes

## Identification Types

The system currently supports:

- National ID
- Driver's License
- Passport

## Gender Options

The system currently supports:

- Male
- Female
- Other

## Guest Status

Guests have an `active` field.

### Active

An active guest appears in the normal guest list and can be used normally within the system.

### Deactivated

A deactivated guest is not permanently deleted.

The guest record remains in the database with:

```text
active = false
```

Deactivated guests can still be found through the search functionality and can be reactivated when necessary.

## Search

The guest API supports searching by:

- Guest name
- Phone number

Examples:

```text
/api/guests/?search=Mary
```

```text
/api/guests/?search=08098765432
```

The backend performs the search using Django query filtering rather than relying on browser storage.

## Backend

Guest data is managed through the Django REST Framework API.

The API supports:

- GET — retrieve guests
- POST — create guests
- PATCH — update guest information
- DELETE — available through the REST API, although the frontend uses deactivation rather than permanent deletion

Guest records are stored in the PostgreSQL database.

## Frontend

The Next.js frontend communicates with the Django API to:

- Retrieve guests
- Create guests
- Update guests
- Search guests
- Deactivate guests
- Reactivate guests
- Display guest profiles

Guest data is no longer dependent on `localStorage`.

## Deactivation Strategy

Permanent deletion is not used as the normal frontend workflow.

Instead, guests are deactivated using:

```text
active = false
```

This preserves historical guest information and allows the guest to be restored later.

## Current Guest Workflow

The current workflow is:

```text
Add Guest
    ↓
Guest appears in active guest list
    ↓
View Guest Profile
    ↓
Edit Guest
    ↓
Search Guest
    ↓
Deactivate Guest
    ↓
Guest remains in database
    ↓
Search for inactive guest
    ↓
Reactivate Guest
```

## Important Design Decisions

- Guest records are stored in the backend database.
- Browser `localStorage` is no longer used for guest data.
- Deactivation is preferred over permanent deletion.
- Deactivated guests remain searchable.
- Search supports both name and phone number.
- Guest history will be handled later through the Reservations system.
- Styling has intentionally remained secondary to functionality during the early development stages.

## Current Status

**Milestone 2 – Guest Management: COMPLETE**

The Guest Management module is ready for integration with the Reservations module.

## Next Module

### Milestone 3 – Reservations

The Reservations module will connect:

```text
Guest + Room + Dates + Reservation
```

The reservation design will cover:

- Booking information
- Guest-room relationship
- Check-in date
- Check-out date
- Reservation status
- Room availability
- Double-booking prevention
- Cancellation
- Check-in and check-out workflow
- Future payment integration

Reservations will be designed and implemented next.
