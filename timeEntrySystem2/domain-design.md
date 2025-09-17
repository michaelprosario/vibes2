# Personal Time Tracking System - Domain Design

## Overview
This document outlines the technical design for a personal time tracking system based on the requirements specified in `requirements.md`. The system follows Domain-Driven Design principles with clear separation between entities and services.

## Domain Entities

### 1. User Entity
**Purpose**: Represents a system user and their preferences

**Attributes**:
- `user_id` (UUID, Primary Key): Unique identifier
- `username` (String, Required): User's display name
- `email` (String, Optional): User's email address
- `preferences` (JSON): User preferences and settings
- `created_at` (DateTime): Account creation timestamp
- `updated_at` (DateTime): Last modification timestamp

**Business Rules**:
- Username must be unique if provided
- Preferences include UI settings, default project, keyboard shortcuts

### 2. Project Entity
**Purpose**: Represents a work project or client initiative

**Attributes**:
- `project_id` (UUID, Primary Key): Unique identifier
- `user_id` (UUID, Foreign Key): Owner of the project
- `name` (String, Required): Project name
- `description` (String, Optional): Project description
- `color_code` (String, Optional): Hex color for visual identification
- `status` (Enum): Active, Completed, Archived
- `deadline` (Date, Optional): Project deadline
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last modification timestamp

**Business Rules**:
- Project names must be unique per user
- Color codes must be valid hex colors
- Archived projects cannot have new time entries
- Status transitions: Active ↔ Completed ↔ Archived

**Relationships**:
- One-to-Many with TimeEntry (project can have multiple time entries)
- Many-to-One with User (user can have multiple projects)

### 3. TimeEntry Entity
**Purpose**: Represents an individual work session

**Attributes**:
- `entry_id` (UUID, Primary Key): Unique identifier
- `user_id` (UUID, Foreign Key): Owner of the time entry
- `project_id` (UUID, Foreign Key): Associated project
- `timesheet_id` (UUID, Foreign Key, Optional): Associated timesheet
- `description` (String, Optional): Work description
- `start_time` (DateTime, Required): When work started
- `end_time` (DateTime, Optional): When work ended
- `duration_minutes` (Integer, Computed): Calculated duration
- `is_running` (Boolean): Whether timer is currently active
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last modification timestamp

**Business Rules**:
- Start time cannot be in the future
- End time must be after start time
- Only one running timer per user at a time
- Duration is automatically calculated from start/end times
- Cannot be associated with archived projects

**Relationships**:
- Many-to-One with Project (multiple entries per project)
- Many-to-One with User (multiple entries per user)
- Many-to-One with Timesheet (multiple entries per timesheet, optional)

### 4. Timesheet Entity
**Purpose**: Groups time entries for specific periods and reporting

**Attributes**:
- `timesheet_id` (UUID, Primary Key): Unique identifier
- `user_id` (UUID, Foreign Key): Owner of the timesheet
- `name` (String, Required): Timesheet name/title
- `period_type` (Enum): Daily, Weekly, Monthly, Custom
- `start_date` (Date, Required): Period start date
- `end_date` (Date, Required): Period end date
- `status` (Enum): Draft, Submitted, Approved
- `total_hours` (Decimal, Computed): Total hours from all entries
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last modification timestamp

**Business Rules**:
- End date must be after or equal to start date
- Timesheet periods cannot overlap for the same user
- Once submitted, entries cannot be modified without reverting status
- Total hours automatically calculated from associated time entries

**Relationships**:
- One-to-Many with TimeEntry (timesheet can contain multiple entries)
- Many-to-One with User (user can have multiple timesheets)

## Domain Services

### 1. ProjectService
**Purpose**: Manages project lifecycle and business logic

**Methods**:
- `create_project(user_id, name, description, color_code, deadline)`: Creates new project
- `update_project(project_id, **kwargs)`: Updates project details
- `archive_project(project_id)`: Archives a project
- `get_active_projects(user_id)`: Retrieves active projects for user
- `get_project_by_id(project_id)`: Retrieves specific project
- `validate_project_name(user_id, name)`: Ensures unique project names
- `get_project_time_summary(project_id, start_date, end_date)`: Time spent on project

**Business Logic**:
- Validates color codes are valid hex values
- Prevents archiving projects with running timers
- Enforces unique project names per user

### 2. TimeEntryService
**Purpose**: Manages time tracking operations

