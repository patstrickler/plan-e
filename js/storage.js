const STORAGE_KEY = 'plan-e-data';
const METADATA_KEY = 'plan-e-metadata';

// Migrate old task format to new format
function migrateTask(task, projectId) {
  // If task already has new format, return as is
  if (task.status && task.projectId) {
    return task;
  }
  
  // Migrate from old format
  const migrated = {
    ...task,
    projectId: task.projectId || projectId,
    status: task.status || (task.completed ? 'completed' : 'not-started'),
    priority: task.priority || undefined,
    effortLevel: task.effortLevel || undefined,
    assignedResource: task.assignedResource || undefined,
    startDate: task.startDate || undefined,
    completedDate: task.completedDate || (task.completed ? task.updatedAt : undefined),
  };
  
  // Remove old completed field if it exists
  delete migrated.completed;
  
  return migrated;
}

function migrateData(data) {
  if (!data || !data.projects) {
    return { projects: [] };
  }
  
  const migrated = {
    projects: data.projects.map((project) => ({
      ...project,
      milestones: project.milestones?.map((milestone) => ({
        ...milestone,
        tasks: milestone.tasks?.map((task) => migrateTask(task, project.id)) || [],
      })) || [],
      requirements: project.requirements || [],
      functionalRequirements: project.functionalRequirements || [],
    })),
  };
  
  return migrated;
}

function readData() {
  if (typeof window === 'undefined') {
    return { projects: [] };
  }
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      const migrated = migrateData(parsed);
      // Write back migrated data if migration occurred
      if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
        writeData(migrated);
      }
      return migrated;
    }
  } catch (error) {
    console.error('Error reading data from localStorage:', error);
  }
  return { projects: [] };
}

function writeData(data) {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error writing data to localStorage:', error);
    throw error;
  }
}

export function getAllProjects() {
  const data = readData();
  return data.projects;
}

export function getProject(id) {
  const data = readData();
  return data.projects.find(p => p.id === id);
}

export function createProject(project) {
  const data = readData();
  const newProject = {
    ...project,
    id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    milestones: [],
    requirements: [],
    functionalRequirements: [],
  };
  data.projects.push(newProject);
  writeData(data);
  return newProject;
}

