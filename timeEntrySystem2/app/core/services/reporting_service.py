from typing import List, Dict, Any, Optional
from datetime import date, datetime, timedelta
from collections import defaultdict
from app.core.interfaces.time_entry_repository import ITimeEntryRepository
from app.core.interfaces.project_repository import IProjectRepository
from app.core.interfaces.timesheet_repository import ITimesheetRepository

class ReportingService:
    """
    Generates reports and analytics for time tracking data
    """
    
    def __init__(self, time_entry_repository: ITimeEntryRepository, 
                 project_repository: IProjectRepository,
                 timesheet_repository: ITimesheetRepository):
        self._time_entry_repository = time_entry_repository
        self._project_repository = project_repository
        self._timesheet_repository = timesheet_repository
    
    def get_time_by_project(self, user_id: str, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get time distribution by project"""
        time_entries = self._time_entry_repository.get_by_date_range(user_id, start_date, end_date)
        projects = {p.project_id: p for p in self._project_repository.get_by_user_id(user_id)}
        
        project_times = defaultdict(int)
        project_names = {}
        
        for entry in time_entries:
            project_times[entry.project_id] += entry.duration_minutes
            if entry.project_id in projects:
                project_names[entry.project_id] = projects[entry.project_id].name
            else:
                project_names[entry.project_id] = "Unknown Project"
        
        # Convert to hours and create result
        result = []
        total_minutes = sum(project_times.values())
        
        for project_id, minutes in project_times.items():
            hours = round(minutes / 60.0, 2)
            percentage = round((minutes / total_minutes * 100), 1) if total_minutes > 0 else 0
            
            result.append({
                'project_id': project_id,
                'project_name': project_names[project_id],
                'hours': hours,
                'minutes': minutes,
                'percentage': percentage
            })
        
        # Sort by hours descending
        result.sort(key=lambda x: x['hours'], reverse=True)
        
        return {
            'projects': result,
            'total_hours': round(total_minutes / 60.0, 2),
            'total_minutes': total_minutes,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
    
    def get_daily_summary(self, user_id: str, target_date: date) -> Dict[str, Any]:
        """Get daily time tracking summary"""
        time_entries = self._time_entry_repository.get_by_date_range(user_id, target_date, target_date)
        projects = {p.project_id: p for p in self._project_repository.get_by_user_id(user_id)}
        
        total_minutes = sum(entry.duration_minutes for entry in time_entries)
        
        entry_details = []
        for entry in time_entries:
            project_name = projects[entry.project_id].name if entry.project_id in projects else "Unknown"
            entry_details.append({
                'entry_id': entry.entry_id,
                'project_name': project_name,
                'project_id': entry.project_id,
                'description': entry.description,
                'start_time': entry.start_time.strftime('%H:%M'),
                'end_time': entry.end_time.strftime('%H:%M') if entry.end_time else 'Running',
                'duration': entry.get_duration_formatted(),
                'duration_minutes': entry.duration_minutes,
                'is_running': entry.is_running
            })
        
        return {
            'date': target_date.isoformat(),
            'total_hours': round(total_minutes / 60.0, 2),
            'total_minutes': total_minutes,
            'entry_count': len(time_entries),
            'entries': entry_details
        }
    
    def get_weekly_summary(self, user_id: str, week_start_date: date) -> Dict[str, Any]:
        """Get weekly time tracking summary"""
        week_end_date = week_start_date + timedelta(days=6)
        time_entries = self._time_entry_repository.get_by_date_range(user_id, week_start_date, week_end_date)
        projects = {p.project_id: p for p in self._project_repository.get_by_user_id(user_id)}
        
        # Group by day
        daily_totals = defaultdict(int)
        project_totals = defaultdict(int)
        
        for entry in time_entries:
            entry_date = entry.start_time.date()
            daily_totals[entry_date] += entry.duration_minutes
            project_totals[entry.project_id] += entry.duration_minutes
        
        # Create daily breakdown
        days = []
        current_date = week_start_date
        for i in range(7):
            day_minutes = daily_totals[current_date]
            days.append({
                'date': current_date.isoformat(),
                'day_name': current_date.strftime('%A'),
                'hours': round(day_minutes / 60.0, 2),
                'minutes': day_minutes
            })
            current_date += timedelta(days=1)
        
        # Create project breakdown
        project_breakdown = []
        total_minutes = sum(project_totals.values())
        
        for project_id, minutes in project_totals.items():
            project_name = projects[project_id].name if project_id in projects else "Unknown"
            hours = round(minutes / 60.0, 2)
            percentage = round((minutes / total_minutes * 100), 1) if total_minutes > 0 else 0
            
            project_breakdown.append({
                'project_id': project_id,
                'project_name': project_name,
                'hours': hours,
                'minutes': minutes,
                'percentage': percentage
            })
        
        project_breakdown.sort(key=lambda x: x['hours'], reverse=True)
        
        return {
            'week_start': week_start_date.isoformat(),
            'week_end': week_end_date.isoformat(),
            'total_hours': round(total_minutes / 60.0, 2),
            'total_minutes': total_minutes,
            'entry_count': len(time_entries),
            'daily_breakdown': days,
            'project_breakdown': project_breakdown
        }
    
    def get_monthly_summary(self, user_id: str, year: int, month: int) -> Dict[str, Any]:
        """Get monthly time tracking summary"""
        start_date = date(year, month, 1)
        
        # Calculate last day of month
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)
        
        time_entries = self._time_entry_repository.get_by_date_range(user_id, start_date, end_date)
        projects = {p.project_id: p for p in self._project_repository.get_by_user_id(user_id)}
        
        # Group by week
        weekly_totals = defaultdict(int)
        project_totals = defaultdict(int)
        
        for entry in time_entries:
            # Get week number
            entry_date = entry.start_time.date()
            week_start = entry_date - timedelta(days=entry_date.weekday())
            weekly_totals[week_start] += entry.duration_minutes
            project_totals[entry.project_id] += entry.duration_minutes
        
        # Create weekly breakdown
        weeks = []
        for week_start, minutes in sorted(weekly_totals.items()):
            week_end = week_start + timedelta(days=6)
            weeks.append({
                'week_start': week_start.isoformat(),
                'week_end': week_end.isoformat(),
                'hours': round(minutes / 60.0, 2),
                'minutes': minutes
            })
        
        # Create project breakdown
        project_breakdown = []
        total_minutes = sum(project_totals.values())
        
        for project_id, minutes in project_totals.items():
            project_name = projects[project_id].name if project_id in projects else "Unknown"
            hours = round(minutes / 60.0, 2)
            percentage = round((minutes / total_minutes * 100), 1) if total_minutes > 0 else 0
            
            project_breakdown.append({
                'project_id': project_id,
                'project_name': project_name,
                'hours': hours,
                'minutes': minutes,
                'percentage': percentage
            })
        
        project_breakdown.sort(key=lambda x: x['hours'], reverse=True)
        
        return {
            'year': year,
            'month': month,
            'month_name': start_date.strftime('%B'),
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'total_hours': round(total_minutes / 60.0, 2),
            'total_minutes': total_minutes,
            'entry_count': len(time_entries),
            'weekly_breakdown': weeks,
            'project_breakdown': project_breakdown
        }
    
    def get_productivity_trends(self, user_id: str, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get productivity analysis and trends"""
        time_entries = self._time_entry_repository.get_by_date_range(user_id, start_date, end_date)
        
        if not time_entries:
            return {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'total_days': (end_date - start_date).days + 1,
                'active_days': 0,
                'average_hours_per_day': 0,
                'average_hours_per_active_day': 0,
                'longest_session_hours': 0,
                'shortest_session_hours': 0,
                'total_sessions': 0
            }
        
        # Calculate metrics
        daily_totals = defaultdict(int)
        session_durations = []
        
        for entry in time_entries:
            entry_date = entry.start_time.date()
            daily_totals[entry_date] += entry.duration_minutes
            if entry.duration_minutes > 0:
                session_durations.append(entry.duration_minutes)
        
        total_days = (end_date - start_date).days + 1
        active_days = len(daily_totals)
        total_minutes = sum(daily_totals.values())
        
        avg_hours_per_day = round(total_minutes / 60.0 / total_days, 2)
        avg_hours_per_active_day = round(total_minutes / 60.0 / active_days, 2) if active_days > 0 else 0
        
        longest_session = round(max(session_durations) / 60.0, 2) if session_durations else 0
        shortest_session = round(min(session_durations) / 60.0, 2) if session_durations else 0
        
        return {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'total_days': total_days,
            'active_days': active_days,
            'average_hours_per_day': avg_hours_per_day,
            'average_hours_per_active_day': avg_hours_per_active_day,
            'longest_session_hours': longest_session,
            'shortest_session_hours': shortest_session,
            'total_sessions': len(session_durations),
            'total_hours': round(total_minutes / 60.0, 2)
        }
    
    def generate_time_distribution_chart(self, user_id: str, start_date: date, end_date: date) -> Dict[str, Any]:
        """Generate chart data for time visualization"""
        project_data = self.get_time_by_project(user_id, start_date, end_date)
        
        # Prepare data for pie chart
        chart_data = {
            'labels': [p['project_name'] for p in project_data['projects']],
            'data': [p['hours'] for p in project_data['projects']],
            'backgroundColor': [],
            'borderColor': [],
            'borderWidth': 1
        }
        
        # Generate colors (you might want to use project colors if available)
        colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
        ]
        
        for i, project in enumerate(project_data['projects']):
            color_index = i % len(colors)
            chart_data['backgroundColor'].append(colors[color_index])
            chart_data['borderColor'].append(colors[color_index])
        
        return {
            'chart_data': chart_data,
            'total_hours': project_data['total_hours'],
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
    
    def search_entries(self, user_id: str, query: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Search through time entries"""
        all_entries = self._time_entry_repository.get_by_user_id(user_id)
        projects = {p.project_id: p for p in self._project_repository.get_by_user_id(user_id)}
        
        results = []
        query_lower = query.lower() if query else ""
        
        for entry in all_entries:
            # Search in description
            description_match = not query or (entry.description and query_lower in entry.description.lower())
            
            # Search in project name
            project_name = projects[entry.project_id].name if entry.project_id in projects else ""
            project_match = not query or query_lower in project_name.lower()
            
            if description_match or project_match:
                # Apply additional filters
                if filters:
                    if 'project_id' in filters and entry.project_id != filters['project_id']:
                        continue
                    if 'start_date' in filters and entry.start_time.date() < filters['start_date']:
                        continue
                    if 'end_date' in filters and entry.start_time.date() > filters['end_date']:
                        continue
                
                results.append({
                    'entry_id': entry.entry_id,
                    'project_name': project_name,
                    'project_id': entry.project_id,
                    'description': entry.description,
                    'start_time': entry.start_time.isoformat(),
                    'end_time': entry.end_time.isoformat() if entry.end_time else None,
                    'duration': entry.get_duration_formatted(),
                    'duration_minutes': entry.duration_minutes,
                    'date': entry.start_time.date().isoformat()
                })
        
        # Sort by start time descending
        results.sort(key=lambda x: x['start_time'], reverse=True)
        
        return results