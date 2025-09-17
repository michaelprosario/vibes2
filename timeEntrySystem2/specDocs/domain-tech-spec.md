# Time Entry System - Domain Technical Specification

## Overview
This document outlines the domain model for a Personal Time Tracking System, defining core entities and service interfaces that encapsulate business logic and rules.

## Domain Entities

### Core Entities

```csharp
// User Entity
public class User
{
    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public string Email { get; private set; }
    public UserPreferences Preferences { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    
    // Constructor and domain methods would be implemented here
}

public class UserPreferences
{
    public string DefaultTimeFormat { get; set; } // 12h/24h
    public string DefaultDateFormat { get; set; }
    public TimeZone TimeZone { get; set; }
    public bool AutoSaveEnabled { get; set; }
    public Dictionary<string, string> KeyboardShortcuts { get; set; }
}

// Project Entity
public class Project
{
    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public string Description { get; private set; }
    public ProjectStatus Status { get; private set; }
    public string ColorCode { get; private set; }
    public DateTime? Deadline { get; private set; }
    public Guid UserId { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    public DateTime? ArchivedAt { get; private set; }
    
    public bool IsArchived => ArchivedAt.HasValue;
    public bool IsOverdue => Deadline.HasValue && Deadline.Value < DateTime.UtcNow && Status != ProjectStatus.Completed;
    
    // Domain methods
    public void UpdateDetails(string name, string description);
    public void SetDeadline(DateTime deadline);
    public void ChangeStatus(ProjectStatus status);
    public void Archive();
    public void Restore();
}

public enum ProjectStatus
{
    Active,
    OnHold,
    Completed,
    Cancelled
}

// Time Entry Entity
public class TimeEntry
{
    public Guid Id { get; private set; }
    public Guid ProjectId { get; private set; }
    public Guid UserId { get; private set; }
    public string Description { get; private set; }
    public DateTime StartTime { get; private set; }
    public DateTime? EndTime { get; private set; }
    public TimeSpan Duration => EndTime?.Subtract(StartTime) ?? TimeSpan.Zero;
    public bool IsRunning => !EndTime.HasValue;
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    
    // Domain methods
    public void UpdateDescription(string description);
    public void UpdateTimes(DateTime startTime, DateTime? endTime);
    public void Stop();
    public void Stop(DateTime endTime);
    public TimeEntry Duplicate();
}

// Timesheet Entity
public class Timesheet
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public DateRange Period { get; private set; }
    public TimesheetStatus Status { get; private set; }
    public string Title { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? SubmittedAt { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    
    private readonly List<Guid> _timeEntryIds = new();
    public IReadOnlyCollection<Guid> TimeEntryIds => _timeEntryIds.AsReadOnly();
    
    // Domain methods
    public void AddTimeEntry(Guid timeEntryId);
    public void RemoveTimeEntry(Guid timeEntryId);
    public void Submit();
    public void Approve();
    public void Reject();
    public void UpdatePeriod(DateRange period);
}

public enum TimesheetStatus
{
    Draft,
    Submitted,
    Approved,
    Rejected
}

// Value Objects
public record DateRange(DateTime StartDate, DateTime EndDate)
{
    public bool Contains(DateTime date) => date >= StartDate && date <= EndDate;
    public TimeSpan Duration => EndDate.Subtract(StartDate);
    public bool IsValid => StartDate <= EndDate;
}

public record TimeSummary(
    TimeSpan TotalTime,
    int EntryCount,
    DateTime PeriodStart,
    DateTime PeriodEnd
);

public record ProjectTimeSummary(
    Guid ProjectId,
    string ProjectName,
    TimeSpan TotalTime,
    int EntryCount
);
```

## Domain Service Interfaces

### Core Domain Services

