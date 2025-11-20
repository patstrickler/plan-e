import * as storage from './storage.js';

// State management
let currentView = 'projects';
const state = {
  projects: [],
  expandedProjects: new Set(),
  editingProjects: new Set(),
  editingMilestones: new Set(),
  editingTasks: new Set(),
  showAddMilestone: new Map(),
  showAddTask: new Map(),
};

// DOM elements
const elements = {
  loading: document.getElementById('loading'),
  projectsView: document.getElementById('projects-view'),
  milestonesView: document.getElementById('milestones-view'),
  tasksView: document.getElementById('tasks-view'),
  projectsList: document.getElementById('projects-list'),
  milestonesList: document.getElementById('milestones-list'),
  tasksList: document.getElementById('tasks-list'),
  newProjectBtn: document.getElementById('new-project-btn'),
  newProjectForm: document.getElementById('new-project-form'),
  newMilestoneBtn: document.getElementById('new-milestone-btn'),
  newMilestoneForm: document.getElementById('new-milestone-form'),
  newTaskBtn: document.getElementById('new-task-btn'),
  newTaskForm: document.getElementById('new-task-form'),
};

// Initialize app
function init() {
  loadProjects();
  setupEventListeners();
  hideLoading();
}

function hideLoading() {
  if (elements.loading) {
    elements.loading.style.display = 'none';
  }
}

function loadProjects() {
  try {
    state.projects = storage.getAllProjects();
    renderProjects();
  } catch (error) {
    console.error('Failed to load projects:', error);
  }
}

// View switching
function showView(viewName) {
  currentView = viewName;
  elements.projectsView.style.display = viewName === 'projects' ? 'block' : 'none';
  elements.milestonesView.style.display = viewName === 'milestones' ? 'block' : 'none';
  elements.tasksView.style.display = viewName === 'tasks' ? 'block' : 'none';
  
  if (viewName === 'milestones') {
    renderMilestones();
  } else if (viewName === 'tasks') {
    renderTasks();
  }
}

// Event listeners setup
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href === '#milestones') showView('milestones');
      if (href === '#tasks') showView('tasks');
    });
  });

  document.querySelectorAll('.back-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showView('projects');
    });
  });

  // Project form
  elements.newProjectBtn?.addEventListener('click', () => {
    elements.newProjectForm.style.display = 'block';
    elements.newProjectBtn.style.display = 'none';
    document.getElementById('project-title').focus();
  });

  document.getElementById('cancel-project-btn')?.addEventListener('click', () => {
    elements.newProjectForm.style.display = 'none';
    elements.newProjectBtn.style.display = 'block';
    document.getElementById('project-title').value = '';
    document.getElementById('project-description').value = '';
  });

  elements.newProjectForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('project-title').value.trim();
    const description = document.getElementById('project-description').value.trim();
    
    if (!title) return;
    
    try {
      storage.createProject({ title, description: description || undefined });
      document.getElementById('project-title').value = '';
      document.getElementById('project-description').value = '';
      elements.newProjectForm.style.display = 'none';
      elements.newProjectBtn.style.display = 'block';
      loadProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    }
  });

  // Milestone form
  elements.newMilestoneBtn?.addEventListener('click', () => {
    populateProjectSelect('milestone-project');
    elements.newMilestoneForm.style.display = 'block';
    elements.newMilestoneBtn.style.display = 'none';
    document.getElementById('milestone-title').focus();
  });

  document.getElementById('cancel-milestone-btn')?.addEventListener('click', () => {
    elements.newMilestoneForm.style.display = 'none';
    elements.newMilestoneBtn.style.display = 'block';
    document.getElementById('milestone-title').value = '';
    document.getElementById('milestone-description').value = '';
  });

  elements.newMilestoneForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const projectId = document.getElementById('milestone-project').value;
    const title = document.getElementById('milestone-title').value.trim();
    const description = document.getElementById('milestone-description').value.trim();
    
    if (!title || !projectId) return;
    
    try {
      storage.createMilestone(projectId, { title, description: description || undefined });
      document.getElementById('milestone-title').value = '';
      document.getElementById('milestone-description').value = '';
      elements.newMilestoneForm.style.display = 'none';
      elements.newMilestoneBtn.style.display = 'block';
      renderMilestones();
    } catch (error) {
      console.error('Failed to create milestone:', error);
      alert('Failed to create milestone');
    }
  });

  // Task form
  elements.newTaskBtn?.addEventListener('click', () => {
    populateProjectSelect('task-project');
    elements.newTaskForm.style.display = 'block';
    elements.newTaskBtn.style.display = 'none';
    document.getElementById('task-title').focus();
  });

  document.getElementById('task-project')?.addEventListener('change', (e) => {
    populateMilestoneSelect('task-milestone', e.target.value);
  });

  document.getElementById('cancel-task-btn')?.addEventListener('click', () => {
    elements.newTaskForm.style.display = 'none';
    elements.newTaskBtn.style.display = 'block';
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
  });

  elements.newTaskForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const projectId = document.getElementById('task-project').value;
    const milestoneId = document.getElementById('task-milestone').value;
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const priority = document.getElementById('task-priority').value;
    const effort = document.getElementById('task-effort').value;
    const resource = document.getElementById('task-resource').value.trim();
    
    if (!title || !projectId || !milestoneId) return;
    
    try {
      storage.createTask(projectId, milestoneId, {
        title,
        description: description || undefined,
        priority: priority || undefined,
        effortLevel: effort || undefined,
        assignedResource: resource || undefined,
      });
      document.getElementById('task-title').value = '';
      document.getElementById('task-description').value = '';
      document.getElementById('task-resource').value = '';
      elements.newTaskForm.style.display = 'none';
      elements.newTaskBtn.style.display = 'block';
      renderTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  });
}