export function updateProject(id, updates) {
  const data = readData();
  const projectIndex = data.projects.findIndex(p => p.id === id);
  if (projectIndex === -1) return null;
  
  data.projects[projectIndex] = {
    ...data.projects[projectIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeData(data);
  return data.projects[projectIndex];
}

export function deleteProject(id) {
  const data = readData();
  const initialLength = data.projects.length;
  data.projects = data.projects.filter(p => p.id !== id);
  writeData(data);
  return data.projects.length < initialLength;
}

export function createMilestone(projectId, milestone) {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) throw new Error('Project not found');
  
  const newMilestone = {
    ...milestone,
    id: `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tasks: [],
  };
  
  project.milestones.push(newMilestone);
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return newMilestone;
}

export function updateMilestone(projectId, milestoneId, updates) {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) return null;
  
  const milestoneIndex = project.milestones.findIndex(m => m.id === milestoneId);
  if (milestoneIndex === -1) return null;
  
  project.milestones[milestoneIndex] = {
    ...project.milestones[milestoneIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return project.milestones[milestoneIndex];
}

export function deleteMilestone(projectId, milestoneId) {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) return false;
  
  const initialLength = project.milestones.length;
  project.milestones = project.milestones.filter(m => m.id !== milestoneId);
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return project.milestones.length < initialLength;
}

export function createTask(projectId, milestoneId, task) {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) throw new Error('Project not found');
  
  const milestone = project.milestones.find(m => m.id === milestoneId);
  if (!milestone) throw new Error('Milestone not found');
  
  const newTask = {
    ...task,
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    milestoneId,
    projectId,
    status: 'not-started',
    linkedFunctionalRequirement: task.linkedFunctionalRequirement || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  milestone.tasks.push(newTask);
  milestone.updatedAt = new Date().toISOString();
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return newTask;
}

export function updateTask(projectId, milestoneId, taskId, updates) {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) return null;
  
  const milestone = project.milestones.find(m => m.id === milestoneId);
  if (!milestone) return null;
  
  const taskIndex = milestone.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return null;
  
  const currentTask = milestone.tasks[taskIndex];
  const now = new Date().toISOString();
  
  // Handle status transitions
  const statusUpdate = {};
  if (updates.status && updates.status !== currentTask.status) {
    if (updates.status === 'in-progress' && !currentTask.startDate) {
      statusUpdate.startDate = now;
    } else if (updates.status === 'completed' && !currentTask.completedDate) {
      statusUpdate.completedDate = now;
    } else if (updates.status === 'not-started') {
      // Reset dates if going back to not-started
      statusUpdate.startDate = undefined;
      statusUpdate.completedDate = undefined;
    } else if (updates.status === 'in-progress' && currentTask.status === 'completed') {
      // If going from completed back to in-progress, clear completed date
      statusUpdate.completedDate = undefined;
    }
  }
  
  milestone.tasks[taskIndex] = {
    ...currentTask,
    ...updates,
    ...statusUpdate,
    updatedAt: now,
  };
  milestone.updatedAt = now;
  project.updatedAt = now;
  writeData(data);
  return milestone.tasks[taskIndex];
}

export function deleteTask(projectId, milestoneId, taskId) {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) return false;
  
  const milestone = project.milestones.find(m => m.id === milestoneId);
  if (!milestone) return false;
  
  const initialLength = milestone.tasks.length;
  milestone.tasks = milestone.tasks.filter(t => t.id !== taskId);
  milestone.updatedAt = new Date().toISOString();
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return milestone.tasks.length < initialLength;
}

// Helper functions for views
export function getAllMilestones() {
  const data = readData();
  const milestones = [];
  
  data.projects.forEach(project => {
    project.milestones.forEach(milestone => {
      milestones.push({ ...milestone, project });
    });
  });
  
  return milestones;
}

export function getAllTasks() {
  const data = readData();
  const tasks = [];
  
  data.projects.forEach(project => {
    project.milestones.forEach(milestone => {
      milestone.tasks.forEach(task => {
        tasks.push({ ...task, milestone, project });
      });
    });
  });
  
  return tasks;
}

// Requirements
export function getAllRequirements() {
  const data = readData();
  const requirements = [];
  
  data.projects.forEach(project => {
    (project.requirements || []).forEach(requirement => {
      requirements.push({ ...requirement, project });
    });
  });
  
  return requirements;
}

export function createRequirement(projectId, requirement) {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) throw new Error('Project not found');
  
  if (!project.requirements) {
    project.requirements = [];
  }
  
  const newRequirement = {
    ...requirement,
    id: `requirement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  project.requirements.push(newRequirement);
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return newRequirement;
}

export function updateRequirement(projectId, requirementId, updates) {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project || !project.requirements) return null;
  
  const requirementIndex = project.requirements.findIndex(r => r.id === requirementId);
  if (requirementIndex === -1) return null;
  
  project.requirements[requirementIndex] = {
    ...project.requirements[requirementIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return project.requirements[requirementIndex];
}

export function deleteRequirement(projectId, requirementId) {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project || !project.requirements) return false;
  
  const initialLength = project.requirements.length;
  project.requirements = project.requirements.filter(r => r.id !== requirementId);
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return project.requirements.length < initialLength;
}

// Functional Requirements
export function getAllFunctionalRequirements() {
  const data = readData();
  const functionalRequirements = [];
  
  data.projects.forEach(project => {
    (project.functionalRequirements || []).forEach(functionalRequirement => {
      functionalRequirements.push({ ...functionalRequirement, project });
    });
  });
  
  return functionalRequirements;
}

export function createFunctionalRequirement(projectId, functionalRequirement) {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) throw new Error('Project not found');
  
  if (!project.functionalRequirements) {
    project.functionalRequirements = [];
  }
  
  const newFunctionalRequirement = {
    ...functionalRequirement,
    id: `functional-requirement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId,
    linkedUserRequirements: functionalRequirement.linkedUserRequirements || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  project.functionalRequirements.push(newFunctionalRequirement);
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return newFunctionalRequirement;
}

export function updateFunctionalRequirement(projectId, functionalRequirementId, updates) {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project || !project.functionalRequirements) return null;
  
  const functionalRequirementIndex = project.functionalRequirements.findIndex(fr => fr.id === functionalRequirementId);
  if (functionalRequirementIndex === -1) return null;
  
  project.functionalRequirements[functionalRequirementIndex] = {
    ...project.functionalRequirements[functionalRequirementIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return project.functionalRequirements[functionalRequirementIndex];
}

export function deleteFunctionalRequirement(projectId, functionalRequirementId) {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project || !project.functionalRequirements) return false;
  
  const initialLength = project.functionalRequirements.length;
  project.functionalRequirements = project.functionalRequirements.filter(fr => fr.id !== functionalRequirementId);
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return project.functionalRequirements.length < initialLength;
}

// ============================================
// Metadata Management Functions
// ============================================

function getDefaultMetadata() {
  return {
    users: [],
    priorities: [
      { id: 'low', label: 'Low', order: 1, color: '#10b981' },
      { id: 'medium', label: 'Medium', order: 2, color: '#eab308' },
      { id: 'high', label: 'High', order: 3, color: '#f59e0b' },
      { id: 'urgent', label: 'Urgent', order: 4, color: '#ef4444' },
    ],
    statuses: [
      { id: 'not-started', label: 'Not Started', order: 1, color: '#71717a' },
      { id: 'in-progress', label: 'In Progress', order: 2, color: '#3b82f6' },
      { id: 'completed', label: 'Completed', order: 3, color: '#10b981' },
    ],
    effortLevels: [
      { id: 'small', label: 'Small', order: 1, color: '#10b981' },
      { id: 'medium', label: 'Medium', order: 2, color: '#3b82f6' },
      { id: 'large', label: 'Large', order: 3, color: '#f59e0b' },
      { id: 'x-large', label: 'X-Large', order: 4, color: '#ef4444' },
    ],
  };
}

function readMetadata() {
  if (typeof window === 'undefined') {
    return getDefaultMetadata();
  }
  
  try {
    const metadata = localStorage.getItem(METADATA_KEY);
    if (metadata) {
      const parsed = JSON.parse(metadata);
      // Migrate old metadata to include colors if missing
      const migrated = migrateMetadata(parsed);
      if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
        writeMetadata(migrated);
      }
      return migrated;
    }
  } catch (error) {
    console.error('Error reading metadata from localStorage:', error);
  }
  
  // Initialize with defaults
  const defaultMetadata = getDefaultMetadata();
  writeMetadata(defaultMetadata);
  return defaultMetadata;
}

function migrateMetadata(metadata) {
  const defaultMetadata = getDefaultMetadata();
  const migrated = { ...metadata };
  
  // Migrate priorities
  if (migrated.priorities) {
    migrated.priorities = migrated.priorities.map(p => {
      if (!p.color) {
        const defaultPriority = defaultMetadata.priorities.find(dp => dp.id === p.id);
        return { ...p, color: defaultPriority?.color || '#71717a' };
      }
      return p;
    });
  }
  
  // Migrate statuses
  if (migrated.statuses) {
    migrated.statuses = migrated.statuses.map(s => {
      if (!s.color) {
        const defaultStatus = defaultMetadata.statuses.find(ds => ds.id === s.id);
        return { ...s, color: defaultStatus?.color || '#71717a' };
      }
      return s;
    });
  }
  
  // Migrate effort levels
  if (migrated.effortLevels) {
    migrated.effortLevels = migrated.effortLevels.map(e => {
      if (!e.color) {
        const defaultEffort = defaultMetadata.effortLevels.find(de => de.id === e.id);
        return { ...e, color: defaultEffort?.color || '#71717a' };
      }
      return e;
    });
  }
  
  return migrated;
}

function writeMetadata(metadata) {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('Error writing metadata to localStorage:', error);
    throw error;
  }
}

export function getMetadata() {
  return readMetadata();
}

export function updateMetadata(metadata) {
  writeMetadata(metadata);
}

// Users
export function getUsers() {
  const metadata = readMetadata();
  return metadata.users || [];
}

export function addUser(name) {
  const metadata = readMetadata();
  if (!metadata.users) {
    metadata.users = [];
  }
  const newUser = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  metadata.users.push(newUser);
  writeMetadata(metadata);
  return newUser;
}

export function updateUser(userId, updates) {
  const metadata = readMetadata();
  if (!metadata.users) return null;
  
  const userIndex = metadata.users.findIndex(u => u.id === userId);
  if (userIndex === -1) return null;
  
  metadata.users[userIndex] = {
    ...metadata.users[userIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeMetadata(metadata);
  return metadata.users[userIndex];
}

export function deleteUser(userId) {
  const metadata = readMetadata();
  if (!metadata.users) return false;
  
  const initialLength = metadata.users.length;
  metadata.users = metadata.users.filter(u => u.id !== userId);
  writeMetadata(metadata);
  return metadata.users.length < initialLength;
}

// Priorities
export function getPriorities() {
  const metadata = readMetadata();
  return (metadata.priorities || []).sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function addPriority(label, color = '#71717a') {
  const metadata = readMetadata();
  if (!metadata.priorities) {
    metadata.priorities = [];
  }
  const id = label.toLowerCase().replace(/\s+/g, '-');
  const newPriority = {
    id,
    label: label.trim(),
    order: metadata.priorities.length + 1,
    color: color || '#71717a',
    createdAt: new Date().toISOString(),
  };
  metadata.priorities.push(newPriority);
  writeMetadata(metadata);
  return newPriority;
}

export function updatePriority(priorityId, updates) {
  const metadata = readMetadata();
  if (!metadata.priorities) return null;
  
  const priorityIndex = metadata.priorities.findIndex(p => p.id === priorityId);
  if (priorityIndex === -1) return null;
  
  metadata.priorities[priorityIndex] = {
    ...metadata.priorities[priorityIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeMetadata(metadata);
  return metadata.priorities[priorityIndex];
}

export function deletePriority(priorityId) {
  const metadata = readMetadata();
  if (!metadata.priorities) return false;
  
  const initialLength = metadata.priorities.length;
  metadata.priorities = metadata.priorities.filter(p => p.id !== priorityId);
  // Reassign order based on array position
  metadata.priorities.forEach((p, index) => {
    p.order = index + 1;
  });
  writeMetadata(metadata);
  return metadata.priorities.length < initialLength;
}

export function reorderPriorities(priorityIds) {
  const metadata = readMetadata();
  if (!metadata.priorities) return false;
  
  // Create a map of priorities by id
  const priorityMap = new Map(metadata.priorities.map(p => [p.id, p]));
  
  // Reorder based on the provided array of IDs
  metadata.priorities = priorityIds.map((id, index) => {
    const priority = priorityMap.get(id);
    if (priority) {
      priority.order = index + 1;
      return priority;
    }
    return null;
  }).filter(p => p !== null);
  
  writeMetadata(metadata);
  return true;
}

// Statuses
export function getStatuses() {
  const metadata = readMetadata();
  return (metadata.statuses || []).sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function addStatus(label, color = '#71717a') {
  const metadata = readMetadata();
  if (!metadata.statuses) {
    metadata.statuses = [];
  }
  const id = label.toLowerCase().replace(/\s+/g, '-');
  const newStatus = {
    id,
    label: label.trim(),
    order: metadata.statuses.length + 1,
    color: color || '#71717a',
    createdAt: new Date().toISOString(),
  };
  metadata.statuses.push(newStatus);
  writeMetadata(metadata);
  return newStatus;
}

export function updateStatus(statusId, updates) {
  const metadata = readMetadata();
  if (!metadata.statuses) return null;
  
  const statusIndex = metadata.statuses.findIndex(s => s.id === statusId);
  if (statusIndex === -1) return null;
  
  metadata.statuses[statusIndex] = {
    ...metadata.statuses[statusIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeMetadata(metadata);
  return metadata.statuses[statusIndex];
}

export function deleteStatus(statusId) {
  const metadata = readMetadata();
  if (!metadata.statuses) return false;
  
  const initialLength = metadata.statuses.length;
  metadata.statuses = metadata.statuses.filter(s => s.id !== statusId);
  // Reassign order based on array position
  metadata.statuses.forEach((s, index) => {
    s.order = index + 1;
  });
  writeMetadata(metadata);
  return metadata.statuses.length < initialLength;
}

export function reorderStatuses(statusIds) {
  const metadata = readMetadata();
  if (!metadata.statuses) return false;
  
  // Create a map of statuses by id
  const statusMap = new Map(metadata.statuses.map(s => [s.id, s]));
  
  // Reorder based on the provided array of IDs
  metadata.statuses = statusIds.map((id, index) => {
    const status = statusMap.get(id);
    if (status) {
      status.order = index + 1;
      return status;
    }
    return null;
  }).filter(s => s !== null);
  
  writeMetadata(metadata);
  return true;
}

// Effort Levels
export function getEffortLevels() {
  const metadata = readMetadata();
  return (metadata.effortLevels || []).sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function addEffortLevel(label, color = '#71717a') {
  const metadata = readMetadata();
  if (!metadata.effortLevels) {
    metadata.effortLevels = [];
  }
  const id = label.toLowerCase().replace(/\s+/g, '-');
  const newEffortLevel = {
    id,
    label: label.trim(),
    order: metadata.effortLevels.length + 1,
    color: color || '#71717a',
    createdAt: new Date().toISOString(),
  };
  metadata.effortLevels.push(newEffortLevel);
  writeMetadata(metadata);
  return newEffortLevel;
}

export function updateEffortLevel(effortLevelId, updates) {
  const metadata = readMetadata();
  if (!metadata.effortLevels) return null;
  
  const effortLevelIndex = metadata.effortLevels.findIndex(e => e.id === effortLevelId);
  if (effortLevelIndex === -1) return null;
  
  metadata.effortLevels[effortLevelIndex] = {
    ...metadata.effortLevels[effortLevelIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeMetadata(metadata);
  return metadata.effortLevels[effortLevelIndex];
}

export function deleteEffortLevel(effortLevelId) {
  const metadata = readMetadata();
  if (!metadata.effortLevels) return false;
  
  const initialLength = metadata.effortLevels.length;
  metadata.effortLevels = metadata.effortLevels.filter(e => e.id !== effortLevelId);
  // Reassign order based on array position
  metadata.effortLevels.forEach((e, index) => {
    e.order = index + 1;
  });
  writeMetadata(metadata);
  return metadata.effortLevels.length < initialLength;
}

export function reorderEffortLevels(effortIds) {
  const metadata = readMetadata();
  if (!metadata.effortLevels) return false;
  
  // Create a map of effort levels by id
  const effortMap = new Map(metadata.effortLevels.map(e => [e.id, e]));
  
  // Reorder based on the provided array of IDs
  metadata.effortLevels = effortIds.map((id, index) => {
    const effort = effortMap.get(id);
    if (effort) {
      effort.order = index + 1;
      return effort;
    }
    return null;
  }).filter(e => e !== null);
  
  writeMetadata(metadata);
  return true;
}

