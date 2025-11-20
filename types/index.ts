export type TaskStatus = 'not-started' | 'in-progress' | 'completed';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type EffortLevel = 'small' | 'medium' | 'large' | 'x-large';
export type MilestonePriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  milestoneId: string;
  projectId: string; // Added for easier reference
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: Priority;
  effortLevel?: EffortLevel;
  assignedResource?: string;
  startDate?: string; // Recorded when status changes to 'in-progress'
  completedDate?: string; // Recorded when status changes to 'completed'
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  priority?: MilestonePriority;
  dueDate?: string;
  stakeholders?: string[];
  createdAt: string;
  updatedAt: string;
  tasks: Task[];
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  milestones: Milestone[];
}

export interface DataStore {
  projects: Project[];
}