// Render functions
function renderProjects() {
  if (!elements.projectsList) return;
  
  if (state.projects.length === 0) {
    elements.projectsList.innerHTML = `
      <div class="empty-state">
        <p>No projects yet</p>
        <p class="empty-state-sub">Create your first project to get started!</p>
      </div>
    `;
    return;
  }
  
  elements.projectsList.innerHTML = state.projects.map(project => renderProjectCard(project)).join('');
  
  // Re-attach event listeners
  state.projects.forEach(project => {
    attachProjectListeners(project);
  });
}

function renderProjectCard(project) {
  const isExpanded = state.expandedProjects.has(project.id);
  const isEditing = state.editingProjects.has(project.id);
  const showAddMilestone = state.showAddMilestone.get(project.id);
  
  if (isEditing) {
    return `
      <div class="project-card" data-project-id="${project.id}">
        <div class="project-card-header">
          <div class="project-card-content">
            <input type="text" class="edit-title" value="${escapeHtml(project.title)}" data-project-id="${project.id}">
            <textarea class="edit-description" data-project-id="${project.id}">${escapeHtml(project.description || '')}</textarea>
            <div class="form-actions">
              <button class="btn btn-primary btn-sm save-project" data-project-id="${project.id}">Save</button>
              <button class="btn btn-secondary btn-sm cancel-edit-project" data-project-id="${project.id}">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  const milestonesHtml = isExpanded ? `
    <div class="expanded-content">
      <div class="mb-4">
        ${showAddMilestone ? renderAddMilestoneForm(project.id) : `<button class="btn btn-green btn-sm add-milestone-btn" data-project-id="${project.id}">+ Add Milestone</button>`}
      </div>
      <div class="milestones-list">
        ${project.milestones.length === 0 
          ? '<p class="text-muted">No milestones yet. Add one above!</p>'
          : project.milestones.map(m => renderMilestoneCard(m, project.id)).join('')
        }
      </div>
    </div>
  ` : '';
  
  return `
    <div class="project-card" data-project-id="${project.id}">
      <div class="project-card-header">
        <div class="project-card-content">
          <h2>${escapeHtml(project.title)}</h2>
          ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ''}
          <p class="text-xs text-muted">${project.milestones.length} milestone${project.milestones.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="project-card-actions">
          <button class="btn btn-gray btn-sm toggle-expand" data-project-id="${project.id}">${isExpanded ? 'Collapse' : 'Expand'}</button>
          <button class="btn btn-blue btn-sm edit-project" data-project-id="${project.id}">Edit</button>
          <button class="btn btn-red btn-sm delete-project" data-project-id="${project.id}">Delete</button>
        </div>
      </div>
      ${milestonesHtml}
    </div>
  `;
}

function renderMilestoneCard(milestone, projectId) {
  const isExpanded = state.expandedProjects.has(`${projectId}-${milestone.id}`);
  const isEditing = state.editingMilestones.has(milestone.id);
  const showAddTask = state.showAddTask.get(milestone.id);
  
  const completedTasks = milestone.tasks.filter(t => t.status === 'completed').length;
  const totalTasks = milestone.tasks.length;
  
  if (isEditing) {
    return `
      <div class="milestone-card" data-milestone-id="${milestone.id}" data-project-id="${projectId}">
        <input type="text" class="edit-title" value="${escapeHtml(milestone.title)}" data-milestone-id="${milestone.id}">
        <textarea class="edit-description" data-milestone-id="${milestone.id}">${escapeHtml(milestone.description || '')}</textarea>
        <div class="form-actions">
          <button class="btn btn-primary btn-sm save-milestone" data-milestone-id="${milestone.id}" data-project-id="${projectId}">Save</button>
          <button class="btn btn-secondary btn-sm cancel-edit-milestone" data-milestone-id="${milestone.id}">Cancel</button>
        </div>
      </div>
    `;
  }
  
  const tasksHtml = isExpanded ? `
    <div class="expanded-content">
      <div class="mb-4">
        ${showAddTask ? renderAddTaskForm(projectId, milestone.id) : `<button class="btn btn-green btn-sm add-task-btn" data-project-id="${projectId}" data-milestone-id="${milestone.id}">+ Add Task</button>`}
      </div>
      <div class="tasks-list">
        ${milestone.tasks.length === 0 
          ? '<p class="text-muted">No tasks yet. Add one above!</p>'
          : milestone.tasks.map(t => renderTaskCard(t, projectId, milestone.id)).join('')
        }
      </div>
    </div>
  ` : '';
  
  return `
    <div class="milestone-card" data-milestone-id="${milestone.id}" data-project-id="${projectId}">
      <div class="project-card-header">
        <div class="project-card-content">
          <h3>${escapeHtml(milestone.title)}</h3>
          ${milestone.description ? `<p>${escapeHtml(milestone.description)}</p>` : ''}
          ${milestone.dueDate ? `<p class="text-xs text-muted">Due: ${new Date(milestone.dueDate).toLocaleDateString()}</p>` : ''}
          <p class="text-xs text-muted">${completedTasks}/${totalTasks} tasks completed</p>
        </div>
        <div class="project-card-actions">
          <button class="btn btn-gray btn-xs toggle-milestone-expand" data-project-id="${projectId}" data-milestone-id="${milestone.id}">${isExpanded ? 'Collapse' : 'Expand'}</button>
          <button class="btn btn-blue btn-xs edit-milestone" data-milestone-id="${milestone.id}" data-project-id="${projectId}">Edit</button>
          <button class="btn btn-red btn-xs delete-milestone" data-milestone-id="${milestone.id}" data-project-id="${projectId}">Delete</button>
        </div>
      </div>
      ${tasksHtml}
    </div>
  `;
}

function renderTaskCard(task, projectId, milestoneId) {
  const isEditing = state.editingTasks.has(task.id);
  const isCompleted = task.status === 'completed';
  
  if (isEditing) {
    return `
      <div class="task-card ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
        <input type="text" class="edit-title" value="${escapeHtml(task.title)}" data-task-id="${task.id}">
        <textarea class="edit-description" data-task-id="${task.id}">${escapeHtml(task.description || '')}</textarea>
        <div class="form-row">
          <div class="form-group">
            <label>Status</label>
            <select class="edit-status" data-task-id="${task.id}">
              <option value="not-started" ${task.status === 'not-started' ? 'selected' : ''}>Not Started</option>
              <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
              <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
          </div>
          <div class="form-group">
            <label>Priority</label>
            <select class="edit-priority" data-task-id="${task.id}">
              <option value="">None</option>
              <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
              <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
              <option value="urgent" ${task.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
            </select>
          </div>
          <div class="form-group">
            <label>Effort</label>
            <select class="edit-effort" data-task-id="${task.id}">
              <option value="">None</option>
              <option value="small" ${task.effortLevel === 'small' ? 'selected' : ''}>Small</option>
              <option value="medium" ${task.effortLevel === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="large" ${task.effortLevel === 'large' ? 'selected' : ''}>Large</option>
              <option value="x-large" ${task.effortLevel === 'x-large' ? 'selected' : ''}>X-Large</option>
            </select>
          </div>
          <div class="form-group">
            <label>Resource</label>
            <input type="text" class="edit-resource" value="${escapeHtml(task.assignedResource || '')}" data-task-id="${task.id}" placeholder="Assigned to">
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary btn-sm save-task" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Save</button>
          <button class="btn btn-secondary btn-sm cancel-edit-task" data-task-id="${task.id}">Cancel</button>
        </div>
      </div>
    `;
  }
  
  const statusColor = {
    'completed': 'badge-green',
    'in-progress': 'badge-blue',
    'not-started': 'badge-gray',
  }[task.status] || 'badge-gray';
  
  const priorityColor = {
    'urgent': 'badge-red',
    'high': 'badge-orange',
    'medium': 'badge-yellow',
    'low': 'badge-green',
  }[task.priority] || '';
  
  return `
    <div class="task-card ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
      <div class="project-card-header">
        <div class="project-card-content" style="flex: 1; min-width: 0;">
          <select class="task-status-select ${statusColor}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
            <option value="not-started" ${task.status === 'not-started' ? 'selected' : ''}>Not Started</option>
            <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
            <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
          </select>
          ${task.priority ? `<span class="badge ${priorityColor}">${task.priority}</span>` : ''}
          <h4>${escapeHtml(task.title)}</h4>
          ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
          <div class="task-meta">
            ${task.effortLevel ? `<span>Effort: ${task.effortLevel}</span>` : ''}
            ${task.assignedResource ? `<span>Assigned to: ${escapeHtml(task.assignedResource)}</span>` : ''}
            ${task.startDate ? `<span>Started: ${new Date(task.startDate).toLocaleDateString()}</span>` : ''}
            ${task.completedDate ? `<span>Completed: ${new Date(task.completedDate).toLocaleDateString()}</span>` : ''}
          </div>
        </div>
        <div class="project-card-actions">
          <button class="btn btn-blue btn-xs edit-task" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Edit</button>
          <button class="btn btn-red btn-xs delete-task" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function renderAddMilestoneForm(projectId) {
  return `
    <form class="add-milestone-form" data-project-id="${projectId}">
      <input type="text" class="milestone-title-input" placeholder="Milestone title" required>
      <textarea class="milestone-description-input" placeholder="Description (optional)" rows="2"></textarea>
      <div class="form-actions">
        <button type="submit" class="btn btn-green btn-sm">Add Milestone</button>
        <button type="button" class="btn btn-secondary btn-sm cancel-add-milestone" data-project-id="${projectId}">Cancel</button>
      </div>
    </form>
  `;
}

function renderAddTaskForm(projectId, milestoneId) {
  return `
    <form class="add-task-form" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
      <input type="text" class="task-title-input" placeholder="Task title" required>
      <textarea class="task-description-input" placeholder="Description (optional)" rows="2"></textarea>
      <div class="form-actions">
        <button type="submit" class="btn btn-green btn-sm">Add Task</button>
        <button type="button" class="btn btn-secondary btn-sm cancel-add-task" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Cancel</button>
      </div>
    </form>
  `;
}

function renderMilestones() {
  if (!elements.milestonesList) return;
  
  const milestones = storage.getAllMilestones();
  
  if (milestones.length === 0) {
    elements.milestonesList.innerHTML = `
      <div class="empty-state">
        <p>No milestones yet</p>
        <p class="empty-state-sub">Create your first milestone to get started!</p>
      </div>
    `;
    return;
  }
  
  elements.milestonesList.innerHTML = milestones.map(m => `
    <div class="milestone-card">
      <h3>${escapeHtml(m.title)}</h3>
      <p class="text-muted">Project: ${escapeHtml(m.project.title)}</p>
      ${m.description ? `<p>${escapeHtml(m.description)}</p>` : ''}
    </div>
  `).join('');
}

function renderTasks() {
  if (!elements.tasksList) return;
  
  const tasks = storage.getAllTasks();
  
  if (tasks.length === 0) {
    elements.tasksList.innerHTML = `
      <div class="empty-state">
        <p>No tasks yet</p>
        <p class="empty-state-sub">Create your first task to get started!</p>
      </div>
    `;
    return;
  }
  
  elements.tasksList.innerHTML = tasks.map(t => `
    <div class="task-card ${t.status === 'completed' ? 'task-completed' : ''}">
      <h4>${escapeHtml(t.title)}</h4>
      <p class="text-muted">Project: ${escapeHtml(t.project.title)} | Milestone: ${escapeHtml(t.milestone.title)}</p>
      ${t.description ? `<p>${escapeHtml(t.description)}</p>` : ''}
      <span class="badge ${t.status === 'completed' ? 'badge-green' : t.status === 'in-progress' ? 'badge-blue' : 'badge-gray'}">${t.status}</span>
    </div>
  `).join('');
}

// Helper functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function populateProjectSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '<option value="">Select a project</option>' +
    state.projects.map(p => `<option value="${p.id}">${escapeHtml(p.title)}</option>`).join('');
}

function populateMilestoneSelect(selectId, projectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const project = state.projects.find(p => p.id === projectId);
  if (!project) {
    select.innerHTML = '<option value="">Select a project first</option>';
    return;
  }
  
  select.innerHTML = '<option value="">Select a milestone</option>' +
    project.milestones.map(m => `<option value="${m.id}">${escapeHtml(m.title)}</option>`).join('');
}

// Attach event listeners to project cards
function attachProjectListeners(project) {
  const projectId = project.id;
  
  // Toggle expand
  document.querySelector(`.toggle-expand[data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    if (state.expandedProjects.has(projectId)) {
      state.expandedProjects.delete(projectId);
    } else {
      state.expandedProjects.add(projectId);
    }
    renderProjects();
  });
  
  // Edit project
  document.querySelector(`.edit-project[data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    state.editingProjects.add(projectId);
    renderProjects();
  });
  
  // Save project
  document.querySelector(`.save-project[data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    const title = document.querySelector(`.edit-title[data-project-id="${projectId}"]`).value.trim();
    const description = document.querySelector(`.edit-description[data-project-id="${projectId}"]`).value.trim();
    
    if (!title) return;
    
    try {
      storage.updateProject(projectId, { title, description: description || undefined });
      state.editingProjects.delete(projectId);
      loadProjects();
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('Failed to update project');
    }
  });
  
  // Cancel edit project
  document.querySelector(`.cancel-edit-project[data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    state.editingProjects.delete(projectId);
    renderProjects();
  });
  
  // Delete project
  document.querySelector(`.delete-project[data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${project.title}"?`)) return;
    
    try {
      storage.deleteProject(projectId);
      loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  });
  
  // Add milestone button
  document.querySelector(`.add-milestone-btn[data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    state.showAddMilestone.set(projectId, true);
    renderProjects();
  });
  
  // Cancel add milestone
  document.querySelector(`.cancel-add-milestone[data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    state.showAddMilestone.delete(projectId);
    renderProjects();
  });
  
  // Add milestone form
  document.querySelector(`.add-milestone-form[data-project-id="${projectId}"]`)?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = e.target.querySelector('.milestone-title-input').value.trim();
    const description = e.target.querySelector('.milestone-description-input').value.trim();
    
    if (!title) return;
    
    try {
      storage.createMilestone(projectId, { title, description: description || undefined });
      state.showAddMilestone.delete(projectId);
      loadProjects();
    } catch (error) {
      console.error('Failed to create milestone:', error);
      alert('Failed to create milestone');
    }
  });
  
  // Milestone listeners
  project.milestones.forEach(milestone => {
    attachMilestoneListeners(projectId, milestone);
  });
}

