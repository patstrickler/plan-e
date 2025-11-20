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
  editingMetadata: new Map(), // For editing metadata items in settings
  taskSearch: '',
  taskFilterStatus: '',
  taskFilterPriority: '',
  taskFilterProject: '',
  taskFilterResource: '',
};

// DOM elements
const elements = {
  loading: document.getElementById('loading'),
  projectsView: document.getElementById('projects-view'),
  milestonesView: document.getElementById('milestones-view'),
  tasksView: document.getElementById('tasks-view'),
  settingsView: document.getElementById('settings-view'),
  projectsList: document.getElementById('projects-list'),
  milestonesList: document.getElementById('milestones-list'),
  tasksList: document.getElementById('tasks-list'),
  newProjectBtn: document.getElementById('new-project-btn'),
  newProjectForm: document.getElementById('new-project-form'),
  newMilestoneBtn: document.getElementById('new-milestone-btn'),
  newMilestoneForm: document.getElementById('new-milestone-form'),
  newTaskBtn: document.getElementById('new-task-btn'),
  newTaskForm: document.getElementById('new-task-form'),
  // Settings elements
  usersList: document.getElementById('users-list'),
  prioritiesList: document.getElementById('priorities-list'),
  statusesList: document.getElementById('statuses-list'),
  effortLevelsList: document.getElementById('effort-levels-list'),
};

// Initialize app
function init() {
  loadProjects();
  setupEventListeners();
  updateAllSelects(); // Initialize all selects with metadata
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
  elements.settingsView.style.display = viewName === 'settings' ? 'block' : 'none';
  
  if (viewName === 'milestones') {
    renderMilestones();
  } else if (viewName === 'tasks') {
    renderTasks();
  } else if (viewName === 'settings') {
    renderSettings();
  }
}

// Event listeners setup
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href === '#projects') showView('projects');
      if (href === '#milestones') showView('milestones');
      if (href === '#tasks') showView('tasks');
      if (href === '#settings') showView('settings');
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
    // Initialize date picker for milestone target date
    if (!window.milestoneTargetDatePicker) {
      window.milestoneTargetDatePicker = flatpickr('#milestone-target-date', {
        dateFormat: 'Y-m-d',
        allowInput: true,
      });
    }
  });

  document.getElementById('cancel-milestone-btn')?.addEventListener('click', () => {
    elements.newMilestoneForm.style.display = 'none';
    elements.newMilestoneBtn.style.display = 'block';
    document.getElementById('milestone-title').value = '';
    document.getElementById('milestone-description').value = '';
    document.getElementById('milestone-target-date').value = '';
    if (window.milestoneTargetDatePicker) {
      window.milestoneTargetDatePicker.clear();
    }
  });

  elements.newMilestoneForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const projectId = document.getElementById('milestone-project').value;
    const title = document.getElementById('milestone-title').value.trim();
    const description = document.getElementById('milestone-description').value.trim();
    const targetDate = window.milestoneTargetDatePicker ? window.milestoneTargetDatePicker.input.value : document.getElementById('milestone-target-date').value;
    
    if (!title || !projectId) return;
    
    try {
      storage.createMilestone(projectId, { 
        title, 
        description: description || undefined,
        targetDate: targetDate || undefined
      });
      document.getElementById('milestone-title').value = '';
      document.getElementById('milestone-description').value = '';
      document.getElementById('milestone-target-date').value = '';
      if (window.milestoneTargetDatePicker) {
        window.milestoneTargetDatePicker.clear();
      }
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
    updateAllSelects(); // Populate priority, effort, and resource selects
    elements.newTaskForm.style.display = 'block';
    elements.newTaskBtn.style.display = 'none';
    document.getElementById('task-title').focus();
    // Initialize date picker for task due date
    if (!window.taskDueDatePicker) {
      window.taskDueDatePicker = flatpickr('#task-due-date', {
        dateFormat: 'Y-m-d',
        allowInput: true,
      });
    }
  });

  document.getElementById('task-project')?.addEventListener('change', (e) => {
    populateMilestoneSelect('task-milestone', e.target.value);
  });

  document.getElementById('cancel-task-btn')?.addEventListener('click', () => {
    elements.newTaskForm.style.display = 'none';
    elements.newTaskBtn.style.display = 'block';
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-due-date').value = '';
    if (window.taskDueDatePicker) {
      window.taskDueDatePicker.clear();
    }
  });

  elements.newTaskForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const projectId = document.getElementById('task-project').value;
    const milestoneId = document.getElementById('task-milestone').value;
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const priority = document.getElementById('task-priority').value;
    const effort = document.getElementById('task-effort').value;
    const resource = document.getElementById('task-resource').value;
    const dueDate = window.taskDueDatePicker ? window.taskDueDatePicker.input.value : document.getElementById('task-due-date').value;
    
    if (!title || !projectId || !milestoneId) return;
    
    try {
      storage.createTask(projectId, milestoneId, {
        title,
        description: description || undefined,
        priority: priority || undefined,
        effortLevel: effort || undefined,
        assignedResource: resource || undefined,
        dueDate: dueDate || undefined,
      });
      document.getElementById('task-title').value = '';
      document.getElementById('task-description').value = '';
      document.getElementById('task-priority').value = '';
      document.getElementById('task-effort').value = '';
      document.getElementById('task-resource').value = '';
      document.getElementById('task-due-date').value = '';
      if (window.taskDueDatePicker) {
        window.taskDueDatePicker.clear();
      }
      elements.newTaskForm.style.display = 'none';
      elements.newTaskBtn.style.display = 'block';
      renderTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  });

  // Settings event listeners
  setupSettingsEventListeners();
  
  // Task search and filter listeners
  setupTaskSearchAndFilterListeners();
}

