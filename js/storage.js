const STORAGE_KEY = 'plan-e-data';
const METADATA_KEY = 'plan-e-metadata';

/**
 * Compute Risk Value (Rv) from T0085-style risk assessment factors.
 * Rv = (Data Integrity Risk)² × Security Risk × Regression Need × Frequency of Use × Detectability × Remediation
 * Returns { riskValue, riskClassification } when all six factors are set; otherwise { riskValue: undefined }.
 * Classification is omitted in v1 (no thresholds defined).
 */
export function computeRiskValue(riskAssessment) {
  if (!riskAssessment || typeof riskAssessment !== 'object') {
    return { riskValue: undefined };
  }
  const di = riskAssessment.dataIntegrityRisk;
  const sec = riskAssessment.securityRisk;
  const reg = riskAssessment.regressionNeed;
  const freq = riskAssessment.frequencyOfUse;
  const det = riskAssessment.detectability;
  const rem = riskAssessment.remediation;
  const hasAll =
    typeof di === 'number' && typeof sec === 'number' && typeof reg === 'number' &&
    typeof freq === 'number' && typeof det === 'number' && typeof rem === 'number';
  if (!hasAll) return { riskValue: undefined };
  const rv = Math.round((di * di) * sec * reg * freq * det * rem);
  return { riskValue: rv };
}

// Migrate old task format to new format
function migrateTask(task, projectId, requirementIdsInProject) {
  const migrated = {
    ...task,
    projectId: task.projectId || projectId,
    status: task.status || (task.completed ? 'completed' : 'not-started'),
    effortLevel: task.effortLevel || undefined,
    assignedResource: task.assignedResource || undefined,
    startDate: task.startDate || undefined,
    completedDate: task.completedDate || (task.completed ? task.updatedAt : undefined),
    requirementId: task.requirementId ?? undefined,
  };
  if (task.linkedFunctionalRequirement && requirementIdsInProject && requirementIdsInProject.has(task.linkedFunctionalRequirement)) {
    migrated.requirementId = task.linkedFunctionalRequirement;
  }
  delete migrated.completed;
  delete migrated.linkedFunctionalRequirement;
  return migrated;
}