function attachMilestoneListeners(projectId, milestone) {
  const milestoneId = milestone.id;
  const key = `${projectId}-${milestoneId}`;
  
  // Toggle milestone expand
  document.querySelector(`.toggle-milestone-expand[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    if (state.expandedProjects.has(key)) {
      state.expandedProjects.delete(key);
    } else {
      state.expandedProjects.add(key);
    }
    renderProjects();
  });
  
  // Edit milestone
  document.querySelector(`.edit-milestone[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    state.editingMilestones.add(milestoneId);
    renderProjects();
  });
  
  // Save milestone
  document.querySelector(`.save-milestone[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    const title = document.querySelector(`.edit-title[data-milestone-id="${milestoneId}"]`).value.trim();
    const description = document.querySelector(`.edit-description[data-milestone-id="${milestoneId}"]`).value.trim();
    
    if (!title) return;
    
    try {
      storage.updateMilestone(projectId, milestoneId, { title, description: description || undefined });
      state.editingMilestones.delete(milestoneId);
      loadProjects();
    } catch (error) {
      console.error('Failed to update milestone:', error);
      alert('Failed to update milestone');
    }
  });
  
  // Cancel edit milestone
  document.querySelector(`.cancel-edit-milestone[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    state.editingMilestones.delete(milestoneId);
    renderProjects();
  });
  
  // Delete milestone
  document.querySelector(`.delete-milestone[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${milestone.title}"?`)) return;
    
    try {
      storage.deleteMilestone(projectId, milestoneId);
      loadProjects();
    } catch (error) {
      console.error('Failed to delete milestone:', error);
      alert('Failed to delete milestone');
    }
  });
  
  // Add task button
  document.querySelector(`.add-task-btn[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    state.showAddTask.set(milestoneId, true);
    renderProjects();
  });
  
  // Cancel add task
  document.querySelector(`.cancel-add-task[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    state.showAddTask.delete(milestoneId);
    renderProjects();
  });
  
  // Add task form
  document.querySelector(`.add-task-form[data-milestone-id="${milestoneId}"]`)?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = e.target.querySelector('.task-title-input').value.trim();
    const description = e.target.querySelector('.task-description-input').value.trim();
    
    if (!title) return;
    
    try {
      storage.createTask(projectId, milestoneId, { title, description: description || undefined });
      state.showAddTask.delete(milestoneId);
      loadProjects();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  });
  
  // Task listeners
  milestone.tasks.forEach(task => {
    attachTaskListeners(projectId, milestoneId, task);
  });
}