```csharp
// Time Entry Domain Service
public interface ITimeEntryDomainService
{
    Task<TimeEntry> StartTimerAsync(Guid userId, Guid projectId, string description);
    Task<TimeEntry> StopTimerAsync(Guid timeEntryId, DateTime? endTime = null);
    Task<TimeEntry> CreateManualEntryAsync(Guid userId, Guid projectId, string description, DateTime startTime, DateTime endTime);
    Task<bool> ValidateTimeEntryAsync(TimeEntry timeEntry);
    Task<IEnumerable<TimeEntry>> GetOverlappingEntriesAsync(Guid userId, DateTime startTime, DateTime endTime);
    Task<TimeEntry> DuplicateEntryAsync(Guid timeEntryId, DateTime? newStartTime = null);
    Task<TimeSummary> CalculateTimeSummaryAsync(Guid userId, DateRange period);
    Task<IEnumerable<ProjectTimeSummary>> GetProjectTimeSummariesAsync(Guid userId, DateRange period);
}

// Project Domain Service
public interface IProjectDomainService
{
    Task<Project> CreateProjectAsync(Guid userId, string name, string description, string colorCode = null);
    Task<bool> ValidateProjectNameAsync(Guid userId, string name, Guid? excludeProjectId = null);
    Task<IEnumerable<Project>> GetActiveProjectsAsync(Guid userId);
    Task<IEnumerable<Project>> GetArchivedProjectsAsync(Guid userId);
    Task<bool> CanArchiveProjectAsync(Guid projectId);
    Task<TimeSummary> GetProjectTimeSummaryAsync(Guid projectId, DateRange? period = null);
    Task<IEnumerable<Project>> GetOverdueProjectsAsync(Guid userId);
}

// Timesheet Domain Service
public interface ITimesheetDomainService
{
    Task<Timesheet> CreateTimesheetAsync(Guid userId, DateRange period, string title);
    Task<bool> ValidateTimesheetPeriodAsync(Guid userId, DateRange period, Guid? excludeTimesheetId = null);
    Task<Timesheet> PopulateTimesheetAsync(Guid timesheetId, IEnumerable<Guid> timeEntryIds);
    Task<TimeSummary> CalculateTimesheetSummaryAsync(Guid timesheetId);
    Task<bool> CanSubmitTimesheetAsync(Guid timesheetId);
    Task<bool> CanApproveTimesheetAsync(Guid timesheetId);
    Task<IEnumerable<Timesheet>> GetPendingTimesheetsAsync(Guid userId);
}

// User Domain Service
public interface IUserDomainService
{
    Task<User> CreateUserAsync(string name, string email);
    Task<bool> ValidateEmailAsync(string email, Guid? excludeUserId = null);
    Task<UserPreferences> GetDefaultPreferencesAsync();
    Task<bool> UpdateUserPreferencesAsync(Guid userId, UserPreferences preferences);
    Task<TimeSummary> GetUserActivitySummaryAsync(Guid userId, DateRange period);
}

// Reporting Domain Service
public interface IReportingDomainService
{
    Task<IEnumerable<ProjectTimeSummary>> GenerateProjectReportAsync(Guid userId, DateRange period);
    Task<IEnumerable<TimeSummary>> GenerateDailySummaryAsync(Guid userId, DateRange period);
    Task<IEnumerable<TimeSummary>> GenerateWeeklySummaryAsync(Guid userId, DateRange period);
    Task<IEnumerable<TimeSummary>> GenerateMonthlySummaryAsync(Guid userId, DateRange period);
    Task<TimeSpan> CalculateTotalTimeAsync(Guid userId, DateRange period, Guid? projectId = null);
    Task<IEnumerable<TimeEntry>> SearchTimeEntriesAsync(Guid userId, string searchTerm, DateRange? period = null);
}

// Data Export Domain Service
public interface IDataExportDomainService
{
    Task<byte[]> ExportTimesheetToPdfAsync(Guid timesheetId);
    Task<byte[]> ExportTimesheetToCsvAsync(Guid timesheetId);
    Task<byte[]> ExportProjectReportToPdfAsync(Guid userId, Guid projectId, DateRange period);
    Task<byte[]> ExportUserDataAsync(Guid userId, DateRange? period = null);
    Task<byte[]> CreateBackupAsync(Guid userId);
}

// Timer Domain Service
public interface ITimerDomainService
{
    Task<TimeEntry> GetActiveTimerAsync(Guid userId);
    Task<bool> HasActiveTimerAsync(Guid userId);
    Task<TimeEntry> StartTimerAsync(Guid userId, Guid projectId, string description);
    Task<TimeEntry> StopActiveTimerAsync(Guid userId, DateTime? endTime = null);
    Task<TimeEntry> SwitchProjectAsync(Guid userId, Guid newProjectId, string description);
    Task<TimeSpan> GetActiveTimerDurationAsync(Guid userId);
}
```

## Domain Events

