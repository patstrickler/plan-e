export interface Task {
  id: string;
  milestoneId: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  dueDate?: string;
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