**Methods**:
- `start_timer(user_id, project_id, description)`: Starts new time tracking session
- `stop_timer(entry_id)`: Stops running timer
- `create_manual_entry(user_id, project_id, start_time, end_time, description)`: Creates manual time entry
- `update_entry(entry_id, **kwargs)`: Updates existing time entry
- `delete_entry(entry_id)`: Removes time entry
- `get_running_timer(user_id)`: Gets currently running timer for user
- `get_entries_by_date_range(user_id, start_date, end_date)`: Retrieves entries in date range
- `get_entries_by_project(project_id, start_date, end_date)`: Retrieves project-specific entries
- `duplicate_entry(entry_id, new_date)`: Creates copy of existing entry
- `validate_time_overlap(user_id, start_time, end_time, exclude_entry_id)`: Checks for overlapping times

**Business Logic**:
- Ensures only one running timer per user
- Validates time ranges don't overlap
- Automatically calculates durations
- Prevents entries on archived projects

### 3. TimesheetService
**Purpose**: Manages timesheet creation and operations

**Methods**:
- `create_timesheet(user_id, name, period_type, start_date, end_date)`: Creates new timesheet
- `add_entries_to_timesheet(timesheet_id, entry_ids)`: Associates entries with timesheet
- `remove_entries_from_timesheet(timesheet_id, entry_ids)`: Removes entries from timesheet
- `calculate_timesheet_totals(timesheet_id)`: Recalculates total hours
- `submit_timesheet(timesheet_id)`: Marks timesheet as submitted
- `approve_timesheet(timesheet_id)`: Marks timesheet as approved
- `export_timesheet(timesheet_id, format)`: Exports timesheet to PDF/CSV
- `get_timesheet_by_period(user_id, start_date, end_date)`: Finds timesheet for period
- `validate_period_overlap(user_id, start_date, end_date, exclude_timesheet_id)`: Checks for overlapping periods

**Business Logic**:
- Prevents overlapping timesheet periods
- Automatically includes relevant time entries in period
- Locks timesheet entries when submitted
- Recalculates totals when entries are added/removed

### 4. ReportingService
**Purpose**: Generates reports and analytics

**Methods**:
- `get_time_by_project(user_id, start_date, end_date)`: Time distribution by project
- `get_daily_summary(user_id, date)`: Daily time tracking summary
- `get_weekly_summary(user_id, week_start_date)`: Weekly time tracking summary
- `get_monthly_summary(user_id, year, month)`: Monthly time tracking summary
- `get_productivity_trends(user_id, start_date, end_date)`: Productivity analysis
- `generate_time_distribution_chart(user_id, start_date, end_date)`: Chart data for visualization
- `search_entries(user_id, query, filters)`: Search through time entries
- `export_data(user_id, format, start_date, end_date)`: Export user data

**Business Logic**:
- Aggregates time data across different dimensions
- Provides filtering and search capabilities
- Generates data suitable for visualization
- Handles different export formats

### 5. UserPreferencesService
**Purpose**: Manages user settings and preferences

**Methods**:
- `get_user_preferences(user_id)`: Retrieves user preferences
- `update_preferences(user_id, preferences)`: Updates user preferences
- `set_default_project(user_id, project_id)`: Sets default project for new entries
- `configure_keyboard_shortcuts(user_id, shortcuts)`: Configures custom shortcuts
- `backup_user_data(user_id)`: Creates data backup
- `restore_user_data(user_id, backup_data)`: Restores from backup
- `import_time_data(user_id, import_data, format)`: Imports data from external systems

**Business Logic**:
- Validates preference settings
- Handles data import/export operations
- Manages user customizations

## Entity Relationships Summary

```
User (1) -----> (*) Project
User (1) -----> (*) TimeEntry
User (1) -----> (*) Timesheet

Project (1) -----> (*) TimeEntry

Timesheet (1) -----> (*) TimeEntry
```

## Key Design Decisions

1. **UUID Primary Keys**: Using UUIDs for all entities to ensure global uniqueness and better security
2. **Soft Deletion**: Projects and timesheets use status fields rather than hard deletion to maintain data integrity
3. **Computed Fields**: Duration and totals are calculated rather than stored to ensure consistency
4. **Status Enums**: Using enums for status fields to ensure data validity
5. **Optional Relationships**: TimeEntry to Timesheet is optional to allow entries without formal timesheet assignment
6. **Audit Fields**: All entities include created_at and updated_at for tracking changes

## Performance Considerations

1. **Indexing Strategy**:
   - Index on user_id for all entities
   - Index on project_id for TimeEntry
   - Index on date fields for time-based queries
   - Composite index on (user_id, start_time) for TimeEntry

2. **Query Optimization**:
   - Use database-level aggregation for totals calculation
   - Implement pagination for large result sets
   - Cache frequently accessed user preferences

## Security Considerations

1. **Data Isolation**: All queries filtered by user_id to ensure data privacy
2. **Input Validation**: All service methods include input validation
3. **Access Control**: Services enforce ownership validation before operations
4. **Data Sanitization**: Description fields sanitized to prevent XSS attacks