function setupTaskSearchAndFilterListeners() {
  const searchInput = document.getElementById('task-search');
  const statusFilter = document.getElementById('task-filter-status');
  const priorityFilter = document.getElementById('task-filter-priority');
  const projectFilter = document.getElementById('task-filter-project');
  const resourceFilter = document.getElementById('task-filter-resource');
  
  searchInput?.addEventListener('input', (e) => {
    state.taskSearch = e.target.value;
    renderTasks();
  });
  
  statusFilter?.addEventListener('change', (e) => {
    state.taskFilterStatus = e.target.value;
    renderTasks();
  });
  
  priorityFilter?.addEventListener('change', (e) => {
    state.taskFilterPriority = e.target.value;
    renderTasks();
  });
  
  projectFilter?.addEventListener('change', (e) => {
    state.taskFilterProject = e.target.value;
    renderTasks();
  });
  
  resourceFilter?.addEventListener('change', (e) => {
    state.taskFilterResource = e.target.value;
    renderTasks();
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
  
  // Calculate progress for each milestone
  const milestoneProgressHtml = project.milestones.length > 0 ? `
    <div class="project-milestones-progress">
      <h3 class="text-sm" style="margin-bottom: 0.75rem; font-weight: 600;">Milestone Progress</h3>
      <div class="milestones-progress-list">
        ${project.milestones.map(m => {
          const totalTasks = m.tasks ? m.tasks.length : 0;
          const notStartedTasks = m.tasks ? m.tasks.filter(t => t.status === 'not-started' || !t.status).length : 0;
          const inProgressTasks = m.tasks ? m.tasks.filter(t => t.status === 'in-progress').length : 0;
          const completedTasks = m.tasks ? m.tasks.filter(t => t.status === 'completed').length : 0;
          
          const notStartedPercent = totalTasks > 0 ? Math.round((notStartedTasks / totalTasks) * 100) : 0;
          const inProgressPercent = totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0;
          const completedPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          
          return `
            <div class="milestone-progress-item">
              <div class="milestone-progress-header">
                <span class="milestone-progress-title">${escapeHtml(m.title)}</span>
                <span class="milestone-progress-stats">${completedTasks} complete, ${inProgressTasks} in progress, ${notStartedTasks} not started</span>
              </div>
              <div class="progress-bar-container">
                ${notStartedPercent > 0 ? `<div class="progress-bar-segment progress-bar-not-started" style="width: ${notStartedPercent}%"></div>` : ''}
                ${inProgressPercent > 0 ? `<div class="progress-bar-segment progress-bar-in-progress" style="width: ${inProgressPercent}%"></div>` : ''}
                ${completedPercent > 0 ? `<div class="progress-bar-segment progress-bar-completed" style="width: ${completedPercent}%"></div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';
  
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
      ${milestoneProgressHtml}
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
    const targetDateValue = milestone.targetDate ? new Date(milestone.targetDate).toISOString().split('T')[0] : '';
    const dueDateValue = milestone.dueDate ? new Date(milestone.dueDate).toISOString().split('T')[0] : '';
    const stakeholdersList = milestone.stakeholders || [];
    const stakeholdersHtml = stakeholdersList.map((stakeholder, idx) => `
      <span class="stakeholder-tag" data-milestone-id="${milestone.id}" data-index="${idx}">
        ${escapeHtml(stakeholder)}
        <button type="button" class="stakeholder-remove" data-milestone-id="${milestone.id}" data-index="${idx}">×</button>
      </span>
    `).join('');
    
    return `
      <div class="milestone-card" data-milestone-id="${milestone.id}" data-project-id="${projectId}">
        <div class="milestone-edit-form">
          <input type="text" class="edit-title" value="${escapeHtml(milestone.title)}" data-milestone-id="${milestone.id}" placeholder="Milestone title" required>
          <textarea class="edit-description" data-milestone-id="${milestone.id}" placeholder="Description (optional)" rows="2">${escapeHtml(milestone.description || '')}</textarea>
          
          <div class="form-row">
            <div class="form-group">
              <label>Priority</label>
              <select class="edit-priority" data-milestone-id="${milestone.id}">
                <option value="">None</option>
                <option value="low" ${milestone.priority === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${milestone.priority === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${milestone.priority === 'high' ? 'selected' : ''}>High</option>
              </select>
            </div>
            <div class="form-group">
              <label>Target Date</label>
              <input type="date" class="edit-target-date" value="${targetDateValue}" data-milestone-id="${milestone.id}">
            </div>
            <div class="form-group">
              <label>Due Date</label>
              <input type="date" class="edit-due-date" value="${dueDateValue}" data-milestone-id="${milestone.id}">
            </div>
          </div>
          
          <div class="form-group">
            <label>Stakeholders</label>
            <div class="stakeholders-list" data-milestone-id="${milestone.id}">
              ${stakeholdersHtml}
            </div>
            <div class="stakeholder-input-row">
              <input type="text" class="edit-stakeholder-input" data-milestone-id="${milestone.id}" placeholder="Enter stakeholder name">
              <button type="button" class="btn btn-secondary btn-sm add-stakeholder-btn" data-milestone-id="${milestone.id}">Add</button>
            </div>
          </div>
          
          <div class="form-actions">
            <button class="btn btn-primary btn-sm save-milestone" data-milestone-id="${milestone.id}" data-project-id="${projectId}">Save</button>
            <button class="btn btn-secondary btn-sm cancel-edit-milestone" data-milestone-id="${milestone.id}">Cancel</button>
          </div>
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
          ${milestone.priority ? `<span class="badge ${milestone.priority === 'high' ? 'badge-red' : milestone.priority === 'medium' ? 'badge-yellow' : 'badge-green'}">${milestone.priority.toUpperCase()}</span>` : ''}
          ${milestone.targetDate ? `<p class="text-xs text-muted">Target Date: ${new Date(milestone.targetDate).toLocaleDateString()}</p>` : ''}
          ${milestone.dueDate ? `<p class="text-xs text-muted">Due: ${new Date(milestone.dueDate).toLocaleDateString()}</p>` : ''}
          ${milestone.stakeholders && milestone.stakeholders.length > 0 ? `<div class="stakeholders-display">${milestone.stakeholders.map(s => `<span class="badge badge-gray">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
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
    const statuses = storage.getStatuses();
    const priorities = storage.getPriorities();
    const effortLevels = storage.getEffortLevels();
    const users = storage.getUsers();
    
    const statusOptions = statuses.map(s => 
      `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
    ).join('');
    
    const priorityOptions = priorities.map(p => 
      `<option value="${p.id}" ${task.priority === p.id ? 'selected' : ''}>${escapeHtml(p.label)}</option>`
    ).join('');
    
    const effortOptions = effortLevels.map(e => 
      `<option value="${e.id}" ${task.effortLevel === e.id ? 'selected' : ''}>${escapeHtml(e.label)}</option>`
    ).join('');
    
    const userOptions = users.map(u => 
      `<option value="${u.name}" ${task.assignedResource === u.name ? 'selected' : ''}>${escapeHtml(u.name)}</option>`
    ).join('');
    
    const dueDateValue = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
    
    return `
      <div class="task-card ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
        <input type="text" class="edit-title" value="${escapeHtml(task.title)}" data-task-id="${task.id}">
        <textarea class="edit-description" data-task-id="${task.id}">${escapeHtml(task.description || '')}</textarea>
        <div class="form-row">
          <div class="form-group">
            <label>Status</label>
            <select class="edit-status" data-task-id="${task.id}">
              ${statusOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Priority</label>
            <select class="edit-priority" data-task-id="${task.id}">
              <option value="">None</option>
              ${priorityOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Effort</label>
            <select class="edit-effort" data-task-id="${task.id}">
              <option value="">None</option>
              ${effortOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Resource</label>
            <select class="edit-resource" data-task-id="${task.id}">
              <option value="">None</option>
              ${userOptions}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Due Date (optional)</label>
          <input type="text" class="edit-due-date" value="${dueDateValue}" data-task-id="${task.id}" placeholder="Select due date">
        </div>
        <div class="form-actions">
          <button class="btn btn-primary btn-sm save-task" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Save</button>
          <button class="btn btn-secondary btn-sm cancel-edit-task" data-task-id="${task.id}">Cancel</button>
        </div>
      </div>
    `;
  }
  
  const statuses = storage.getStatuses();
  const status = statuses.find(s => s.id === task.status);
  const statusColor = status?.id === 'completed' ? 'badge-green' : 
                     status?.id === 'in-progress' ? 'badge-blue' : 'badge-gray';
  
  const priorities = storage.getPriorities();
  const priority = priorities.find(p => p.id === task.priority);
  const priorityColor = priority?.id === 'urgent' ? 'badge-red' :
                       priority?.id === 'high' ? 'badge-orange' :
                       priority?.id === 'medium' ? 'badge-yellow' :
                       priority?.id === 'low' ? 'badge-green' : '';
  
  const statusOptions = statuses.map(s => 
    `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');
  
  return `
    <div class="task-card ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
      <div class="project-card-header">
        <div class="project-card-content" style="flex: 1; min-width: 0;">
          <select class="task-status-select ${statusColor}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
            ${statusOptions}
          </select>
          ${task.priority && priority ? `<span class="badge ${priorityColor}">${escapeHtml(priority.label)}</span>` : ''}
          <h4>${escapeHtml(task.title)}</h4>
          ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
          <div class="task-meta">
            ${(() => {
              const effortLevels = storage.getEffortLevels();
              const effort = effortLevels.find(e => e.id === task.effortLevel);
              return effort ? `<span>Effort: ${escapeHtml(effort.label)}</span>` : '';
            })()}
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
      <input type="text" class="milestone-target-date-input" placeholder="Target Date (optional)">
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
      <input type="text" class="task-due-date-input" placeholder="Due Date (optional)">
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
  
  elements.milestonesList.innerHTML = milestones.map(m => {
    const isEditing = state.editingMilestones.has(m.id);
    const totalTasks = m.tasks ? m.tasks.length : 0;
    const notStartedTasks = m.tasks ? m.tasks.filter(t => t.status === 'not-started' || !t.status).length : 0;
    const inProgressTasks = m.tasks ? m.tasks.filter(t => t.status === 'in-progress').length : 0;
    const completedTasks = m.tasks ? m.tasks.filter(t => t.status === 'completed').length : 0;
    
    const notStartedPercent = totalTasks > 0 ? Math.round((notStartedTasks / totalTasks) * 100) : 0;
    const inProgressPercent = totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0;
    const completedPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    if (isEditing) {
      const targetDateValue = m.targetDate ? new Date(m.targetDate).toISOString().split('T')[0] : '';
      const dueDateValue = m.dueDate ? new Date(m.dueDate).toISOString().split('T')[0] : '';
      const stakeholdersList = m.stakeholders || [];
      const stakeholdersHtml = stakeholdersList.map((stakeholder, idx) => `
        <span class="stakeholder-tag" data-milestone-id="${m.id}" data-index="${idx}">
          ${escapeHtml(stakeholder)}
          <button type="button" class="stakeholder-remove" data-milestone-id="${m.id}" data-index="${idx}">×</button>
        </span>
      `).join('');
      
      return `
        <div class="milestone-card" data-milestone-id="${m.id}" data-project-id="${m.projectId}">
          <div class="milestone-edit-form">
            <input type="text" class="edit-title" value="${escapeHtml(m.title)}" data-milestone-id="${m.id}" placeholder="Milestone title" required>
            <textarea class="edit-description" data-milestone-id="${m.id}" placeholder="Description (optional)" rows="2">${escapeHtml(m.description || '')}</textarea>
            
            <div class="form-row">
              <div class="form-group">
                <label>Priority</label>
                <select class="edit-priority" data-milestone-id="${m.id}">
                  <option value="">None</option>
                  <option value="low" ${m.priority === 'low' ? 'selected' : ''}>Low</option>
                  <option value="medium" ${m.priority === 'medium' ? 'selected' : ''}>Medium</option>
                  <option value="high" ${m.priority === 'high' ? 'selected' : ''}>High</option>
                </select>
              </div>
              <div class="form-group">
                <label>Target Date</label>
                <input type="date" class="edit-target-date" value="${targetDateValue}" data-milestone-id="${m.id}">
              </div>
              <div class="form-group">
                <label>Due Date</label>
                <input type="date" class="edit-due-date" value="${dueDateValue}" data-milestone-id="${m.id}">
              </div>
            </div>
            
            <div class="form-group">
              <label>Stakeholders</label>
              <div class="stakeholders-list" data-milestone-id="${m.id}">
                ${stakeholdersHtml}
              </div>
              <div class="stakeholder-input-row">
                <input type="text" class="edit-stakeholder-input" data-milestone-id="${m.id}" placeholder="Enter stakeholder name">
                <button type="button" class="btn btn-secondary btn-sm add-stakeholder-btn" data-milestone-id="${m.id}">Add</button>
              </div>
            </div>
            
            <div class="form-actions">
              <button class="btn btn-primary btn-sm save-milestone" data-milestone-id="${m.id}" data-project-id="${m.projectId}">Save</button>
              <button class="btn btn-secondary btn-sm cancel-edit-milestone" data-milestone-id="${m.id}">Cancel</button>
            </div>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="milestone-card" data-milestone-id="${m.id}" data-project-id="${m.projectId}">
        <div class="project-card-header">
          <div class="project-card-content">
            <h3>${escapeHtml(m.title)}</h3>
            <p class="text-muted">Project: ${escapeHtml(m.project.title)}</p>
            ${m.description ? `<p>${escapeHtml(m.description)}</p>` : ''}
            ${m.priority ? `<span class="badge ${m.priority === 'high' ? 'badge-red' : m.priority === 'medium' ? 'badge-yellow' : 'badge-green'}">${m.priority.toUpperCase()}</span>` : ''}
            ${m.targetDate ? `<p class="text-xs text-muted">Target Date: ${new Date(m.targetDate).toLocaleDateString()}</p>` : ''}
            ${m.dueDate ? `<p class="text-xs text-muted">Due: ${new Date(m.dueDate).toLocaleDateString()}</p>` : ''}
            ${m.stakeholders && m.stakeholders.length > 0 ? `<div class="stakeholders-display">${m.stakeholders.map(s => `<span class="badge badge-gray">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
            <div class="milestone-progress">
              <div class="progress-bar-container">
                ${notStartedPercent > 0 ? `<div class="progress-bar-segment progress-bar-not-started" style="width: ${notStartedPercent}%"></div>` : ''}
                ${inProgressPercent > 0 ? `<div class="progress-bar-segment progress-bar-in-progress" style="width: ${inProgressPercent}%"></div>` : ''}
                ${completedPercent > 0 ? `<div class="progress-bar-segment progress-bar-completed" style="width: ${completedPercent}%"></div>` : ''}
              </div>
              <div class="progress-text">
                <span>${completedTasks} complete, ${inProgressTasks} in progress, ${notStartedTasks} not started</span>
                <span class="progress-percentage">${completedPercent}%</span>
              </div>
            </div>
          </div>
          <div class="project-card-actions">
            <button class="btn btn-blue btn-xs edit-milestone" data-milestone-id="${m.id}" data-project-id="${m.projectId}">Edit</button>
            <button class="btn btn-red btn-xs delete-milestone" data-milestone-id="${m.id}" data-project-id="${m.projectId}">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach listeners for milestones in list view
  milestones.forEach(m => {
    attachMilestoneListenersForView(m);
  });
}

function attachMilestoneListenersForView(milestone) {
  const milestoneId = milestone.id;
  const projectId = milestone.projectId;
  
  // Edit milestone
  document.querySelector(`.edit-milestone[data-milestone-id="${milestoneId}"][data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    state.editingMilestones.add(milestoneId);
    renderMilestones();
    // Initialize date picker for milestone dates after rendering
    setTimeout(() => {
      const targetDateInput = document.querySelector(`.edit-target-date[data-milestone-id="${milestoneId}"]`);
      const dueDateInput = document.querySelector(`.edit-due-date[data-milestone-id="${milestoneId}"]`);
      if (targetDateInput && !targetDateInput.flatpickr) {
        flatpickr(targetDateInput, {
          dateFormat: 'Y-m-d',
          allowInput: true,
        });
      }
      if (dueDateInput && !dueDateInput.flatpickr) {
        flatpickr(dueDateInput, {
          dateFormat: 'Y-m-d',
          allowInput: true,
        });
      }
    }, 0);
  });
  
  // Save milestone
  document.querySelector(`.save-milestone[data-milestone-id="${milestoneId}"][data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    const title = document.querySelector(`.edit-title[data-milestone-id="${milestoneId}"]`).value.trim();
    const description = document.querySelector(`.edit-description[data-milestone-id="${milestoneId}"]`).value.trim();
    const priority = document.querySelector(`.edit-priority[data-milestone-id="${milestoneId}"]`)?.value || '';
    const targetDate = document.querySelector(`.edit-target-date[data-milestone-id="${milestoneId}"]`)?.value || '';
    const dueDate = document.querySelector(`.edit-due-date[data-milestone-id="${milestoneId}"]`)?.value || '';
    
    // Get stakeholders from the DOM
    const stakeholderTags = document.querySelectorAll(`.stakeholder-tag[data-milestone-id="${milestoneId}"]`);
    const stakeholders = Array.from(stakeholderTags).map(tag => tag.textContent.replace('×', '').trim()).filter(s => s);
    
    if (!title) return;
    
    try {
      storage.updateMilestone(projectId, milestoneId, { 
        title, 
        description: description || undefined,
        priority: priority || undefined,
        targetDate: targetDate || undefined,
        dueDate: dueDate || undefined,
        stakeholders: stakeholders.length > 0 ? stakeholders : undefined
      });
      state.editingMilestones.delete(milestoneId);
      renderMilestones();
    } catch (error) {
      console.error('Failed to update milestone:', error);
      alert('Failed to update milestone');
    }
  });
  
  // Cancel edit milestone
  document.querySelector(`.cancel-edit-milestone[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    state.editingMilestones.delete(milestoneId);
    renderMilestones();
  });
  
  // Delete milestone
  document.querySelector(`.delete-milestone[data-milestone-id="${milestoneId}"][data-project-id="${projectId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${milestone.title}"?`)) return;
    
    try {
      storage.deleteMilestone(projectId, milestoneId);
      renderMilestones();
    } catch (error) {
      console.error('Failed to delete milestone:', error);
      alert('Failed to delete milestone');
    }
  });
  
  // Add stakeholder button
  document.querySelector(`.add-stakeholder-btn[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    const input = document.querySelector(`.edit-stakeholder-input[data-milestone-id="${milestoneId}"]`);
    const stakeholderName = input?.value.trim();
    if (!stakeholderName) return;
    
    // Check if already exists
    const existingTags = document.querySelectorAll(`.stakeholder-tag[data-milestone-id="${milestoneId}"]`);
    const existingNames = Array.from(existingTags).map(tag => tag.textContent.replace('×', '').trim());
    if (existingNames.includes(stakeholderName)) {
      alert('Stakeholder already added');
      return;
    }
    
    // Add stakeholder tag
    const stakeholdersList = document.querySelector(`.stakeholders-list[data-milestone-id="${milestoneId}"]`);
    if (stakeholdersList) {
      const tag = document.createElement('span');
      tag.className = 'stakeholder-tag';
      tag.setAttribute('data-milestone-id', milestoneId);
      tag.setAttribute('data-index', existingTags.length);
      tag.innerHTML = `
        ${escapeHtml(stakeholderName)}
        <button type="button" class="stakeholder-remove" data-milestone-id="${milestoneId}" data-index="${existingTags.length}">×</button>
      `;
      stakeholdersList.appendChild(tag);
      
      // Add remove listener
      tag.querySelector('.stakeholder-remove')?.addEventListener('click', (e) => {
        e.preventDefault();
        tag.remove();
        // Update indices
        const remainingTags = document.querySelectorAll(`.stakeholder-tag[data-milestone-id="${milestoneId}"]`);
        remainingTags.forEach((t, idx) => {
          t.setAttribute('data-index', idx);
          t.querySelector('.stakeholder-remove')?.setAttribute('data-index', idx);
        });
      });
    }
    
    input.value = '';
  });
  
  // Remove stakeholder button (for existing tags)
  document.querySelectorAll(`.stakeholder-remove[data-milestone-id="${milestoneId}"]`).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tag = btn.closest('.stakeholder-tag');
      if (tag) {
        tag.remove();
        // Update indices
        const remainingTags = document.querySelectorAll(`.stakeholder-tag[data-milestone-id="${milestoneId}"]`);
        remainingTags.forEach((t, idx) => {
          t.setAttribute('data-index', idx);
          t.querySelector('.stakeholder-remove')?.setAttribute('data-index', idx);
        });
      }
    });
  });
}

function renderTasks() {
  if (!elements.tasksList) return;
  
  const allTasks = storage.getAllTasks();
  
  // Apply filters
  const filteredTasks = filterTasks(allTasks);
  
  if (filteredTasks.length === 0) {
    elements.tasksList.innerHTML = `
      <div class="empty-state">
        <p>No tasks found</p>
        <p class="empty-state-sub">${allTasks.length === 0 ? 'Create your first task to get started!' : 'Try adjusting your search or filters.'}</p>
      </div>
    `;
    return;
  }
  
  // Render table
  elements.tasksList.innerHTML = renderTasksTable(filteredTasks);
  
  // Re-attach event listeners
  filteredTasks.forEach(task => {
    attachTaskListenersForView(task);
  });
  
  // Populate filter dropdowns if not already populated
  populateTaskFilters();
}

function filterTasks(tasks) {
  return tasks.filter(task => {
    // Search filter
    if (state.taskSearch) {
      const searchLower = state.taskSearch.toLowerCase();
      const matchesSearch = 
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower)) ||
        task.project.title.toLowerCase().includes(searchLower) ||
        task.milestone.title.toLowerCase().includes(searchLower) ||
        (task.assignedResource && task.assignedResource.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (state.taskFilterStatus && task.status !== state.taskFilterStatus) {
      return false;
    }
    
    // Priority filter
    if (state.taskFilterPriority && task.priority !== state.taskFilterPriority) {
      return false;
    }
    
    // Project filter
    if (state.taskFilterProject && task.projectId !== state.taskFilterProject) {
      return false;
    }
    
    // Resource filter
    if (state.taskFilterResource && task.assignedResource !== state.taskFilterResource) {
      return false;
    }
    
    return true;
  });
}

function renderTasksTable(tasks) {
  const statuses = storage.getStatuses();
  const priorities = storage.getPriorities();
  const effortLevels = storage.getEffortLevels();
  
  const rows = tasks.map(task => {
    const isEditing = state.editingTasks.has(task.id);
    const isCompleted = task.status === 'completed';
    
    if (isEditing) {
      return renderTaskTableRowEdit(task, statuses, priorities, effortLevels);
    }
    
    const status = statuses.find(s => s.id === task.status);
    const statusColor = status?.id === 'completed' ? 'badge-green' : 
                       status?.id === 'in-progress' ? 'badge-blue' : 'badge-gray';
    
    const priority = priorities.find(p => p.id === task.priority);
    const priorityColor = priority?.id === 'urgent' ? 'badge-red' :
                         priority?.id === 'high' ? 'badge-orange' :
                         priority?.id === 'medium' ? 'badge-yellow' :
                         priority?.id === 'low' ? 'badge-green' : '';
    
    const effort = effortLevels.find(e => e.id === task.effortLevel);
    
    const statusOptions = statuses.map(s => 
      `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
    ).join('');
    
    return `
      <tr class="task-table-row ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}" data-project-id="${task.projectId}" data-milestone-id="${task.milestoneId}">
        <td>
          <select class="task-status-select-view ${statusColor}" data-task-id="${task.id}" data-project-id="${task.projectId}" data-milestone-id="${task.milestoneId}">
            ${statusOptions}
          </select>
        </td>
        <td>
          ${task.priority && priority ? `<span class="badge ${priorityColor}">${escapeHtml(priority.label)}</span>` : '<span class="text-muted">—</span>'}
        </td>
        <td class="task-title-cell">
          <strong>${escapeHtml(task.title)}</strong>
          ${task.description ? `<div class="task-description-small">${escapeHtml(task.description)}</div>` : ''}
        </td>
        <td class="task-project-cell">${escapeHtml(task.project.title)}</td>
        <td class="task-milestone-cell">${escapeHtml(task.milestone.title)}</td>
        <td>${effort ? escapeHtml(effort.label) : '<span class="text-muted">—</span>'}</td>
        <td>${task.assignedResource ? escapeHtml(task.assignedResource) : '<span class="text-muted">—</span>'}</td>
        <td class="task-dates-cell">
          ${task.dueDate ? `<div class="task-date-small">Due: ${new Date(task.dueDate).toLocaleDateString()}</div>` : ''}
          ${task.startDate ? `<div class="task-date-small">Started: ${new Date(task.startDate).toLocaleDateString()}</div>` : ''}
          ${task.completedDate ? `<div class="task-date-small">Completed: ${new Date(task.completedDate).toLocaleDateString()}</div>` : ''}
          ${!task.dueDate && !task.startDate && !task.completedDate ? '<span class="text-muted">—</span>' : ''}
        </td>
        <td class="task-actions-cell">
          <button class="btn btn-blue btn-xs edit-task-view" data-task-id="${task.id}" data-project-id="${task.projectId}" data-milestone-id="${task.milestoneId}">Edit</button>
          <button class="btn btn-red btn-xs delete-task-view" data-task-id="${task.id}" data-project-id="${task.projectId}" data-milestone-id="${task.milestoneId}">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
  
  return `
    <table class="tasks-table">
      <thead>
        <tr>
          <th>Status</th>
          <th>Priority</th>
          <th>Task</th>
          <th>Project</th>
          <th>Milestone</th>
          <th>Effort</th>
          <th>Assigned</th>
          <th>Dates</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderTaskTableRowEdit(task, statuses, priorities, effortLevels, users) {
  const usersList = storage.getUsers();
  
  const statusOptions = statuses.map(s => 
    `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');
  
  const priorityOptions = priorities.map(p => 
    `<option value="${p.id}" ${task.priority === p.id ? 'selected' : ''}>${escapeHtml(p.label)}</option>`
  ).join('');
  
  const effortOptions = effortLevels.map(e => 
    `<option value="${e.id}" ${task.effortLevel === e.id ? 'selected' : ''}>${escapeHtml(e.label)}</option>`
  ).join('');
  
  const userOptions = usersList.map(u => 
    `<option value="${u.name}" ${task.assignedResource === u.name ? 'selected' : ''}>${escapeHtml(u.name)}</option>`
  ).join('');
  
  const dueDateValue = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
  
  return `
    <tr class="task-table-row task-table-row-edit" data-task-id="${task.id}" data-project-id="${task.projectId}" data-milestone-id="${task.milestoneId}">
      <td colspan="9">
        <div class="task-edit-form-inline">
          <div class="task-edit-row">
            <input type="text" class="edit-title" value="${escapeHtml(task.title)}" data-task-id="${task.id}" placeholder="Task title">
            <textarea class="edit-description-small" data-task-id="${task.id}" placeholder="Description (optional)">${escapeHtml(task.description || '')}</textarea>
          </div>
          <div class="task-edit-row">
            <select class="edit-status" data-task-id="${task.id}">
              ${statusOptions}
            </select>
            <select class="edit-priority" data-task-id="${task.id}">
              <option value="">None</option>
              ${priorityOptions}
            </select>
            <select class="edit-effort" data-task-id="${task.id}">
              <option value="">None</option>
              ${effortOptions}
            </select>
            <select class="edit-resource" data-task-id="${task.id}">
              <option value="">None</option>
              ${userOptions}
            </select>
            <input type="text" class="edit-due-date" value="${dueDateValue}" data-task-id="${task.id}" placeholder="Due Date (optional)">
          </div>
          <div class="form-actions">
            <button class="btn btn-primary btn-sm save-task-view" data-task-id="${task.id}" data-project-id="${task.projectId}" data-milestone-id="${task.milestoneId}">Save</button>
            <button class="btn btn-secondary btn-sm cancel-edit-task-view" data-task-id="${task.id}">Cancel</button>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function populateTaskFilters() {
  const statuses = storage.getStatuses();
  const priorities = storage.getPriorities();
  const projects = storage.getAllProjects();
  const users = storage.getUsers();
  
  // Populate status filter
  const statusFilter = document.getElementById('task-filter-status');
  if (statusFilter && statusFilter.options.length === 1) {
    statuses.forEach(status => {
      const option = document.createElement('option');
      option.value = status.id;
      option.textContent = status.label;
      statusFilter.appendChild(option);
    });
  }
  
  // Populate priority filter
  const priorityFilter = document.getElementById('task-filter-priority');
  if (priorityFilter && priorityFilter.options.length === 1) {
    priorities.forEach(priority => {
      const option = document.createElement('option');
      option.value = priority.id;
      option.textContent = priority.label;
      priorityFilter.appendChild(option);
    });
  }
  
  // Populate project filter
  const projectFilter = document.getElementById('task-filter-project');
  if (projectFilter && projectFilter.options.length === 1) {
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.title;
      projectFilter.appendChild(option);
    });
  }
  
  // Populate resource filter
  const resourceFilter = document.getElementById('task-filter-resource');
  if (resourceFilter && resourceFilter.options.length === 1) {
    users.forEach(user => {
      const option = document.createElement('option');
      option.value = user.name;
      option.textContent = user.name;
      resourceFilter.appendChild(option);
    });
  }
}

function renderTaskCardForView(task) {
  const isEditing = state.editingTasks.has(task.id);
  const isCompleted = task.status === 'completed';
  const projectId = task.projectId;
  const milestoneId = task.milestoneId;
  
  if (isEditing) {
    const statuses = storage.getStatuses();
    const priorities = storage.getPriorities();
    const effortLevels = storage.getEffortLevels();
    const users = storage.getUsers();
    
    const statusOptions = statuses.map(s => 
      `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
    ).join('');
    
    const priorityOptions = priorities.map(p => 
      `<option value="${p.id}" ${task.priority === p.id ? 'selected' : ''}>${escapeHtml(p.label)}</option>`
    ).join('');
    
    const effortOptions = effortLevels.map(e => 
      `<option value="${e.id}" ${task.effortLevel === e.id ? 'selected' : ''}>${escapeHtml(e.label)}</option>`
    ).join('');
    
    const userOptions = users.map(u => 
      `<option value="${u.name}" ${task.assignedResource === u.name ? 'selected' : ''}>${escapeHtml(u.name)}</option>`
    ).join('');
    
    const dueDateValue = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
    
    return `
      <div class="task-card ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
        <input type="text" class="edit-title" value="${escapeHtml(task.title)}" data-task-id="${task.id}">
        <textarea class="edit-description" data-task-id="${task.id}">${escapeHtml(task.description || '')}</textarea>
        <div class="form-row">
          <div class="form-group">
            <label>Status</label>
            <select class="edit-status" data-task-id="${task.id}">
              ${statusOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Priority</label>
            <select class="edit-priority" data-task-id="${task.id}">
              <option value="">None</option>
              ${priorityOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Effort</label>
            <select class="edit-effort" data-task-id="${task.id}">
              <option value="">None</option>
              ${effortOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Resource</label>
            <select class="edit-resource" data-task-id="${task.id}">
              <option value="">None</option>
              ${userOptions}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Due Date (optional)</label>
          <input type="text" class="edit-due-date" value="${dueDateValue}" data-task-id="${task.id}" placeholder="Select due date">
        </div>
        <div class="form-actions">
          <button class="btn btn-primary btn-sm save-task-view" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Save</button>
          <button class="btn btn-secondary btn-sm cancel-edit-task-view" data-task-id="${task.id}">Cancel</button>
        </div>
      </div>
    `;
  }
  
  const statuses = storage.getStatuses();
  const status = statuses.find(s => s.id === task.status);
  const statusColor = status?.id === 'completed' ? 'badge-green' : 
                     status?.id === 'in-progress' ? 'badge-blue' : 'badge-gray';
  
  const priorities = storage.getPriorities();
  const priority = priorities.find(p => p.id === task.priority);
  const priorityColor = priority?.id === 'urgent' ? 'badge-red' :
                       priority?.id === 'high' ? 'badge-orange' :
                       priority?.id === 'medium' ? 'badge-yellow' :
                       priority?.id === 'low' ? 'badge-green' : '';
  
  const statusOptions = statuses.map(s => 
    `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');
  
  return `
    <div class="task-card ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
      <div class="project-card-header">
        <div class="project-card-content" style="flex: 1; min-width: 0;">
          <select class="task-status-select-view ${statusColor}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
            ${statusOptions}
          </select>
          ${task.priority && priority ? `<span class="badge ${priorityColor}">${escapeHtml(priority.label)}</span>` : ''}
          <h4>${escapeHtml(task.title)}</h4>
          <p class="text-muted">Project: ${escapeHtml(task.project.title)} | Milestone: ${escapeHtml(task.milestone.title)}</p>
          ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
          <div class="task-meta">
            ${(() => {
              const effortLevels = storage.getEffortLevels();
              const effort = effortLevels.find(e => e.id === task.effortLevel);
              return effort ? `<span>Effort: ${escapeHtml(effort.label)}</span>` : '';
            })()}
            ${task.assignedResource ? `<span>Assigned to: ${escapeHtml(task.assignedResource)}</span>` : ''}
            ${task.dueDate ? `<span>Due: ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
            ${task.startDate ? `<span>Started: ${new Date(task.startDate).toLocaleDateString()}</span>` : ''}
            ${task.completedDate ? `<span>Completed: ${new Date(task.completedDate).toLocaleDateString()}</span>` : ''}
          </div>
        </div>
        <div class="project-card-actions">
          <button class="btn btn-blue btn-xs edit-task-view" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Edit</button>
          <button class="btn btn-red btn-xs delete-task-view" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function attachTaskListenersForView(task) {
  const taskId = task.id;
  const projectId = task.projectId;
  const milestoneId = task.milestoneId;
  
  // Status change
  document.querySelector(`.task-status-select-view[data-task-id="${taskId}"]`)?.addEventListener('change', (e) => {
    try {
      storage.updateTask(projectId, milestoneId, taskId, { status: e.target.value });
      renderTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
      alert('Failed to update task status');
    }
  });
  
  // Edit task
  document.querySelector(`.edit-task-view[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    state.editingTasks.add(taskId);
    renderTasks();
    // Initialize date picker for task due date after rendering
    setTimeout(() => {
      const dateInput = document.querySelector(`.edit-due-date[data-task-id="${taskId}"]`);
      if (dateInput && !dateInput.flatpickr) {
        flatpickr(dateInput, {
          dateFormat: 'Y-m-d',
          allowInput: true,
        });
      }
    }, 0);
  });
  
  // Save task
  document.querySelector(`.save-task-view[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    const title = document.querySelector(`.edit-title[data-task-id="${taskId}"]`).value.trim();
    const description = document.querySelector(`.edit-description[data-task-id="${taskId}"]`)?.value.trim() || document.querySelector(`.edit-description-small[data-task-id="${taskId}"]`)?.value.trim() || '';
    const status = document.querySelector(`.edit-status[data-task-id="${taskId}"]`).value;
    const priority = document.querySelector(`.edit-priority[data-task-id="${taskId}"]`).value;
    const effort = document.querySelector(`.edit-effort[data-task-id="${taskId}"]`).value;
    const resource = document.querySelector(`.edit-resource[data-task-id="${taskId}"]`).value;
    const dueDateInput = document.querySelector(`.edit-due-date[data-task-id="${taskId}"]`);
    const dueDate = dueDateInput ? dueDateInput.value : '';
    
    if (!title) return;
    
    try {
      storage.updateTask(projectId, milestoneId, taskId, {
        title,
        description: description || undefined,
        status,
        priority: priority || undefined,
        effortLevel: effort || undefined,
        assignedResource: resource || undefined,
        dueDate: dueDate || undefined,
      });
      state.editingTasks.delete(taskId);
      renderTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task');
    }
  });
  
  // Cancel edit task
  document.querySelector(`.cancel-edit-task-view[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    state.editingTasks.delete(taskId);
    renderTasks();
  });
  
  // Delete task
  document.querySelector(`.delete-task-view[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return;
    
    try {
      storage.deleteTask(projectId, milestoneId, taskId);
      renderTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task');
    }
  });
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

function populatePrioritySelect(select, selectedValue = '') {
  const priorities = storage.getPriorities();
  const options = priorities.map(p => 
    `<option value="${p.id}" ${selectedValue === p.id ? 'selected' : ''}>${escapeHtml(p.label)}</option>`
  ).join('');
  select.innerHTML = '<option value="">None</option>' + options;
}

function populateStatusSelect(select, selectedValue = '') {
  const statuses = storage.getStatuses();
  const options = statuses.map(s => 
    `<option value="${s.id}" ${selectedValue === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');
  select.innerHTML = options;
}

function populateEffortSelect(select, selectedValue = '') {
  const effortLevels = storage.getEffortLevels();
  const options = effortLevels.map(e => 
    `<option value="${e.id}" ${selectedValue === e.id ? 'selected' : ''}>${escapeHtml(e.label)}</option>`
  ).join('');
  select.innerHTML = '<option value="">None</option>' + options;
}

function populateUserSelect(select, selectedValue = '') {
  const users = storage.getUsers();
  const options = users.map(u => 
    `<option value="${u.name}" ${selectedValue === u.name ? 'selected' : ''}>${escapeHtml(u.name)}</option>`
  ).join('');
  select.innerHTML = '<option value="">None</option>' + options;
}

function updateAllSelects() {
  // Update new task form selects
  const taskPrioritySelect = document.getElementById('task-priority');
  const taskEffortSelect = document.getElementById('task-effort');
  const taskResourceSelect = document.getElementById('task-resource');
  
  if (taskPrioritySelect) populatePrioritySelect(taskPrioritySelect);
  if (taskEffortSelect) populateEffortSelect(taskEffortSelect);
  if (taskResourceSelect) populateUserSelect(taskResourceSelect);
  
  // Re-render views to update all dynamic selects
  if (currentView === 'projects') {
    renderProjects();
  } else if (currentView === 'tasks') {
    renderTasks();
    populateTaskFilters();
  }
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
    // Initialize date picker for inline milestone target date after rendering
    setTimeout(() => {
      const dateInput = document.querySelector(`.milestone-target-date-input[data-project-id="${projectId}"]`);
      if (dateInput && !dateInput.flatpickr) {
        flatpickr(dateInput, {
          dateFormat: 'Y-m-d',
          allowInput: true,
        });
      }
    }, 0);
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
    const targetDateInput = e.target.querySelector('.milestone-target-date-input');
    const targetDate = targetDateInput ? targetDateInput.value : '';
    
    if (!title) return;
    
    try {
      storage.createMilestone(projectId, { 
        title, 
        description: description || undefined,
        targetDate: targetDate || undefined
      });
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
    // Initialize date picker for milestone target date after rendering
    setTimeout(() => {
      const dateInput = document.querySelector(`.edit-target-date[data-milestone-id="${milestoneId}"]`);
      if (dateInput && !dateInput.flatpickr) {
        flatpickr(dateInput, {
          dateFormat: 'Y-m-d',
          allowInput: true,
        });
      }
    }, 0);
  });
  
  // Save milestone
  document.querySelector(`.save-milestone[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    const title = document.querySelector(`.edit-title[data-milestone-id="${milestoneId}"]`).value.trim();
    const description = document.querySelector(`.edit-description[data-milestone-id="${milestoneId}"]`).value.trim();
    const priority = document.querySelector(`.edit-priority[data-milestone-id="${milestoneId}"]`)?.value || '';
    const targetDate = document.querySelector(`.edit-target-date[data-milestone-id="${milestoneId}"]`)?.value || '';
    const dueDate = document.querySelector(`.edit-due-date[data-milestone-id="${milestoneId}"]`)?.value || '';
    
    // Get stakeholders from the DOM
    const stakeholderTags = document.querySelectorAll(`.stakeholder-tag[data-milestone-id="${milestoneId}"]`);
    const stakeholders = Array.from(stakeholderTags).map(tag => tag.textContent.replace('×', '').trim()).filter(s => s);
    
    if (!title) return;
    
    try {
      storage.updateMilestone(projectId, milestoneId, { 
        title, 
        description: description || undefined,
        priority: priority || undefined,
        targetDate: targetDate || undefined,
        dueDate: dueDate || undefined,
        stakeholders: stakeholders.length > 0 ? stakeholders : undefined
      });
      state.editingMilestones.delete(milestoneId);
      loadProjects();
    } catch (error) {
      console.error('Failed to update milestone:', error);
      alert('Failed to update milestone');
    }
  });
  
  // Add stakeholder button
  document.querySelector(`.add-stakeholder-btn[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    const input = document.querySelector(`.edit-stakeholder-input[data-milestone-id="${milestoneId}"]`);
    const stakeholderName = input?.value.trim();
    if (!stakeholderName) return;
    
    // Check if already exists
    const existingTags = document.querySelectorAll(`.stakeholder-tag[data-milestone-id="${milestoneId}"]`);
    const existingNames = Array.from(existingTags).map(tag => tag.textContent.replace('×', '').trim());
    if (existingNames.includes(stakeholderName)) {
      alert('Stakeholder already added');
      return;
    }
    
    // Add stakeholder tag
    const stakeholdersList = document.querySelector(`.stakeholders-list[data-milestone-id="${milestoneId}"]`);
    if (stakeholdersList) {
      const tag = document.createElement('span');
      tag.className = 'stakeholder-tag';
      tag.setAttribute('data-milestone-id', milestoneId);
      tag.setAttribute('data-index', existingTags.length);
      tag.innerHTML = `
        ${escapeHtml(stakeholderName)}
        <button type="button" class="stakeholder-remove" data-milestone-id="${milestoneId}" data-index="${existingTags.length}">×</button>
      `;
      stakeholdersList.appendChild(tag);
      
      // Add remove listener
      tag.querySelector('.stakeholder-remove')?.addEventListener('click', (e) => {
        e.preventDefault();
        tag.remove();
        // Update indices
        const remainingTags = document.querySelectorAll(`.stakeholder-tag[data-milestone-id="${milestoneId}"]`);
        remainingTags.forEach((t, idx) => {
          t.setAttribute('data-index', idx);
          t.querySelector('.stakeholder-remove')?.setAttribute('data-index', idx);
        });
      });
    }
    
    input.value = '';
  });
  
  // Remove stakeholder button (for existing tags)
  document.querySelectorAll(`.stakeholder-remove[data-milestone-id="${milestoneId}"]`).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tag = btn.closest('.stakeholder-tag');
      if (tag) {
        tag.remove();
        // Update indices
        const remainingTags = document.querySelectorAll(`.stakeholder-tag[data-milestone-id="${milestoneId}"]`);
        remainingTags.forEach((t, idx) => {
          t.setAttribute('data-index', idx);
          t.querySelector('.stakeholder-remove')?.setAttribute('data-index', idx);
        });
      }
    });
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
    // Initialize date picker for inline task due date after rendering
    setTimeout(() => {
      const dateInput = document.querySelector(`.task-due-date-input[data-milestone-id="${milestoneId}"]`);
      if (dateInput && !dateInput.flatpickr) {
        flatpickr(dateInput, {
          dateFormat: 'Y-m-d',
          allowInput: true,
        });
      }
    }, 0);
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
    const dueDateInput = e.target.querySelector('.task-due-date-input');
    const dueDate = dueDateInput ? dueDateInput.value : '';
    
    if (!title) return;
    
    try {
      storage.createTask(projectId, milestoneId, { 
        title, 
        description: description || undefined,
        dueDate: dueDate || undefined
      });
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
    // Initialize date picker for task due date after rendering
    setTimeout(() => {
      const dateInput = document.querySelector(`.edit-due-date[data-task-id="${taskId}"]`);
      if (dateInput && !dateInput.flatpickr) {
        flatpickr(dateInput, {
          dateFormat: 'Y-m-d',
          allowInput: true,
        });
      }
    }, 0);
  });
  
  // Save task
  document.querySelector(`.save-task[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    const title = document.querySelector(`.edit-title[data-task-id="${taskId}"]`).value.trim();
    const description = document.querySelector(`.edit-description[data-task-id="${taskId}"]`).value.trim();
    const status = document.querySelector(`.edit-status[data-task-id="${taskId}"]`).value;
    const priority = document.querySelector(`.edit-priority[data-task-id="${taskId}"]`).value;
    const effort = document.querySelector(`.edit-effort[data-task-id="${taskId}"]`).value;
    const resource = document.querySelector(`.edit-resource[data-task-id="${taskId}"]`).value;
    const dueDateInput = document.querySelector(`.edit-due-date[data-task-id="${taskId}"]`);
    const dueDate = dueDateInput ? dueDateInput.value : '';
    
    if (!title) return;
    
    try {
      storage.updateTask(projectId, milestoneId, taskId, {
        title,
        description: description || undefined,
        status,
        priority: priority || undefined,
        effortLevel: effort || undefined,
        assignedResource: resource || undefined,
        dueDate: dueDate || undefined,
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

// ============================================
// Settings Page Functions
// ============================================

function renderSettings() {
  renderUsers();
  renderPriorities();
  renderStatuses();
  renderEffortLevels();
}

function renderUsers() {
  if (!elements.usersList) return;
  
  const users = storage.getUsers();
  
  if (users.length === 0) {
    elements.usersList.innerHTML = '<p class="text-muted">No users yet. Add one above!</p>';
    return;
  }
  
  elements.usersList.innerHTML = users.map(user => {
    const isEditing = state.editingMetadata.get(`user-${user.id}`);
    
    if (isEditing) {
      return `
        <div class="metadata-item-editing" data-user-id="${user.id}">
          <input type="text" class="edit-user-name" value="${escapeHtml(user.name)}" data-user-id="${user.id}">
          <div class="metadata-item-editing-actions">
            <button class="btn btn-primary btn-sm save-user" data-user-id="${user.id}">Save</button>
            <button class="btn btn-secondary btn-sm cancel-edit-user" data-user-id="${user.id}">Cancel</button>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="metadata-item" data-user-id="${user.id}">
        <div class="metadata-item-content">
          <span class="metadata-item-label">${escapeHtml(user.name)}</span>
        </div>
        <div class="metadata-item-actions">
          <button class="btn btn-blue btn-xs edit-user" data-user-id="${user.id}">Edit</button>
          <button class="btn btn-red btn-xs delete-user" data-user-id="${user.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners
  users.forEach(user => {
    attachUserListeners(user);
  });
}

function renderPriorities() {
  if (!elements.prioritiesList) return;
  
  const priorities = storage.getPriorities();
  
  if (priorities.length === 0) {
    elements.prioritiesList.innerHTML = '<p class="text-muted">No priorities yet. Add one above!</p>';
    return;
  }
  
  elements.prioritiesList.innerHTML = priorities.map(priority => {
    const isEditing = state.editingMetadata.get(`priority-${priority.id}`);
    
    if (isEditing) {
      return `
        <div class="metadata-item-editing" data-priority-id="${priority.id}">
          <input type="text" class="edit-priority-label" value="${escapeHtml(priority.label)}" data-priority-id="${priority.id}" placeholder="Label">
          <div class="metadata-item-editing-actions">
            <button class="btn btn-primary btn-sm save-priority" data-priority-id="${priority.id}">Save</button>
            <button class="btn btn-secondary btn-sm cancel-edit-priority" data-priority-id="${priority.id}">Cancel</button>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="metadata-item" data-priority-id="${priority.id}">
        <div class="metadata-item-content">
          <span class="metadata-item-label">${escapeHtml(priority.label)}</span>
        </div>
        <div class="metadata-item-actions">
          <button class="btn btn-blue btn-xs edit-priority-item" data-priority-id="${priority.id}">Edit</button>
          <button class="btn btn-red btn-xs delete-priority-item" data-priority-id="${priority.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners
  priorities.forEach(priority => {
    attachPriorityListeners(priority);
  });
  
  // Setup drag-and-drop for priorities
  setupDragAndDrop('priorities-list', 'priority', (ids) => {
    storage.reorderPriorities(ids);
    updateAllSelects();
  });
}

function renderStatuses() {
  if (!elements.statusesList) return;
  
  const statuses = storage.getStatuses();
  
  if (statuses.length === 0) {
    elements.statusesList.innerHTML = '<p class="text-muted">No statuses yet. Add one above!</p>';
    return;
  }
  
  elements.statusesList.innerHTML = statuses.map(status => {
    const isEditing = state.editingMetadata.get(`status-${status.id}`);
    
    if (isEditing) {
      return `
        <div class="metadata-item-editing" data-status-id="${status.id}">
          <input type="text" class="edit-status-label" value="${escapeHtml(status.label)}" data-status-id="${status.id}" placeholder="Label">
          <div class="metadata-item-editing-actions">
            <button class="btn btn-primary btn-sm save-status" data-status-id="${status.id}">Save</button>
            <button class="btn btn-secondary btn-sm cancel-edit-status" data-status-id="${status.id}">Cancel</button>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="metadata-item" data-status-id="${status.id}">
        <div class="metadata-item-content">
          <span class="metadata-item-label">${escapeHtml(status.label)}</span>
        </div>
        <div class="metadata-item-actions">
          <button class="btn btn-blue btn-xs edit-status-item" data-status-id="${status.id}">Edit</button>
          <button class="btn btn-red btn-xs delete-status-item" data-status-id="${status.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners
  statuses.forEach(status => {
    attachStatusListeners(status);
  });
  
  // Setup drag-and-drop for statuses
  setupDragAndDrop('statuses-list', 'status', (ids) => {
    storage.reorderStatuses(ids);
    updateAllSelects();
  });
}

function renderEffortLevels() {
  if (!elements.effortLevelsList) return;
  
  const effortLevels = storage.getEffortLevels();
  
  if (effortLevels.length === 0) {
    elements.effortLevelsList.innerHTML = '<p class="text-muted">No effort levels yet. Add one above!</p>';
    return;
  }
  
  elements.effortLevelsList.innerHTML = effortLevels.map(effort => {
    const isEditing = state.editingMetadata.get(`effort-${effort.id}`);
    
    if (isEditing) {
      return `
        <div class="metadata-item-editing" data-effort-id="${effort.id}">
          <input type="text" class="edit-effort-label" value="${escapeHtml(effort.label)}" data-effort-id="${effort.id}" placeholder="Label">
          <div class="metadata-item-editing-actions">
            <button class="btn btn-primary btn-sm save-effort" data-effort-id="${effort.id}">Save</button>
            <button class="btn btn-secondary btn-sm cancel-edit-effort" data-effort-id="${effort.id}">Cancel</button>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="metadata-item" data-effort-id="${effort.id}">
        <div class="metadata-item-content">
          <span class="metadata-item-label">${escapeHtml(effort.label)}</span>
        </div>
        <div class="metadata-item-actions">
          <button class="btn btn-blue btn-xs edit-effort-item" data-effort-id="${effort.id}">Edit</button>
          <button class="btn btn-red btn-xs delete-effort-item" data-effort-id="${effort.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners
  effortLevels.forEach(effort => {
    attachEffortListeners(effort);
  });
  
  // Setup drag-and-drop for effort levels
  setupDragAndDrop('effort-levels-list', 'effort', (ids) => {
    storage.reorderEffortLevels(ids);
    updateAllSelects();
  });
}

function setupDragAndDrop(listId, typePrefix, reorderCallback) {
  const list = document.getElementById(listId);
  if (!list) return;
  
  let draggedElement = null;
  let draggedIndex = -1;
  
  // Get all draggable items
  const items = Array.from(list.querySelectorAll(`.metadata-item[data-${typePrefix}-id]`));
  
  items.forEach((item, index) => {
    item.draggable = true;
    item.dataset.index = index;
    
    item.addEventListener('dragstart', (e) => {
      draggedElement = item;
      draggedIndex = index;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', item.innerHTML);
    });
    
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      items.forEach(i => i.classList.remove('drag-over'));
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const afterElement = getDragAfterElement(list, e.clientY);
      const currentTarget = e.currentTarget;
      
      items.forEach(i => i.classList.remove('drag-over'));
      
      if (afterElement == null) {
        currentTarget.classList.add('drag-over');
      } else {
        afterElement.classList.add('drag-over');
      }
    });
    
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      
      if (draggedElement === null) return;
      
      const afterElement = getDragAfterElement(list, e.clientY);
      const currentTarget = e.currentTarget;
      
      if (afterElement == null) {
        list.appendChild(draggedElement);
      } else {
        list.insertBefore(draggedElement, afterElement);
      }
      
      // Get new order of IDs
      const newItems = Array.from(list.querySelectorAll(`.metadata-item[data-${typePrefix}-id]`));
      const newIds = newItems.map(i => {
        // Extract ID from data attribute based on type
        if (typePrefix === 'priority') return i.dataset.priorityId;
        if (typePrefix === 'status') return i.dataset.statusId;
        if (typePrefix === 'effort') return i.dataset.effortId;
        return null;
      }).filter(id => id !== null);
      
      // Update order
      reorderCallback(newIds);
      
      // Re-render to update
      renderSettings();
    });
    
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.metadata-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function setupSettingsEventListeners() {
  // Users
  document.getElementById('add-user-btn')?.addEventListener('click', () => {
    document.getElementById('add-user-form').style.display = 'block';
    document.getElementById('add-user-btn').style.display = 'none';
    document.getElementById('user-name').focus();
  });

  document.getElementById('cancel-user-btn')?.addEventListener('click', () => {
    document.getElementById('add-user-form').style.display = 'none';
    document.getElementById('add-user-btn').style.display = 'block';
    document.getElementById('user-name').value = '';
  });

  document.getElementById('add-user-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('user-name').value.trim();
    
    if (!name) return;
    
    try {
      storage.addUser(name);
      document.getElementById('user-name').value = '';
      document.getElementById('add-user-form').style.display = 'none';
      document.getElementById('add-user-btn').style.display = 'block';
      renderSettings();
      updateAllSelects(); // Update all selects with new metadata
    } catch (error) {
      console.error('Failed to add user:', error);
      alert('Failed to add user');
    }
  });

  // Priorities
  document.getElementById('add-priority-btn')?.addEventListener('click', () => {
    document.getElementById('add-priority-form').style.display = 'block';
    document.getElementById('add-priority-btn').style.display = 'none';
    document.getElementById('priority-label').focus();
  });

  document.getElementById('cancel-priority-btn')?.addEventListener('click', () => {
    document.getElementById('add-priority-form').style.display = 'none';
    document.getElementById('add-priority-btn').style.display = 'block';
    document.getElementById('priority-label').value = '';
  });

  document.getElementById('add-priority-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = document.getElementById('priority-label').value.trim();
    
    if (!label) return;
    
    try {
      storage.addPriority(label);
      document.getElementById('priority-label').value = '';
      document.getElementById('add-priority-form').style.display = 'none';
      document.getElementById('add-priority-btn').style.display = 'block';
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to add priority:', error);
      alert('Failed to add priority');
    }
  });

  // Statuses
  document.getElementById('add-status-btn')?.addEventListener('click', () => {
    document.getElementById('add-status-form').style.display = 'block';
    document.getElementById('add-status-btn').style.display = 'none';
    document.getElementById('status-label').focus();
  });

  document.getElementById('cancel-status-btn')?.addEventListener('click', () => {
    document.getElementById('add-status-form').style.display = 'none';
    document.getElementById('add-status-btn').style.display = 'block';
    document.getElementById('status-label').value = '';
  });

  document.getElementById('add-status-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = document.getElementById('status-label').value.trim();
    
    if (!label) return;
    
    try {
      storage.addStatus(label);
      document.getElementById('status-label').value = '';
      document.getElementById('add-status-form').style.display = 'none';
      document.getElementById('add-status-btn').style.display = 'block';
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to add status:', error);
      alert('Failed to add status');
    }
  });

  // Effort Levels
  document.getElementById('add-effort-btn')?.addEventListener('click', () => {
    document.getElementById('add-effort-form').style.display = 'block';
    document.getElementById('add-effort-btn').style.display = 'none';
    document.getElementById('effort-label').focus();
  });

  document.getElementById('cancel-effort-btn')?.addEventListener('click', () => {
    document.getElementById('add-effort-form').style.display = 'none';
    document.getElementById('add-effort-btn').style.display = 'block';
    document.getElementById('effort-label').value = '';
  });

  document.getElementById('add-effort-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = document.getElementById('effort-label').value.trim();
    
    if (!label) return;
    
    try {
      storage.addEffortLevel(label);
      document.getElementById('effort-label').value = '';
      document.getElementById('add-effort-form').style.display = 'none';
      document.getElementById('add-effort-btn').style.display = 'block';
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to add effort level:', error);
      alert('Failed to add effort level');
    }
  });
}

function attachUserListeners(user) {
  const userId = user.id;
  
  document.querySelector(`.edit-user[data-user-id="${userId}"]`)?.addEventListener('click', () => {
    state.editingMetadata.set(`user-${userId}`, true);
    renderSettings();
  });
  
  document.querySelector(`.save-user[data-user-id="${userId}"]`)?.addEventListener('click', () => {
    const name = document.querySelector(`.edit-user-name[data-user-id="${userId}"]`).value.trim();
    
    if (!name) return;
    
    try {
      storage.updateUser(userId, { name });
      state.editingMetadata.delete(`user-${userId}`);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    }
  });
  
  document.querySelector(`.cancel-edit-user[data-user-id="${userId}"]`)?.addEventListener('click', () => {
    state.editingMetadata.delete(`user-${userId}`);
    renderSettings();
  });
  
  document.querySelector(`.delete-user[data-user-id="${userId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${user.name}"?`)) return;
    
    try {
      storage.deleteUser(userId);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  });
}

function attachPriorityListeners(priority) {
  const priorityId = priority.id;
  
  document.querySelector(`.edit-priority-item[data-priority-id="${priorityId}"]`)?.addEventListener('click', () => {
    state.editingMetadata.set(`priority-${priorityId}`, true);
    renderSettings();
  });
  
  document.querySelector(`.save-priority[data-priority-id="${priorityId}"]`)?.addEventListener('click', () => {
    const label = document.querySelector(`.edit-priority-label[data-priority-id="${priorityId}"]`).value.trim();
    
    if (!label) return;
    
    try {
      storage.updatePriority(priorityId, { label });
      state.editingMetadata.delete(`priority-${priorityId}`);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to update priority:', error);
      alert('Failed to update priority');
    }
  });
  
  document.querySelector(`.cancel-edit-priority[data-priority-id="${priorityId}"]`)?.addEventListener('click', () => {
    state.editingMetadata.delete(`priority-${priorityId}`);
    renderSettings();
  });
  
  document.querySelector(`.delete-priority-item[data-priority-id="${priorityId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${priority.label}"?`)) return;
    
    try {
      storage.deletePriority(priorityId);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to delete priority:', error);
      alert('Failed to delete priority');
    }
  });
}

function attachStatusListeners(status) {
  const statusId = status.id;
  
  document.querySelector(`.edit-status-item[data-status-id="${statusId}"]`)?.addEventListener('click', () => {
    state.editingMetadata.set(`status-${statusId}`, true);
    renderSettings();
  });
  
  document.querySelector(`.save-status[data-status-id="${statusId}"]`)?.addEventListener('click', () => {
    const label = document.querySelector(`.edit-status-label[data-status-id="${statusId}"]`).value.trim();
    
    if (!label) return;
    
    try {
      storage.updateStatus(statusId, { label });
      state.editingMetadata.delete(`status-${statusId}`);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    }
  });
  
  document.querySelector(`.cancel-edit-status[data-status-id="${statusId}"]`)?.addEventListener('click', () => {
    state.editingMetadata.delete(`status-${statusId}`);
    renderSettings();
  });
  
  document.querySelector(`.delete-status-item[data-status-id="${statusId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${status.label}"?`)) return;
    
    try {
      storage.deleteStatus(statusId);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to delete status:', error);
      alert('Failed to delete status');
    }
  });
}

function attachEffortListeners(effort) {
  const effortId = effort.id;
  
  document.querySelector(`.edit-effort-item[data-effort-id="${effortId}"]`)?.addEventListener('click', () => {
    state.editingMetadata.set(`effort-${effortId}`, true);
    renderSettings();
  });
  
  document.querySelector(`.save-effort[data-effort-id="${effortId}"]`)?.addEventListener('click', () => {
    const label = document.querySelector(`.edit-effort-label[data-effort-id="${effortId}"]`).value.trim();
    
    if (!label) return;
    
    try {
      storage.updateEffortLevel(effortId, { label });
      state.editingMetadata.delete(`effort-${effortId}`);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to update effort level:', error);
      alert('Failed to update effort level');
    }
  });
  
  document.querySelector(`.cancel-edit-effort[data-effort-id="${effortId}"]`)?.addEventListener('click', () => {
    state.editingMetadata.delete(`effort-${effortId}`);
    renderSettings();
  });
  
  document.querySelector(`.delete-effort-item[data-effort-id="${effortId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${effort.label}"?`)) return;
    
    try {
      storage.deleteEffortLevel(effortId);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to delete effort level:', error);
      alert('Failed to delete effort level');
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