```csharp
// Domain Events for integration and notifications
public abstract record DomainEvent(Guid Id, DateTime OccurredAt);

public record TimeEntryStarted(Guid Id, DateTime OccurredAt, Guid UserId, Guid ProjectId, Guid TimeEntryId) : DomainEvent(Id, OccurredAt);

public record TimeEntryStopped(Guid Id, DateTime OccurredAt, Guid UserId, Guid ProjectId, Guid TimeEntryId, TimeSpan Duration) : DomainEvent(Id, OccurredAt);

public record ProjectCreated(Guid Id, DateTime OccurredAt, Guid UserId, Guid ProjectId, string ProjectName) : DomainEvent(Id, OccurredAt);

public record ProjectArchived(Guid Id, DateTime OccurredAt, Guid UserId, Guid ProjectId, string ProjectName) : DomainEvent(Id, OccurredAt);

public record TimesheetSubmitted(Guid Id, DateTime OccurredAt, Guid UserId, Guid TimesheetId, DateRange Period) : DomainEvent(Id, OccurredAt);

public record TimesheetApproved(Guid Id, DateTime OccurredAt, Guid UserId, Guid TimesheetId, DateRange Period) : DomainEvent(Id, OccurredAt);

public record ProjectDeadlineApproaching(Guid Id, DateTime OccurredAt, Guid UserId, Guid ProjectId, string ProjectName, DateTime Deadline, TimeSpan TimeRemaining) : DomainEvent(Id, OccurredAt);
```

## Business Rules and Constraints

### Time Entry Rules
- A user can only have one active timer at a time
- Time entries cannot overlap for the same user
- End time must be after start time
- Time entries cannot be in the future (beyond current time)
- Maximum time entry duration is 24 hours

### Project Rules
- Project names must be unique per user
- Archived projects cannot have new time entries added
- Projects with active timers cannot be archived
- Color codes must be valid hex colors

### Timesheet Rules
- Timesheet periods cannot overlap for the same user
- Only draft timesheets can be modified
- Submitted timesheets cannot be edited
- Time entries can only belong to one timesheet

### User Rules
- Email addresses must be unique across the system
- User preferences must contain valid timezone information

## Repository Interfaces

```csharp
public interface IUserRepository
{
    Task<User> GetByIdAsync(Guid id);
    Task<User> GetByEmailAsync(string email);
    Task<IEnumerable<User>> GetAllAsync();
    Task<Guid> AddAsync(User user);
    Task UpdateAsync(User user);
    Task DeleteAsync(Guid id);
}

public interface IProjectRepository
{
    Task<Project> GetByIdAsync(Guid id);
    Task<IEnumerable<Project>> GetByUserIdAsync(Guid userId, bool includeArchived = false);
    Task<IEnumerable<Project>> GetOverdueProjectsAsync(Guid userId);
    Task<Guid> AddAsync(Project project);
    Task UpdateAsync(Project project);
    Task DeleteAsync(Guid id);
}

public interface ITimeEntryRepository
{
    Task<TimeEntry> GetByIdAsync(Guid id);
    Task<IEnumerable<TimeEntry>> GetByUserIdAsync(Guid userId, DateRange? period = null);
    Task<IEnumerable<TimeEntry>> GetByProjectIdAsync(Guid projectId, DateRange? period = null);
    Task<IEnumerable<TimeEntry>> GetByTimesheetIdAsync(Guid timesheetId);
    Task<TimeEntry> GetActiveTimerAsync(Guid userId);
    Task<IEnumerable<TimeEntry>> GetOverlappingEntriesAsync(Guid userId, DateTime startTime, DateTime endTime);
    Task<Guid> AddAsync(TimeEntry timeEntry);
    Task UpdateAsync(TimeEntry timeEntry);
    Task DeleteAsync(Guid id);
}

public interface ITimesheetRepository
{
    Task<Timesheet> GetByIdAsync(Guid id);
    Task<IEnumerable<Timesheet>> GetByUserIdAsync(Guid userId);
    Task<IEnumerable<Timesheet>> GetByStatusAsync(TimesheetStatus status);
    Task<IEnumerable<Timesheet>> GetOverlappingTimesheetsAsync(Guid userId, DateRange period);
    Task<Guid> AddAsync(Timesheet timesheet);
    Task UpdateAsync(Timesheet timesheet);
    Task DeleteAsync(Guid id);
}
```

This domain specification provides a comprehensive foundation for implementing the time tracking system with proper separation of concerns, business rule enforcement, and maintainable architecture.