function attachTaskListeners(projectId, milestoneId, task) {
  const taskId = task.id;
  
  // Status change
  document.querySelector(`.task-status-select[data-task-id="${taskId}"]`)?.addEventListener('change', (e) => {
    try {
      storage.updateTask(projectId, milestoneId, taskId, { status: e.target.value });
      loadProjects();
    } catch (error) {
      console.error('Failed to update task status:', error);
      alert('Failed to update task status');
    }
  });
  
  // Edit task
  document.querySelector(`.edit-task[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    state.editingTasks.add(taskId);
    renderProjects();
  });
  
  // Save task
  document.querySelector(`.save-task[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    const title = document.querySelector(`.edit-title[data-task-id="${taskId}"]`).value.trim();
    const description = document.querySelector(`.edit-description[data-task-id="${taskId}"]`).value.trim();
    const status = document.querySelector(`.edit-status[data-task-id="${taskId}"]`).value;
    const priority = document.querySelector(`.edit-priority[data-task-id="${taskId}"]`).value;
    const effort = document.querySelector(`.edit-effort[data-task-id="${taskId}"]`).value;
    const resource = document.querySelector(`.edit-resource[data-task-id="${taskId}"]`).value.trim();
    
    if (!title) return;
    
    try {
      storage.updateTask(projectId, milestoneId, taskId, {
        title,
        description: description || undefined,
        status,
        priority: priority || undefined,
        effortLevel: effort || undefined,
        assignedResource: resource || undefined,
      });
      state.editingTasks.delete(taskId);
      loadProjects();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task');
    }
  });
  
  // Cancel edit task
  document.querySelector(`.cancel-edit-task[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    state.editingTasks.delete(taskId);
    renderProjects();
  });
  
  // Delete task
  document.querySelector(`.delete-task[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return;
    
    try {
      storage.deleteTask(projectId, milestoneId, taskId);
      loadProjects();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task');
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

