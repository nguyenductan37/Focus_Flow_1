export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'stuck';
  eisenhower_q: 1 | 2 | 3 | 4; // 1: Urgent & Important, 2: Important & Not Urgent, etc.
  energy_level: 'high' | 'medium' | 'low';
  category: 'work' | 'learning' | 'personal';
  estimated_min: number;
  actual_min?: number;
  scheduled_at?: string; // ISO String
  due_at?: string; // ISO String
  completed_at?: string; // ISO String
  deleted_at?: string; // ISO String (soft delete)
  created_at: string;
  updated_at: string;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  user_id: string;
  change_type: 'status_change' | 'reschedule' | 'created' | 'deleted';
  old_value?: any;
  new_value?: any;
  changed_at: string;
}

export interface DailySummary {
  id: string;
  user_id: string;
  summary_date: string; // YYYY-MM-DD
  total_tasks: number;
  done_tasks: number;
  work_min: number;
  learning_min: number;
  personal_min: number;
  energy_end?: number;
  created_at: string;
}

export interface UserPreferences {
  user_id: string;
  end_of_day_time: string; // HH:MM
  morning_plan_time: string; // HH:MM
  timezone: string;
  notification_muted: boolean;
  mute_until?: string; // ISO string
  peak_hours_start?: string; // HH:MM
  peak_hours_end?: string; // HH:MM
  learning_categories: string[];
  updated_at: string;
}