function ensureBacklogMilestone(project) {
  if (!project.milestones || project.milestones.length === 0) {
    const backlog = {
      id: `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: project.id,
      title: 'Backlog',
      description: undefined,
      targetDate: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tasks: [],
    };
    project.milestones = [backlog];
  }
  return project;
}

function migrateObjectives(project) {
  if (!project.objectives) {
    project.objectives = [];
    return project;
  }
  if (Array.isArray(project.objectives) && project.objectives.length > 0) {
    const first = project.objectives[0];
    if (typeof first === 'string') {
      project.objectives = project.objectives.map((text, i) => ({
        id: `objective-${project.id}-${i}-${Date.now()}`,
        name: text,
        description: '',
        priority: '',
      }));
    }
  }
  return project;
}

function mergeRequirementsAndFunctional(project) {
  const uat = (project.requirements || []).map(r => ({
    ...r,
    projectId: project.id,
    type: 'user',
    objectiveId: undefined,
    risk: r.risk ?? undefined,
    trackingId: r.trackingId ?? undefined,
    riskAssessment: r.riskAssessment ?? undefined,
    riskValue: r.riskValue ?? undefined,
  }));
  const frs = (project.functionalRequirements || []).map(fr => ({
    id: fr.id,
    projectId: project.id,
    title: fr.title,
    description: fr.description,
    type: 'system',
    objectiveId: undefined,
    risk: fr.risk ?? undefined,
    trackingId: undefined,
    riskAssessment: fr.riskAssessment ?? undefined,
    riskValue: fr.riskValue ?? undefined,
    createdAt: fr.createdAt,
    updatedAt: fr.updatedAt,
  }));
  return [...uat, ...frs];
}

function migrateData(data) {
  if (!data || !data.projects) {
    return { projects: [] };
  }

  const migrated = {
    projects: data.projects.map((project) => {
      let p = {
        ...project,
        problemStatement: project.problemStatement ?? '',
        strategy: project.strategy ?? '',
        objectives: project.objectives ?? [],
        owner: project.owner ?? undefined,
        devLead: project.devLead ?? undefined,
        developmentTeam: Array.isArray(project.developmentTeam) ? project.developmentTeam : [],
        stakeholders: Array.isArray(project.stakeholders) ? project.stakeholders : [],
        milestones: project.milestones || [],
        requirements: project.requirements ?? [],
        functionalRequirements: project.functionalRequirements ?? [],
      };
      p = migrateObjectives(p);
      p = ensureBacklogMilestone(p);
      if (p.functionalRequirements && p.functionalRequirements.length > 0) {
        p.requirements = mergeRequirementsAndFunctional(p);
        delete p.functionalRequirements;
      } else if (Array.isArray(p.requirements) && p.requirements.length > 0) {
        p.requirements = (p.requirements || []).map(r => ({
          ...r,
          projectId: p.id,
          type: r.type ?? 'user',
          objectiveId: r.objectiveId ?? undefined,
          risk: r.risk ?? undefined,
          riskAssessment: r.riskAssessment ?? undefined,
          riskValue: r.riskValue ?? undefined,
        }));
      }
      const reqIds = new Set((p.requirements || []).map(r => r.id));
      p.milestones = (p.milestones || []).map((milestone) => ({
        ...milestone,
        tasks: (milestone.tasks || []).map((task) => migrateTask(task, p.id, reqIds)),
      }));
      return p;
    }),
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
    problemStatement: project.problemStatement ?? '',
    strategy: project.strategy ?? '',
    objectives: project.objectives ?? [],
    owner: project.owner ?? undefined,
    devLead: project.devLead ?? undefined,
    developmentTeam: Array.isArray(project.developmentTeam) ? project.developmentTeam : [],
    stakeholders: Array.isArray(project.stakeholders) ? project.stakeholders : [],
    milestones: [],
    requirements: [],
  };
  data.projects.push(newProject);
  ensureBacklogMilestone(newProject);
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
    requirementId: task.requirementId ?? undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  delete newTask.linkedFunctionalRequirement;
  
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
  
  const riskAssessment = requirement.riskAssessment ?? undefined;
  const { riskValue } = computeRiskValue(riskAssessment);
  const newRequirement = {
    ...requirement,
    id: `requirement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId,
    type: requirement.type ?? 'user',
    objectiveId: requirement.objectiveId ?? undefined,
    risk: requirement.risk ?? undefined,
    trackingId: requirement.trackingId ?? undefined,
    riskAssessment,
    riskValue: riskValue ?? requirement.riskValue ?? undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  delete newRequirement.milestoneId;
  delete newRequirement.linkedUserRequirements;

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
  
  const current = project.requirements[requirementIndex];
  const riskAssessment = updates.riskAssessment !== undefined ? updates.riskAssessment : current.riskAssessment;
  const { riskValue } = computeRiskValue(riskAssessment);
  const merged = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  if (riskAssessment !== undefined) {
    merged.riskAssessment = riskAssessment;
    merged.riskValue = riskValue ?? undefined;
  }
  
  project.requirements[requirementIndex] = merged;
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

/** @deprecated Use getAllRequirements() - unified model. Returns same list for compatibility. */
export function getAllFunctionalRequirements() {
  return getAllRequirements();
}

// ============================================
// Metadata Management Functions
// ============================================

function getDefaultMetadata() {
  return {
    workspaceName: 'Plan-E',
    users: [],
    stakeholders: [],
    riskLevels: [
      { id: 'low', label: 'Low', order: 1, color: '#10b981' },
      { id: 'medium', label: 'Medium', order: 2, color: '#eab308' },
      { id: 'high', label: 'High', order: 3, color: '#ef4444' },
    ],
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
      { id: 'small', label: 'Small', order: 1, color: '#10b981', points: 1 },
      { id: 'medium', label: 'Medium', order: 2, color: '#3b82f6', points: 3 },
      { id: 'large', label: 'Large', order: 3, color: '#f59e0b', points: 5 },
      { id: 'x-large', label: 'X-Large', order: 4, color: '#ef4444', points: 8 },
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

  if (!migrated.workspaceName) {
    migrated.workspaceName = defaultMetadata.workspaceName;
  }
  
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
      const defaultEffort = defaultMetadata.effortLevels.find(de => de.id === e.id);
      const normalizedColor = e.color || defaultEffort?.color || '#71717a';
      const normalizedPoints = typeof e.points === 'number' ? e.points : defaultEffort?.points || 0;
      return {
        ...e,
        color: normalizedColor,
        points: normalizedPoints,
      };
    });
  }

  if (!migrated.stakeholders) {
    migrated.stakeholders = [];
  }
  if (!migrated.riskLevels || migrated.riskLevels.length === 0) {
    migrated.riskLevels = defaultMetadata.riskLevels;
  } else {
    migrated.riskLevels = migrated.riskLevels.map(r => {
      const d = defaultMetadata.riskLevels.find(dr => dr.id === r.id);
      return { ...r, color: r.color || d?.color || '#71717a' };
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

export function getWorkspaceName() {
  const metadata = readMetadata();
  return metadata.workspaceName || getDefaultMetadata().workspaceName;
}

export function setWorkspaceName(name) {
  const metadata = readMetadata();
  const sanitized = (typeof name === 'string' ? name.trim() : '') || getDefaultMetadata().workspaceName;
  metadata.workspaceName = sanitized;
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

// Stakeholders
export function getStakeholders() {
  const metadata = readMetadata();
  return metadata.stakeholders || [];
}

export function addStakeholder(name) {
  const metadata = readMetadata();
  if (!metadata.stakeholders) {
    metadata.stakeholders = [];
  }
  const newStakeholder = {
    id: `stakeholder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: (typeof name === 'string' ? name : '').trim(),
    createdAt: new Date().toISOString(),
  };
  metadata.stakeholders.push(newStakeholder);
  writeMetadata(metadata);
  return newStakeholder;
}

export function updateStakeholder(stakeholderId, updates) {
  const metadata = readMetadata();
  if (!metadata.stakeholders) return null;
  const idx = metadata.stakeholders.findIndex(s => s.id === stakeholderId);
  if (idx === -1) return null;
  metadata.stakeholders[idx] = {
    ...metadata.stakeholders[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeMetadata(metadata);
  return metadata.stakeholders[idx];
}

export function deleteStakeholder(stakeholderId) {
  const metadata = readMetadata();
  if (!metadata.stakeholders) return false;
  const initialLength = metadata.stakeholders.length;
  metadata.stakeholders = metadata.stakeholders.filter(s => s.id !== stakeholderId);
  writeMetadata(metadata);
  return metadata.stakeholders.length < initialLength;
}

// Risk levels (for requirements)
export function getRiskLevels() {
  const metadata = readMetadata();
  return (metadata.riskLevels || []).sort((a, b) => (a.order || 0) - (b.order || 0));
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

export function addEffortLevel(label, color = '#71717a', points = 0) {
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
    points: Number.isFinite(Number(points)) ? Number(points) : 0,
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

