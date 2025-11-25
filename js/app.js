import * as storage from './storage.js';

// State management
let currentView = 'projects';
const state = {
  projects: [],
  expandedProjects: new Set(),
  editingProjects: new Set(),
  editingMilestones: new Set(),
  editingTasks: new Set(),
  editingRequirements: new Set(),
  editingFunctionalRequirements: new Set(),
  showAddMilestone: new Map(),
  showAddTask: new Map(),
  editingMetadata: new Map(), // For editing metadata items in settings
  taskSearch: '',
  taskFilterStatus: '',
  taskFilterProject: '',
  taskFilterResource: '',
  milestoneSearch: '',
  milestoneFilterProject: '',
  milestoneSortColumn: '',
  milestoneSortDirection: 'asc',
  requirementSearch: '',
  requirementFilterProject: '',
  requirementFilterPriority: '',
  requirementSortColumn: '',
  requirementSortDirection: 'asc',
  functionalRequirementSearch: '',
  functionalRequirementFilterProject: '',
  functionalRequirementSortColumn: '',
  functionalRequirementSortDirection: 'asc',
  taskSortColumn: '',
  taskSortDirection: 'asc',
  activeRequirementLinkId: null,
};

let isUpdatingRequirementProjectFilter = false;
let isUpdatingFunctionalRequirementProjectFilter = false;
let isUpdatingRequirementPriorityFilter = false;

// DOM elements
const elements = {
  loading: document.getElementById('loading'),
  projectsView: document.getElementById('projects-view'),
  milestonesView: document.getElementById('milestones-view'),
  tasksView: document.getElementById('tasks-view'),
  requirementsView: document.getElementById('requirements-view'),
  functionalRequirementsView: document.getElementById('functional-requirements-view'),
  settingsView: document.getElementById('settings-view'),
  projectsList: document.getElementById('projects-list'),
  milestonesList: document.getElementById('milestones-list'),
  tasksList: document.getElementById('tasks-list'),
  requirementsList: document.getElementById('requirements-list'),
  functionalRequirementsList: document.getElementById('functional-requirements-list'),
  newProjectBtn: document.getElementById('new-project-btn'),
  newProjectForm: document.getElementById('new-project-form'),
  newMilestoneBtn: document.getElementById('new-milestone-btn'),
  newMilestoneForm: document.getElementById('new-milestone-form'),
  newTaskBtn: document.getElementById('new-task-btn'),
  newTaskForm: document.getElementById('new-task-form'),
  newRequirementBtn: document.getElementById('new-requirement-btn'),
  newRequirementForm: document.getElementById('new-requirement-form'),
  newFunctionalRequirementBtn: document.getElementById('new-functional-requirement-btn'),
  newFunctionalRequirementForm: document.getElementById('new-functional-requirement-form'),
  // Settings elements
  usersList: document.getElementById('users-list'),
  prioritiesList: document.getElementById('priorities-list'),
  statusesList: document.getElementById('statuses-list'),
  effortLevelsList: document.getElementById('effort-levels-list'),
};

// Initialize app
function init() {
  try {
    loadProjects();
    setupEventListeners();
    updateAllSelects(); // Initialize all selects with metadata
    showView('projects'); // Ensure initial view is shown
  } catch (error) {
    console.error('Error during initialization:', error);
  } finally {
    hideLoading(); // Always hide loading, even if there's an error
  }
}

function hideLoading() {
  if (elements.loading) {
    elements.loading.style.display = 'none';
  }
}

function loadProjects() {
  try {
    refreshProjectsState();
    renderProjects();
  } catch (error) {
    console.error('Failed to load projects:', error);
  }
}

function refreshProjectsState() {
  state.projects = storage.getAllProjects();
}

// View switching
function showView(viewName) {
  currentView = viewName;
  if (elements.projectsView) elements.projectsView.style.display = viewName === 'projects' ? 'block' : 'none';
  if (elements.milestonesView) elements.milestonesView.style.display = viewName === 'milestones' ? 'block' : 'none';
  if (elements.tasksView) elements.tasksView.style.display = viewName === 'tasks' ? 'block' : 'none';
  if (elements.requirementsView) elements.requirementsView.style.display = viewName === 'requirements' ? 'block' : 'none';
  if (elements.functionalRequirementsView) elements.functionalRequirementsView.style.display = viewName === 'functional-requirements' ? 'block' : 'none';
  if (elements.settingsView) elements.settingsView.style.display = viewName === 'settings' ? 'block' : 'none';
  
  if (viewName === 'milestones') {
    renderMilestones();
  } else if (viewName === 'tasks') {
    renderTasks();
  } else if (viewName === 'requirements') {
    renderRequirements();
  } else if (viewName === 'functional-requirements') {
    renderFunctionalRequirements();
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
      if (href === '#requirements') showView('requirements');
      if (href === '#functional-requirements') showView('functional-requirements');
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
    setTimeout(() => {
      if (!window.milestoneTargetDatePicker) {
        const dateInput = document.getElementById('milestone-target-date');
        if (dateInput) {
          window.milestoneTargetDatePicker = flatpickr(dateInput, {
            dateFormat: 'Y-m-d',
            clickOpens: true,
            allowInput: false,
          });
          // Ensure calendar opens on focus
          dateInput.addEventListener('focus', () => {
            window.milestoneTargetDatePicker.open();
          });
        }
      }
    }, 100);
  });

  document.getElementById('cancel-milestone-btn')?.addEventListener('click', () => {
    elements.newMilestoneForm.style.display = 'none';
    elements.newMilestoneBtn.style.display = 'block';
    document.getElementById('milestone-title').value = '';
    document.getElementById('milestone-description').value = '';
    document.getElementById('milestone-target-date').value = '';
  });

  elements.newMilestoneForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const projectId = document.getElementById('milestone-project').value;
    const title = document.getElementById('milestone-title').value.trim();
    const description = document.getElementById('milestone-description').value.trim();
    const targetDateInput = document.getElementById('milestone-target-date');
    let targetDate = '';
    if (targetDateInput) {
      if (targetDateInput.flatpickr) {
        // Get value from flatpickr instance
        const selectedDates = targetDateInput.flatpickr.selectedDates;
        if (selectedDates && selectedDates.length > 0) {
          targetDate = targetDateInput.flatpickr.formatDate(selectedDates[0], 'Y-m-d');
        } else if (targetDateInput.flatpickr.input && targetDateInput.flatpickr.input.value) {
          targetDate = targetDateInput.flatpickr.input.value;
        } else {
          targetDate = targetDateInput.value;
        }
      } else {
        targetDate = targetDateInput.value;
      }
    }
    
    // Check form validity before proceeding
    if (!elements.newMilestoneForm.checkValidity()) {
      elements.newMilestoneForm.reportValidity();
      return;
    }
    
    if (!title || !projectId) {
      alert('Please fill in all required fields.');
      return;
    }
    
    try {
      storage.createMilestone(projectId, { 
        title, 
        description: description || undefined,
        targetDate: targetDate || undefined
      });
      document.getElementById('milestone-title').value = '';
      document.getElementById('milestone-description').value = '';
      document.getElementById('milestone-target-date').value = '';
      elements.newMilestoneForm.style.display = 'none';
      elements.newMilestoneBtn.style.display = 'block';
      renderMilestones();
    } catch (error) {
      console.error('Failed to create milestone:', error);
      alert('Failed to create milestone: ' + error.message);
    }
  });

  // Requirement form
  elements.newRequirementBtn?.addEventListener('click', () => {
    populateProjectSelect('requirement-project');
    updateAllSelects(); // Populate priority selects
    elements.newRequirementForm.style.display = 'block';
    elements.newRequirementBtn.style.display = 'none';
    document.getElementById('requirement-title').focus();
  });

  // Handle project change to populate milestones
  document.getElementById('requirement-project')?.addEventListener('change', (e) => {
    populateMilestoneSelect('requirement-milestone', e.target.value);
  });

  document.getElementById('cancel-requirement-btn')?.addEventListener('click', () => {
    elements.newRequirementForm.style.display = 'none';
    elements.newRequirementBtn.style.display = 'block';
    document.getElementById('requirement-title').value = '';
    document.getElementById('requirement-description').value = '';
    document.getElementById('requirement-priority').value = '';
    document.getElementById('requirement-milestone').value = '';
    const milestoneSelect = document.getElementById('requirement-milestone');
    if (milestoneSelect) {
      milestoneSelect.innerHTML = '<option value="">None</option>';
    }
  });

  elements.newRequirementForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const projectId = document.getElementById('requirement-project').value;
    const milestoneId = document.getElementById('requirement-milestone').value;
    const title = document.getElementById('requirement-title').value.trim();
    const description = document.getElementById('requirement-description').value.trim();
    const priority = document.getElementById('requirement-priority').value;
    
    if (!title || !projectId) return;
    
    try {
      storage.createRequirement(projectId, { 
        title, 
        description: description || undefined,
        priority: priority || undefined,
        milestoneId: milestoneId || undefined
      });
      document.getElementById('requirement-title').value = '';
      document.getElementById('requirement-description').value = '';
      document.getElementById('requirement-priority').value = '';
      document.getElementById('requirement-milestone').value = '';
      const milestoneSelect = document.getElementById('requirement-milestone');
      if (milestoneSelect) {
        milestoneSelect.innerHTML = '<option value="">None</option>';
      }
      elements.newRequirementForm.style.display = 'none';
      elements.newRequirementBtn.style.display = 'block';
      renderRequirements();
    } catch (error) {
      console.error('Failed to create requirement:', error);
      alert('Failed to create requirement');
    }
  });

  // Functional Requirement form
  elements.newFunctionalRequirementBtn?.addEventListener('click', () => {
    populateProjectSelect('functional-requirement-project');
    elements.newFunctionalRequirementForm.style.display = 'block';
    elements.newFunctionalRequirementBtn.style.display = 'none';
    document.getElementById('functional-requirement-tracking-id').focus();
  });

  // Handle project change to populate user requirements
  document.getElementById('functional-requirement-project')?.addEventListener('change', (e) => {
    populateUserRequirementsSelect('functional-requirement-linked-user-requirements', e.target.value);
  });

  document.getElementById('cancel-functional-requirement-btn')?.addEventListener('click', () => {
    elements.newFunctionalRequirementForm.style.display = 'none';
    elements.newFunctionalRequirementBtn.style.display = 'block';
    document.getElementById('functional-requirement-tracking-id').value = '';
    document.getElementById('functional-requirement-title').value = '';
    document.getElementById('functional-requirement-description').value = '';
    document.getElementById('functional-requirement-project').value = '';
    const userReqsSelect = document.getElementById('functional-requirement-linked-user-requirements');
    if (userReqsSelect) {
      userReqsSelect.innerHTML = '';
    }
  });

  elements.newFunctionalRequirementForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const projectId = document.getElementById('functional-requirement-project').value;
    const trackingId = document.getElementById('functional-requirement-tracking-id').value.trim();
    const title = document.getElementById('functional-requirement-title').value.trim();
    const description = document.getElementById('functional-requirement-description').value.trim();
    const linkedUserReqsSelect = document.getElementById('functional-requirement-linked-user-requirements');
    const linkedUserRequirements = Array.from(linkedUserReqsSelect.selectedOptions).map(opt => opt.value);
    
    if (!title || !projectId) return;
    
    try {
      storage.createFunctionalRequirement(projectId, { 
        trackingId: trackingId || undefined,
        title, 
        description: description || undefined,
        linkedUserRequirements: linkedUserRequirements || []
      });
      document.getElementById('functional-requirement-tracking-id').value = '';
      document.getElementById('functional-requirement-title').value = '';
      document.getElementById('functional-requirement-description').value = '';
      document.getElementById('functional-requirement-project').value = '';
      if (linkedUserReqsSelect) {
        linkedUserReqsSelect.innerHTML = '';
        Array.from(linkedUserReqsSelect.options).forEach(opt => opt.selected = false);
      }
      elements.newFunctionalRequirementForm.style.display = 'none';
      elements.newFunctionalRequirementBtn.style.display = 'block';
      renderFunctionalRequirements();
      renderRequirements();
    } catch (error) {
      console.error('Failed to create functional requirement:', error);
      alert('Failed to create functional requirement');
    }
  });

  // Task form
  const newTaskBtn = document.getElementById('new-task-btn');
  const newTaskForm = document.getElementById('new-task-form');
  if (newTaskBtn && newTaskForm) {
    newTaskBtn.addEventListener('click', () => {
      populateProjectSelect('task-project');
      updateAllSelects(); // Populate effort and resource selects
      // Clear and reset functional requirement select
      const functionalReqSelect = document.getElementById('task-functional-requirement');
      if (functionalReqSelect) {
        functionalReqSelect.innerHTML = '<option value="">Select a project first</option>';
        functionalReqSelect.value = '';
      }
      // Reset project select
      const projectSelect = document.getElementById('task-project');
      if (projectSelect) {
        projectSelect.value = '';
      }
      newTaskForm.style.display = 'block';
      newTaskBtn.style.display = 'none';
      const titleInput = document.getElementById('task-title');
      if (titleInput) {
        titleInput.focus();
      }
      // Initialize date picker for task due date
      setTimeout(() => {
        if (!window.taskDueDatePicker) {
          const dateInput = document.getElementById('task-due-date');
          if (dateInput) {
            window.taskDueDatePicker = flatpickr(dateInput, {
              dateFormat: 'Y-m-d',
              clickOpens: true,
              allowInput: false,
            });
            dateInput.addEventListener('focus', () => {
              window.taskDueDatePicker.open();
            });
          }
        }
      }, 100);
    });
  } else {
    console.error('new-task-btn or new-task-form element not found');
  }

  document.getElementById('task-project')?.addEventListener('change', (e) => {
    populateFunctionalRequirementSelect('task-functional-requirement', e.target.value);
  });

  const cancelTaskBtn = document.getElementById('cancel-task-btn');
  if (cancelTaskBtn) {
    cancelTaskBtn.addEventListener('click', () => {
      const taskForm = document.getElementById('new-task-form');
      const taskBtn = document.getElementById('new-task-btn');
      if (taskForm) taskForm.style.display = 'none';
      if (taskBtn) taskBtn.style.display = 'block';
      const titleInput = document.getElementById('task-title');
      if (titleInput) titleInput.value = '';
      const descInput = document.getElementById('task-description');
      if (descInput) descInput.value = '';
      const dueDateInput = document.getElementById('task-due-date');
      if (dueDateInput) dueDateInput.value = '';
      // Reset project select
      const projectSelect = document.getElementById('task-project');
      if (projectSelect) {
        projectSelect.value = '';
      }
      const functionalReqSelect = document.getElementById('task-functional-requirement');
      if (functionalReqSelect) {
        functionalReqSelect.innerHTML = '<option value="">Select a project first</option>';
        functionalReqSelect.value = '';
      }
      // Reset other selects
      const effortSelect = document.getElementById('task-effort');
      if (effortSelect) effortSelect.value = '';
      const resourceSelect = document.getElementById('task-resource');
      if (resourceSelect) resourceSelect.value = '';
      if (window.taskDueDatePicker) {
        window.taskDueDatePicker.clear();
      }
    });
  }

  // Edit task form
  const editTaskForm = document.getElementById('edit-task-form');
  const cancelEditTaskBtn = document.getElementById('cancel-edit-task-btn');
  
  cancelEditTaskBtn?.addEventListener('click', () => {
    editTaskForm.style.display = 'none';
    // Clear date picker if it exists
    const editDueDateInput = document.getElementById('edit-task-due-date');
    if (editDueDateInput && editDueDateInput.flatpickr) {
      editDueDateInput.flatpickr.clear();
    }
  });

  // Function to open edit task modal and populate it
  window.openEditTaskModal = function(task) {
    const editTaskForm = document.getElementById('edit-task-form');
    if (!editTaskForm) return;

    // Populate form fields
    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('edit-task-project-id').value = task.projectId;
    document.getElementById('edit-task-milestone-id').value = task.milestoneId;
    document.getElementById('edit-task-title').value = task.title || '';
    document.getElementById('edit-task-description').value = task.description || '';
    
    // Populate selects
    populateProjectSelect('edit-task-project');
    document.getElementById('edit-task-project').value = task.projectId;
    populateFunctionalRequirementSelect('edit-task-functional-requirement', task.projectId, task.linkedFunctionalRequirement || '');
    
    updateAllSelects(); // Populate effort and resource selects
    setTimeout(() => {
      const statusSelect = document.getElementById('edit-task-status');
      const effortSelect = document.getElementById('edit-task-effort');
      const resourceSelect = document.getElementById('edit-task-resource');
      
      if (statusSelect) statusSelect.value = task.status || '';
      if (effortSelect) effortSelect.value = task.effortLevel || '';
      if (resourceSelect) resourceSelect.value = task.assignedResource || '';
      
      // Set due date
      const editDueDateInput = document.getElementById('edit-task-due-date');
      if (editDueDateInput && task.dueDate) {
        const dueDateValue = new Date(task.dueDate).toISOString().split('T')[0];
        editDueDateInput.value = dueDateValue;
      }
      
      // Initialize date picker for edit task form
      if (editDueDateInput && !editDueDateInput.flatpickr) {
        const fp = flatpickr(editDueDateInput, {
          dateFormat: 'Y-m-d',
          clickOpens: true,
          allowInput: false,
        });
        editDueDateInput.addEventListener('focus', () => {
          fp.open();
        });
      } else if (editDueDateInput && editDueDateInput.flatpickr && task.dueDate) {
        editDueDateInput.flatpickr.setDate(task.dueDate);
      }
    }, 150);
    
    // Show modal
    editTaskForm.style.display = 'block';
  };

  // Function to open edit milestone modal and populate it
  window.openEditMilestoneModal = function(milestone) {
    const editMilestoneForm = document.getElementById('edit-milestone-form');
    if (!editMilestoneForm) return;

    // Populate form fields
    document.getElementById('edit-milestone-id').value = milestone.id;
    document.getElementById('edit-milestone-project-id').value = milestone.projectId;
    document.getElementById('edit-milestone-title').value = milestone.title || '';
    document.getElementById('edit-milestone-description').value = milestone.description || '';
    
    // Populate project select
    populateProjectSelect('edit-milestone-project');
    document.getElementById('edit-milestone-project').value = milestone.projectId;
    
    // Set target date and initialize date picker
    const targetDateInput = document.getElementById('edit-milestone-target-date');
    if (targetDateInput) {
      // Destroy existing flatpickr instance if it exists
      if (targetDateInput.flatpickr && typeof targetDateInput.flatpickr.destroy === 'function') {
        targetDateInput.flatpickr.destroy();
      }
      
      // Set the date value if it exists
      if (milestone.targetDate) {
        const targetDateValue = new Date(milestone.targetDate).toISOString().split('T')[0];
        targetDateInput.value = targetDateValue;
      } else {
        targetDateInput.value = '';
      }
      
      // Initialize date picker - same as add new form
      setTimeout(() => {
        // Make sure we don't have a stale instance
        if (targetDateInput.flatpickr && typeof targetDateInput.flatpickr.destroy === 'function') {
          targetDateInput.flatpickr.destroy();
        }
        
        window.editMilestoneTargetDatePicker = flatpickr(targetDateInput, {
          dateFormat: 'Y-m-d',
          clickOpens: true,
          allowInput: false,
        });
        // Ensure calendar opens on focus
        targetDateInput.addEventListener('focus', () => {
          if (window.editMilestoneTargetDatePicker) {
            window.editMilestoneTargetDatePicker.open();
          }
        });
        // Also open on click
        targetDateInput.addEventListener('click', () => {
          if (window.editMilestoneTargetDatePicker) {
            window.editMilestoneTargetDatePicker.open();
          }
        });
      }, 100);
    }
    
    // Show form
    editMilestoneForm.style.display = 'block';
  };

  // Function to open edit requirement modal and populate it
  window.openEditRequirementModal = function(requirement) {
    const editRequirementForm = document.getElementById('edit-requirement-form');
    if (!editRequirementForm) return;

    // Populate form fields
    document.getElementById('edit-requirement-id').value = requirement.id;
    document.getElementById('edit-requirement-project-id').value = requirement.projectId;
    document.getElementById('edit-requirement-title').value = requirement.title || '';
    document.getElementById('edit-requirement-description').value = requirement.description || '';
    
    // Populate project select
    populateProjectSelect('edit-requirement-project');
    document.getElementById('edit-requirement-project').value = requirement.projectId;
    
    // Populate milestone select
    populateMilestoneSelect('edit-requirement-milestone', requirement.projectId);
    setTimeout(() => {
      if (requirement.milestoneId) {
        document.getElementById('edit-requirement-milestone').value = requirement.milestoneId;
      }
    }, 100);
    
    // Populate priority select
    updateAllSelects();
    setTimeout(() => {
      const prioritySelect = document.getElementById('edit-requirement-priority');
      if (prioritySelect) prioritySelect.value = requirement.priority || '';
    }, 150);
    
    // Show form
    editRequirementForm.style.display = 'block';
  };

  // Function to open edit functional requirement modal and populate it
  window.openEditFunctionalRequirementModal = function(functionalRequirement) {
    const editFunctionalRequirementForm = document.getElementById('edit-functional-requirement-form');
    if (!editFunctionalRequirementForm) return;

    // Populate form fields
    document.getElementById('edit-functional-requirement-id').value = functionalRequirement.id;
    document.getElementById('edit-functional-requirement-project-id').value = functionalRequirement.projectId;
    document.getElementById('edit-functional-requirement-tracking-id').value = functionalRequirement.trackingId || '';
    document.getElementById('edit-functional-requirement-title').value = functionalRequirement.title || '';
    document.getElementById('edit-functional-requirement-description').value = functionalRequirement.description || '';
    
    // Populate project select
    populateProjectSelect('edit-functional-requirement-project');
    document.getElementById('edit-functional-requirement-project').value = functionalRequirement.projectId;
    
    // Populate user requirements select
    populateUserRequirementsSelect('edit-functional-requirement-linked-user-requirements', functionalRequirement.projectId);
    setTimeout(() => {
      const userReqsSelect = document.getElementById('edit-functional-requirement-linked-user-requirements');
      if (userReqsSelect) {
        const selectedUserReqs = functionalRequirement.linkedUserRequirements || [];
        selectedUserReqs.forEach(urId => {
          const option = userReqsSelect.querySelector(`option[value="${urId}"]`);
          if (option) option.selected = true;
        });
      }
    }, 100);
    
    // Handle project change to update user requirements
    document.getElementById('edit-functional-requirement-project')?.addEventListener('change', (e) => {
      populateUserRequirementsSelect('edit-functional-requirement-linked-user-requirements', e.target.value);
    });
    
    // Show form
    editFunctionalRequirementForm.style.display = 'block';
  };

  editTaskForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const taskIdInput = document.getElementById('edit-task-id');
    const projectIdInput = document.getElementById('edit-task-project-id');
    const milestoneIdInput = document.getElementById('edit-task-milestone-id');
    const titleInput = document.getElementById('edit-task-title');
    const descriptionInput = document.getElementById('edit-task-description');
    const statusSelect = document.getElementById('edit-task-status');
    const effortSelect = document.getElementById('edit-task-effort');
    const resourceSelect = document.getElementById('edit-task-resource');
    const editDueDateInput = document.getElementById('edit-task-due-date');
    const functionalReqSelect = document.getElementById('edit-task-functional-requirement');
    
    const taskId = taskIdInput ? taskIdInput.value : '';
    const projectId = projectIdInput ? projectIdInput.value : '';
    const originalMilestoneId = milestoneIdInput ? milestoneIdInput.value : '';
    const title = titleInput ? titleInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const status = statusSelect ? statusSelect.value : '';
    const effort = effortSelect ? effortSelect.value : '';
    const resource = resourceSelect ? resourceSelect.value : '';
    const linkedFunctionalRequirement = functionalReqSelect ? functionalReqSelect.value : '';
    let dueDate = '';
    if (editDueDateInput) {
      if (editDueDateInput.flatpickr && editDueDateInput.flatpickr.input) {
        dueDate = editDueDateInput.flatpickr.input.value;
      } else {
        dueDate = editDueDateInput.value || '';
      }
    }
    
    let milestoneId = '';
    if (linkedFunctionalRequirement) {
      milestoneId = getMilestoneIdFromFunctionalRequirement(projectId, linkedFunctionalRequirement);
    }
    if (!milestoneId) {
      milestoneId = originalMilestoneId;
    }
    
    if (!title || !projectId || !milestoneId) return;
    
    try {
      storage.updateTask(projectId, milestoneId, taskId, {
        title,
        description: description || undefined,
        status,
        effortLevel: effort || undefined,
        assignedResource: resource || undefined,
        dueDate: dueDate || undefined,
        linkedFunctionalRequirement: linkedFunctionalRequirement || undefined,
      });
      editTaskForm.style.display = 'none';
      renderTasks();
      renderFunctionalRequirements();
      renderRequirements();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task');
    }
  });

  document.getElementById('edit-task-project')?.addEventListener('change', (e) => {
    if (e && e.target && e.target.value !== undefined) {
      populateFunctionalRequirementSelect('edit-task-functional-requirement', e.target.value);
    }
  });

  // Edit Milestone Form handlers
  const editMilestoneForm = document.getElementById('edit-milestone-form');
  const cancelEditMilestoneBtn = document.getElementById('cancel-edit-milestone-btn');
  
  cancelEditMilestoneBtn?.addEventListener('click', () => {
    if (editMilestoneForm) editMilestoneForm.style.display = 'none';
    // Clear date picker if it exists
    const targetDateInput = document.getElementById('edit-milestone-target-date');
    if (targetDateInput && targetDateInput.flatpickr) {
      targetDateInput.flatpickr.clear();
    }
  });

  editMilestoneForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const milestoneIdInput = document.getElementById('edit-milestone-id');
    const projectIdInput = document.getElementById('edit-milestone-project-id');
    const titleInput = document.getElementById('edit-milestone-title');
    const descriptionInput = document.getElementById('edit-milestone-description');
    const projectSelect = document.getElementById('edit-milestone-project');
    const targetDateInput = document.getElementById('edit-milestone-target-date');
    
    const milestoneId = milestoneIdInput ? milestoneIdInput.value : '';
    const projectId = projectIdInput ? projectIdInput.value : '';
    const title = titleInput ? titleInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const newProjectId = projectSelect ? projectSelect.value : projectId;
    let targetDate = '';
    if (targetDateInput) {
      if (targetDateInput.flatpickr) {
        // Get value from flatpickr instance - same as add new form
        const selectedDates = targetDateInput.flatpickr.selectedDates;
        if (selectedDates && selectedDates.length > 0) {
          targetDate = targetDateInput.flatpickr.formatDate(selectedDates[0], 'Y-m-d');
        } else if (targetDateInput.flatpickr.input && targetDateInput.flatpickr.input.value) {
          targetDate = targetDateInput.flatpickr.input.value;
        } else {
          targetDate = targetDateInput.value;
        }
      } else {
        targetDate = targetDateInput.value || '';
      }
    }
    
    if (!title || !newProjectId || !milestoneId) return;
    
    try {
      storage.updateMilestone(newProjectId, milestoneId, {
        title,
        description: description || undefined,
        targetDate: targetDate || undefined
      });
      if (editMilestoneForm) editMilestoneForm.style.display = 'none';
      renderMilestones();
      renderProjects();
    } catch (error) {
      console.error('Failed to update milestone:', error);
      alert('Failed to update milestone');
    }
  });

  // Edit Requirement Form handlers
  const editRequirementForm = document.getElementById('edit-requirement-form');
  const cancelEditRequirementBtn = document.getElementById('cancel-edit-requirement-btn');
  
  cancelEditRequirementBtn?.addEventListener('click', () => {
    if (editRequirementForm) editRequirementForm.style.display = 'none';
  });

  editRequirementForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const requirementIdInput = document.getElementById('edit-requirement-id');
    const projectIdInput = document.getElementById('edit-requirement-project-id');
    const titleInput = document.getElementById('edit-requirement-title');
    const descriptionInput = document.getElementById('edit-requirement-description');
    const projectSelect = document.getElementById('edit-requirement-project');
    const milestoneSelect = document.getElementById('edit-requirement-milestone');
    const prioritySelect = document.getElementById('edit-requirement-priority');
    
    const requirementId = requirementIdInput ? requirementIdInput.value : '';
    const projectId = projectIdInput ? projectIdInput.value : '';
    const title = titleInput ? titleInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const newProjectId = projectSelect ? projectSelect.value : projectId;
    const milestoneId = milestoneSelect ? milestoneSelect.value : '';
    const priority = prioritySelect ? prioritySelect.value : '';
    
    if (!title || !newProjectId || !requirementId) return;
    
    try {
      storage.updateRequirement(newProjectId, requirementId, {
        title,
        description: description || undefined,
        priority: priority || undefined,
        milestoneId: milestoneId || undefined
      });
      if (editRequirementForm) editRequirementForm.style.display = 'none';
      renderRequirements();
      renderProjects();
    } catch (error) {
      console.error('Failed to update requirement:', error);
      alert('Failed to update requirement');
    }
  });

  document.getElementById('edit-requirement-project')?.addEventListener('change', (e) => {
    if (e && e.target && e.target.value !== undefined) {
      populateMilestoneSelect('edit-requirement-milestone', e.target.value);
    }
  });

  // Edit Functional Requirement Form handlers
  const editFunctionalRequirementForm = document.getElementById('edit-functional-requirement-form');
  const cancelEditFunctionalRequirementBtn = document.getElementById('cancel-edit-functional-requirement-btn');
  
  cancelEditFunctionalRequirementBtn?.addEventListener('click', () => {
    if (editFunctionalRequirementForm) editFunctionalRequirementForm.style.display = 'none';
  });

  editFunctionalRequirementForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const functionalRequirementIdInput = document.getElementById('edit-functional-requirement-id');
    const projectIdInput = document.getElementById('edit-functional-requirement-project-id');
    const trackingIdInput = document.getElementById('edit-functional-requirement-tracking-id');
    const titleInput = document.getElementById('edit-functional-requirement-title');
    const descriptionInput = document.getElementById('edit-functional-requirement-description');
    const projectSelect = document.getElementById('edit-functional-requirement-project');
    const userReqsSelect = document.getElementById('edit-functional-requirement-linked-user-requirements');
    
    const functionalRequirementId = functionalRequirementIdInput ? functionalRequirementIdInput.value : '';
    const projectId = projectIdInput ? projectIdInput.value : '';
    const trackingId = trackingIdInput ? trackingIdInput.value.trim() : '';
    const title = titleInput ? titleInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const newProjectId = projectSelect ? projectSelect.value : projectId;
    const linkedUserRequirements = userReqsSelect ? Array.from(userReqsSelect.selectedOptions).map(opt => opt.value) : [];
    
    if (!title || !newProjectId || !functionalRequirementId) return;
    
    try {
      storage.updateFunctionalRequirement(newProjectId, functionalRequirementId, {
        trackingId: trackingId || undefined,
        title,
        description: description || undefined,
        linkedUserRequirements: linkedUserRequirements || []
      });
      if (editFunctionalRequirementForm) editFunctionalRequirementForm.style.display = 'none';
      renderFunctionalRequirements();
      renderRequirements();
      renderProjects();
    } catch (error) {
      console.error('Failed to update functional requirement:', error);
      alert('Failed to update functional requirement');
    }
  });

  document.getElementById('edit-functional-requirement-project')?.addEventListener('change', (e) => {
    if (e && e.target && e.target.value !== undefined) {
      populateUserRequirementsSelect('edit-functional-requirement-linked-user-requirements', e.target.value);
    }
  });

  // Use the newTaskForm variable declared earlier
  if (newTaskForm) {
    newTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const projectSelect = document.getElementById('task-project');
      const titleInput = document.getElementById('task-title');
      const descriptionInput = document.getElementById('task-description');
      const effortSelect = document.getElementById('task-effort');
      const resourceSelect = document.getElementById('task-resource');
      const dueDateInput = document.getElementById('task-due-date');
      const functionalReqSelect = document.getElementById('task-functional-requirement');
      
      const projectId = projectSelect ? projectSelect.value : '';
      const title = titleInput ? titleInput.value.trim() : '';
      const description = descriptionInput ? descriptionInput.value.trim() : '';
      const effort = effortSelect ? effortSelect.value : '';
      const resource = resourceSelect ? resourceSelect.value : '';
      const linkedFunctionalRequirement = functionalReqSelect ? functionalReqSelect.value : '';
      let dueDate = '';
      if (dueDateInput) {
        if (dueDateInput.flatpickr && dueDateInput.flatpickr.input) {
          dueDate = dueDateInput.flatpickr.input.value;
        } else {
          dueDate = dueDateInput.value || '';
        }
      }
      
      // Validate required fields and show user feedback
      if (!title) {
        alert('Please enter a task title');
        if (titleInput) titleInput.focus();
        return;
      }
      if (!projectId) {
        alert('Please select a project');
        if (projectSelect) projectSelect.focus();
        return;
      }
      if (!linkedFunctionalRequirement) {
        alert('Please select a functional requirement to determine the milestone');
        if (functionalReqSelect) functionalReqSelect.focus();
        return;
      }
      const milestoneId = getMilestoneIdFromFunctionalRequirement(projectId, linkedFunctionalRequirement);
      if (!milestoneId) {
        alert('The selected functional requirement is not linked to any milestone');
        if (functionalReqSelect) functionalReqSelect.focus();
        return;
      }
      
      try {
        storage.createTask(projectId, milestoneId, {
          title,
          description: description || undefined,
          effortLevel: effort || undefined,
          assignedResource: resource || undefined,
          dueDate: dueDate || undefined,
          linkedFunctionalRequirement: linkedFunctionalRequirement || undefined,
        });
        // Reset form fields using cached references
        if (titleInput) titleInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        if (effortSelect) effortSelect.value = '';
        if (resourceSelect) resourceSelect.value = '';
        // Reset project and functional requirement selects
        if (projectSelect) {
          projectSelect.value = '';
        }
        if (functionalReqSelect) {
          functionalReqSelect.innerHTML = '<option value="">Select a project first</option>';
          functionalReqSelect.value = '';
        }
        // Clear due date
        if (window.taskDueDatePicker) {
          window.taskDueDatePicker.clear();
        }
        newTaskForm.style.display = 'none';
        const taskBtn = document.getElementById('new-task-btn');
        if (taskBtn) taskBtn.style.display = 'block';
        renderTasks();
        renderFunctionalRequirements();
        renderRequirements();
      } catch (error) {
        console.error('Failed to create task:', error);
        alert('Failed to create task: ' + (error.message || 'Unknown error'));
      }
    });
  } else {
    console.error('new-task-form element not found');
  }

  // Settings event listeners
  setupSettingsEventListeners();
  
  // Task search and filter listeners
  setupTaskSearchAndFilterListeners();
  
  // Milestone search and filter listeners
  setupMilestoneSearchAndFilterListeners();
  
  // User requirement search and filter listeners
  setupRequirementSearchAndFilterListeners();
  
  // Functional requirement search and filter listeners
  setupFunctionalRequirementSearchAndFilterListeners();
}

function setupTaskSearchAndFilterListeners() {
  const searchInput = document.getElementById('task-search');
  const statusFilter = document.getElementById('task-filter-status');
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
  
  projectFilter?.addEventListener('change', (e) => {
    state.taskFilterProject = e.target.value;
    renderTasks();
  });
  
  resourceFilter?.addEventListener('change', (e) => {
    state.taskFilterResource = e.target.value;
    renderTasks();
  });
}

function setupMilestoneSearchAndFilterListeners() {
  const searchInput = document.getElementById('milestone-search');
  const projectFilter = document.getElementById('milestone-filter-project');
  
  searchInput?.addEventListener('input', (e) => {
    state.milestoneSearch = e.target.value;
    renderMilestones();
  });
  
  projectFilter?.addEventListener('change', (e) => {
    state.milestoneFilterProject = e.target.value;
    renderMilestones();
  });
}

function setupRequirementSearchAndFilterListeners() {
  const searchInput = document.getElementById('requirement-search');
  const projectFilter = document.getElementById('requirement-filter-project');
  const priorityFilter = document.getElementById('requirement-filter-priority');
  
  searchInput?.addEventListener('input', (e) => {
    state.requirementSearch = e.target.value;
    renderRequirements();
  });
  
  projectFilter?.addEventListener('change', (e) => {
    if (isUpdatingRequirementProjectFilter) return;
    state.requirementFilterProject = e.target.value;
    renderRequirements();
  });
  
  priorityFilter?.addEventListener('change', (e) => {
    if (isUpdatingRequirementPriorityFilter) return;
    state.requirementFilterPriority = e.target.value;
    renderRequirements();
  });
}

function setupFunctionalRequirementSearchAndFilterListeners() {
  const searchInput = document.getElementById('functional-requirement-search');
  const projectFilter = document.getElementById('functional-requirement-filter-project');
  
  searchInput?.addEventListener('input', (e) => {
    state.functionalRequirementSearch = e.target.value;
    renderFunctionalRequirements();
  });
  
  projectFilter?.addEventListener('change', (e) => {
    if (isUpdatingFunctionalRequirementProjectFilter) return;
    state.functionalRequirementFilterProject = e.target.value;
    renderFunctionalRequirements();
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
  const isEditing = state.editingProjects.has(project.id);
  
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
        ${project.milestones.map(m => renderMilestoneProgressBar(m)).join('')}
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
          <button class="btn btn-blue btn-sm edit-project" data-project-id="${project.id}">Edit</button>
          <button class="btn btn-red btn-sm delete-project" data-project-id="${project.id}">Delete</button>
        </div>
      </div>
      ${milestoneProgressHtml}
    </div>
  `;
}

function renderMilestoneCard(milestone, projectId) {
  const isEditing = state.editingMilestones.has(milestone.id);
  
  const completedTasks = milestone.tasks.filter(t => t.status === 'completed').length;
  const totalTasks = milestone.tasks.length;
  
  if (isEditing) {
    const targetDateValue = milestone.targetDate ? new Date(milestone.targetDate).toISOString().split('T')[0] : '';
    return `
      <div class="milestone-card" data-milestone-id="${milestone.id}" data-project-id="${projectId}">
        <input type="text" class="edit-title" value="${escapeHtml(milestone.title)}" data-milestone-id="${milestone.id}">
        <textarea class="edit-description" data-milestone-id="${milestone.id}">${escapeHtml(milestone.description || '')}</textarea>
        <input type="text" class="edit-target-date" value="${targetDateValue}" data-milestone-id="${milestone.id}" placeholder="Select target date">
        <div class="form-actions">
          <button class="btn btn-primary btn-sm save-milestone" data-milestone-id="${milestone.id}" data-project-id="${projectId}">Save</button>
          <button class="btn btn-secondary btn-sm cancel-edit-milestone" data-milestone-id="${milestone.id}">Cancel</button>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="milestone-card" data-milestone-id="${milestone.id}" data-project-id="${projectId}">
      <div class="project-card-header">
        <div class="project-card-content">
          <h3>${escapeHtml(milestone.title)}</h3>
          ${milestone.description ? `<p>${escapeHtml(milestone.description)}</p>` : ''}
          ${milestone.targetDate ? `<p class="text-xs text-muted">Target Date: ${new Date(milestone.targetDate).toLocaleDateString()}</p>` : ''}
          ${milestone.dueDate ? `<p class="text-xs text-muted">Due: ${new Date(milestone.dueDate).toLocaleDateString()}</p>` : ''}
          <p class="text-xs text-muted">${completedTasks}/${totalTasks} tasks completed</p>
        </div>
        <div class="project-card-actions">
          <button class="btn btn-blue btn-xs edit-milestone" data-milestone-id="${milestone.id}" data-project-id="${projectId}">Edit</button>
          <button class="btn btn-red btn-xs delete-milestone" data-milestone-id="${milestone.id}" data-project-id="${projectId}">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function renderTaskCard(task, projectId, milestoneId) {
  const isEditing = state.editingTasks.has(task.id);
  const isCompleted = task.status === 'completed';
  
  if (isEditing) {
    const statuses = storage.getStatuses();
    const effortLevels = storage.getEffortLevels();
    const users = storage.getUsers();
    
    const statusOptions = statuses.map(s => 
      `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
    ).join('');
    
    const effortOptions = effortLevels.map(e => 
      `<option value="${e.id}" ${task.effortLevel === e.id ? 'selected' : ''}>${escapeHtml(e.label)}</option>`
    ).join('');
    
    const userOptions = users.map(u => 
      `<option value="${u.name}" ${task.assignedResource === u.name ? 'selected' : ''}>${escapeHtml(u.name)}</option>`
    ).join('');
    
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
        <div class="form-actions">
          <button class="btn btn-primary btn-sm save-task" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Save</button>
          <button class="btn btn-secondary btn-sm cancel-edit-task" data-task-id="${task.id}">Cancel</button>
        </div>
      </div>
    `;
  }
  
  const statuses = storage.getStatuses();
  const status = statuses.find(s => s.id === task.status);
  const statusColorStyle = status?.color ? getStatusSelectStyle(status.color) : '';
  
  const statusOptions = statuses.map(s => 
    `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');
  
  return `
    <div class="task-card ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
      <div class="project-card-header">
        <div class="project-card-content" style="flex: 1; min-width: 0;">
          <select class="task-status-select" style="${statusColorStyle}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
            ${statusOptions}
          </select>
          <h4>${escapeHtml(task.title)}</h4>
          ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
          <div class="task-meta">
            ${(() => {
              const effortLevels = storage.getEffortLevels();
              const effort = effortLevels.find(e => e.id === task.effortLevel);
              const effortBadgeStyle = effort?.color ? getBadgeStyle(effort.color) : '';
              return effort ? `<span class="badge" style="${effortBadgeStyle}">Effort: ${escapeHtml(effort.label)}</span>` : '';
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
      <div class="form-actions">
        <button type="submit" class="btn btn-green btn-sm">Add Task</button>
        <button type="button" class="btn btn-secondary btn-sm cancel-add-task" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Cancel</button>
      </div>
    </form>
  `;
}

function renderMilestones() {
  if (!elements.milestonesList) return;
  
  const allMilestones = storage.getAllMilestones();
  
  // Apply filters
  const filteredMilestones = filterMilestones(allMilestones);
  
  // Apply sorting
  const sortedMilestones = sortMilestones(filteredMilestones);
  
  if (sortedMilestones.length === 0) {
    elements.milestonesList.innerHTML = `
      <div class="empty-state">
        <p>No milestones found</p>
        <p class="empty-state-sub">${allMilestones.length === 0 ? 'Create your first milestone to get started!' : 'Try adjusting your search or filters.'}</p>
      </div>
    `;
    return;
  }
  
  // Render table
  elements.milestonesList.innerHTML = renderMilestonesTable(sortedMilestones);
  
  // Attach event listeners for milestones in the view
  sortedMilestones.forEach(milestone => {
    attachMilestoneViewListeners(milestone);
  });
  
  // Populate filter dropdowns if not already populated
  populateMilestoneFilters();
  
  // Attach sort listeners
  attachMilestoneSortListeners();
}

function sortMilestones(milestones) {
  if (!state.milestoneSortColumn) return milestones;
  
  const sorted = [...milestones].sort((a, b) => {
    let aVal, bVal;
    
    switch (state.milestoneSortColumn) {
      case 'title':
        aVal = a.title || '';
        bVal = b.title || '';
        break;
      case 'project':
        aVal = a.project?.title || '';
        bVal = b.project?.title || '';
        break;
      case 'targetDate':
        aVal = a.targetDate ? new Date(a.targetDate).getTime() : 0;
        bVal = b.targetDate ? new Date(b.targetDate).getTime() : 0;
        break;
      case 'progress':
        const aCompleted = a.tasks ? a.tasks.filter(t => t.status === 'completed').length : 0;
        const aTotal = a.tasks ? a.tasks.length : 0;
        const bCompleted = b.tasks ? b.tasks.filter(t => t.status === 'completed').length : 0;
        const bTotal = b.tasks ? b.tasks.length : 0;
        aVal = aTotal > 0 ? aCompleted / aTotal : 0;
        bVal = bTotal > 0 ? bCompleted / bTotal : 0;
        break;
      default:
        return 0;
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return state.milestoneSortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return state.milestoneSortDirection === 'asc' 
        ? aVal - bVal
        : bVal - aVal;
    }
  });
  
  return sorted;
}

function filterMilestones(milestones) {
  return milestones.filter(milestone => {
    // Search filter
    if (state.milestoneSearch) {
      const searchLower = state.milestoneSearch.toLowerCase();
      const matchesSearch = 
        milestone.title.toLowerCase().includes(searchLower) ||
        (milestone.description && milestone.description.toLowerCase().includes(searchLower)) ||
        (milestone.project && milestone.project.title.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    
    // Project filter
    if (state.milestoneFilterProject && milestone.projectId !== state.milestoneFilterProject) {
      return false;
    }
    
    return true;
  });
}

function renderMilestonesTable(milestones) {
  const rows = milestones.map(m => {
    const completedTasks = m.tasks ? m.tasks.filter(t => t.status === 'completed').length : 0;
    const totalTasks = m.tasks ? m.tasks.length : 0;
    const progressBarHtml = renderMilestoneProgressBar(m, false);
    
    return `
      <tr class="task-table-row" data-milestone-id="${m.id}" data-project-id="${m.projectId}">
        <td class="task-title-cell">
          <strong>${escapeHtml(m.title)}</strong>
          ${m.description ? `<div class="task-description-small">${escapeHtml(m.description)}</div>` : ''}
        </td>
        <td class="task-project-cell">${escapeHtml(m.project.title)}</td>
        <td>${m.targetDate ? new Date(m.targetDate).toLocaleDateString() : '<span class="text-muted">—</span>'}</td>
        <td>${completedTasks}/${totalTasks}</td>
        <td>
          <div class="milestone-progress">
            ${progressBarHtml}
          </div>
        </td>
        <td class="task-actions-cell">
          <button class="btn btn-blue btn-xs edit-milestone-view" data-milestone-id="${m.id}" data-project-id="${m.projectId}">Edit</button>
          <button class="btn btn-red btn-xs delete-milestone-view" data-milestone-id="${m.id}" data-project-id="${m.projectId}">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
  
  const getSortIndicator = (column) => {
    if (state.milestoneSortColumn !== column) return '';
    return state.milestoneSortDirection === 'asc' ? ' ↑' : ' ↓';
  };
  
  const getSortClass = (column) => {
    return state.milestoneSortColumn === column ? 'sortable-header sorted' : 'sortable-header';
  };
  
  return `
    <table class="tasks-table">
      <thead>
        <tr>
          <th class="${getSortClass('title')}" data-sort-column="title">Milestone${getSortIndicator('title')}</th>
          <th class="${getSortClass('project')}" data-sort-column="project">Project${getSortIndicator('project')}</th>
          <th class="${getSortClass('targetDate')}" data-sort-column="targetDate">Target Date${getSortIndicator('targetDate')}</th>
          <th class="${getSortClass('progress')}" data-sort-column="progress">Progress${getSortIndicator('progress')}</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function attachMilestoneSortListeners() {
  const headers = document.querySelectorAll('#milestones-list .sortable-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const column = header.getAttribute('data-sort-column');
      if (state.milestoneSortColumn === column) {
        state.milestoneSortDirection = state.milestoneSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.milestoneSortColumn = column;
        state.milestoneSortDirection = 'asc';
      }
      renderMilestones();
    });
  });
}

function renderRequirements() {
  if (!elements.requirementsList) return;
  
  const allRequirements = storage.getAllRequirements();
  
  // Apply filters
  const filteredRequirements = filterRequirements(allRequirements);
  
  // Apply sorting
  const sortedRequirements = sortRequirements(filteredRequirements);
  
  if (sortedRequirements.length === 0) {
    elements.requirementsList.innerHTML = `
      <div class="empty-state">
        <p>No user requirements found</p>
        <p class="empty-state-sub">${allRequirements.length === 0 ? 'Create your first user requirement to get started!' : 'Try adjusting your search or filters.'}</p>
      </div>
    `;
    return;
  }
  
  // Render table
  elements.requirementsList.innerHTML = renderRequirementsTable(sortedRequirements);
  
  // Attach event listeners for requirements in the view
  sortedRequirements.forEach(requirement => {
    attachRequirementViewListeners(requirement);
  });
  
  // Populate filter dropdowns if not already populated
  populateRequirementFilters();
  
  // Attach sort listeners
  attachRequirementSortListeners();
}

function populateRequirementFilters() {
  const priorities = storage.getPriorities();
  const projects = storage.getAllProjects();
  
  // Populate priority filter
  const priorityFilter = document.getElementById('requirement-filter-priority');
  if (priorityFilter) {
    const selectedValue = state.requirementFilterPriority || priorityFilter.value || '';
    isUpdatingRequirementPriorityFilter = true;
    try {
      // Clear existing options except the first one
      while (priorityFilter.options.length > 1) {
        priorityFilter.remove(1);
      }
      priorities.forEach(priority => {
        const option = document.createElement('option');
        option.value = priority.id;
        option.textContent = priority.label;
        priorityFilter.appendChild(option);
      });
      priorityFilter.value = selectedValue;
    } finally {
      isUpdatingRequirementPriorityFilter = false;
    }
  }
  
  // Populate project filter
  const projectFilter = document.getElementById('requirement-filter-project');
  if (projectFilter) {
    const selectedValue = state.requirementFilterProject || projectFilter.value || '';
    isUpdatingRequirementProjectFilter = true;
    try {
      // Clear existing options except the first one
      while (projectFilter.options.length > 1) {
        projectFilter.remove(1);
      }
      projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.title;
        projectFilter.appendChild(option);
      });
      projectFilter.value = selectedValue;
    } finally {
      isUpdatingRequirementProjectFilter = false;
    }
  }
}

function populateMilestoneFilters() {
  const projects = storage.getAllProjects();
  
  // Populate project filter
  const projectFilter = document.getElementById('milestone-filter-project');
  if (projectFilter) {
    // Clear existing options except the first one
    while (projectFilter.options.length > 1) {
      projectFilter.remove(1);
    }
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.title;
      projectFilter.appendChild(option);
    });
  }
}

function populateFunctionalRequirementFilters() {
  const projects = storage.getAllProjects();
  
  // Populate project filter
  const projectFilter = document.getElementById('functional-requirement-filter-project');
  if (projectFilter) {
    const selectedValue = state.functionalRequirementFilterProject || projectFilter.value || '';
    isUpdatingFunctionalRequirementProjectFilter = true;
    try {
      // Clear existing options except the first one
      while (projectFilter.options.length > 1) {
        projectFilter.remove(1);
      }
      projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.title;
        projectFilter.appendChild(option);
      });
      projectFilter.value = selectedValue;
    } finally {
      isUpdatingFunctionalRequirementProjectFilter = false;
    }
  }
}

function sortRequirements(requirements) {
  if (!state.requirementSortColumn) return requirements;
  
  const sorted = [...requirements].sort((a, b) => {
    let aVal, bVal;
    
    switch (state.requirementSortColumn) {
      case 'title':
        aVal = a.title || '';
        bVal = b.title || '';
        break;
      case 'project':
        aVal = a.project?.title || '';
        bVal = b.project?.title || '';
        break;
      case 'milestone':
        const aProject = state.projects.find(p => p.id === a.projectId);
        const bProject = state.projects.find(p => p.id === b.projectId);
        const aMilestone = aProject && a.milestoneId ? aProject.milestones.find(m => m.id === a.milestoneId) : null;
        const bMilestone = bProject && b.milestoneId ? bProject.milestones.find(m => m.id === b.milestoneId) : null;
        aVal = aMilestone?.title || '';
        bVal = bMilestone?.title || '';
        break;
      case 'priority': {
        const priorities = storage.getPriorities();
        const aPriorityLabel = priorities.find(p => p.id === a.priority)?.label || '';
        const bPriorityLabel = priorities.find(p => p.id === b.priority)?.label || '';
        aVal = aPriorityLabel;
        bVal = bPriorityLabel;
        break;
      }
      case 'linkedFRs':
        const allFRs = storage.getAllFunctionalRequirements();
        const aLinkedFRs = allFRs.filter(fr => (fr.linkedUserRequirements || []).includes(a.id));
        const bLinkedFRs = allFRs.filter(fr => (fr.linkedUserRequirements || []).includes(b.id));
        aVal = aLinkedFRs.length;
        bVal = bLinkedFRs.length;
        break;
      case 'linkedTasks':
        const allFRs2 = storage.getAllFunctionalRequirements();
        const allTasks = storage.getAllTasks();
        const aLinkedFRs2 = allFRs2.filter(fr => (fr.linkedUserRequirements || []).includes(a.id));
        const bLinkedFRs2 = allFRs2.filter(fr => (fr.linkedUserRequirements || []).includes(b.id));
        const aLinkedTasks = allTasks.filter(t => aLinkedFRs2.some(fr => fr.id === t.linkedFunctionalRequirement));
        const bLinkedTasks = allTasks.filter(t => bLinkedFRs2.some(fr => fr.id === t.linkedFunctionalRequirement));
        aVal = aLinkedTasks.length;
        bVal = bLinkedTasks.length;
        break;
      default:
        return 0;
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return state.requirementSortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return state.requirementSortDirection === 'asc' 
        ? aVal - bVal
        : bVal - aVal;
    }
  });
  
  return sorted;
}

function filterRequirements(requirements) {
  return requirements.filter(requirement => {
    // Search filter
    if (state.requirementSearch) {
      const searchLower = state.requirementSearch.toLowerCase();
      const matchesSearch = 
        requirement.title.toLowerCase().includes(searchLower) ||
        (requirement.description && requirement.description.toLowerCase().includes(searchLower)) ||
        requirement.project.title.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    
    // Project filter
    if (state.requirementFilterProject && requirement.projectId !== state.requirementFilterProject) {
      return false;
    }
    
    // Priority filter
    if (state.requirementFilterPriority && requirement.priority !== state.requirementFilterPriority) {
      return false;
    }
    
    return true;
  });
}

function renderRequirementsTable(requirements) {
  const rows = requirements.map(r => {
    const priorities = storage.getPriorities();
    const priority = priorities.find(p => p.id === r.priority);
    const priorityBadgeStyle = priority?.color ? getBadgeStyle(priority.color) : '';
    const project = state.projects.find(p => p.id === r.projectId);
    const milestone = project && r.milestoneId ? project.milestones.find(m => m.id === r.milestoneId) : null;
    
    // Get all functional requirements linked to this user requirement
    const allFunctionalRequirements = storage.getAllFunctionalRequirements();
    const linkedFunctionalReqs = allFunctionalRequirements.filter(fr => 
      (fr.linkedUserRequirements || []).includes(r.id)
    );
    
    // Get all tasks linked to these functional requirements
    const allTasks = storage.getAllTasks();
    const linkedTasks = allTasks.filter(t => 
      linkedFunctionalReqs.some(fr => fr.id === t.linkedFunctionalRequirement)
    );
    
    // Calculate progress from linked tasks
    const progressBarHtml = renderUserRequirementProgressBar(r, linkedTasks, false);
    
    const rowHtml = `
      <tr class="task-table-row" data-requirement-id="${r.id}" data-project-id="${r.projectId}">
        <td class="task-title-cell">
          <strong>${escapeHtml(r.title)}</strong>
          ${r.description ? `<div class="task-description-small">${escapeHtml(r.description)}</div>` : ''}
        </td>
        <td class="task-project-cell">${escapeHtml(r.project.title)}</td>
        <td class="task-milestone-cell">${milestone ? escapeHtml(milestone.title) : '<span class="text-muted">—</span>'}</td>
        <td>${priority ? `<span class="badge" style="${priorityBadgeStyle}">${escapeHtml(priority.label)}</span>` : '<span class="text-muted">—</span>'}</td>
        <td>${linkedFunctionalReqs.length}</td>
        <td>${linkedTasks.length}</td>
        <td>
          <div class="milestone-progress">
            ${progressBarHtml}
          </div>
        </td>
        <td class="task-actions-cell">
          <button class="btn btn-green btn-xs link-functional-requirement" data-requirement-id="${r.id}" data-project-id="${r.projectId}">Link FRS</button>
          <button class="btn btn-blue btn-xs edit-requirement-view" data-requirement-id="${r.id}" data-project-id="${r.projectId}">Edit</button>
          <button class="btn btn-red btn-xs delete-requirement-view" data-requirement-id="${r.id}" data-project-id="${r.projectId}">Delete</button>
        </td>
      </tr>
    `;

    return rowHtml + renderFunctionalRequirementLinkRow(r);
  }).join('');
  
  const getSortIndicator = (column) => {
    if (state.requirementSortColumn !== column) return '';
    return state.requirementSortDirection === 'asc' ? ' ↑' : ' ↓';
  };
  
  const getSortClass = (column) => {
    return state.requirementSortColumn === column ? 'sortable-header sorted' : 'sortable-header';
  };
  
  return `
    <table class="tasks-table">
      <thead>
        <tr>
          <th class="${getSortClass('title')}" data-sort-column="title">Requirement${getSortIndicator('title')}</th>
          <th class="${getSortClass('project')}" data-sort-column="project">Project${getSortIndicator('project')}</th>
          <th class="${getSortClass('milestone')}" data-sort-column="milestone">Milestone${getSortIndicator('milestone')}</th>
          <th class="${getSortClass('priority')}" data-sort-column="priority">Priority${getSortIndicator('priority')}</th>
          <th class="${getSortClass('linkedFRs')}" data-sort-column="linkedFRs">Linked FRs${getSortIndicator('linkedFRs')}</th>
          <th class="${getSortClass('linkedTasks')}" data-sort-column="linkedTasks">Linked Tasks${getSortIndicator('linkedTasks')}</th>
          <th>Progress</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderFunctionalRequirementLinkRow(requirement) {
  if (state.activeRequirementLinkId !== requirement.id) {
    return '';
  }

  const project = storage.getProject(requirement.projectId);
  const functionalRequirements = project?.functionalRequirements || [];
  const existingOptions = functionalRequirements.map(fr => {
    const trackingLabel = fr.trackingId ? `${escapeHtml(fr.trackingId)} - ` : '';
    return `<option value="${fr.id}">${trackingLabel}${escapeHtml(fr.title)}</option>`;
  }).join('');
  const hasFunctionalRequirements = functionalRequirements.length > 0;
  const acceptanceCriteriaHtml = requirement.description ? `
    <div class="requirements-fr-link-criteria">
      <span class="requirements-fr-link-criteria-label">Acceptance Criteria</span>
      <p class="requirements-fr-link-criteria-text">${escapeHtml(requirement.description)}</p>
    </div>
  ` : `
    <div class="requirements-fr-link-criteria">
      <span class="requirements-fr-link-criteria-label">Acceptance Criteria</span>
      <p class="requirements-fr-link-criteria-text requirements-fr-link-criteria-empty">No acceptance criteria provided yet.</p>
    </div>
  `;
  const allFunctionalRequirements = storage.getAllFunctionalRequirements();
  const linkedFunctionalRequirements = allFunctionalRequirements.filter(fr => 
    (fr.linkedUserRequirements || []).includes(requirement.id)
  );
  const linkedFunctionalRequirementsList = linkedFunctionalRequirements.length > 0
    ? `<div class="requirements-linked-frs-list">
        ${linkedFunctionalRequirements.map(fr => {
          const trackingLabel = fr.trackingId ? `${escapeHtml(fr.trackingId)} - ` : '';
          return `
            <div class="requirements-linked-frs-item">
              <span class="requirements-linked-frs-name">${trackingLabel}${escapeHtml(fr.title)}</span>
              <button type="button" class="btn btn-gray btn-xs unlink-functional-requirement" data-requirement-id="${requirement.id}" data-functional-requirement-id="${fr.id}" title="Remove linked FRS">
                Remove
              </button>
            </div>
          `;
        }).join('')}
      </div>`
    : '<p class="requirements-fr-link-hint requirements-linked-frs-empty">No linked FRSs yet.</p>';
  const linkedFunctionalRequirementsHtml = `
    <div class="requirements-linked-frs">
      <p class="requirements-linked-frs-heading">Linked FRS</p>
      ${linkedFunctionalRequirementsList}
    </div>
  `;

  return `
    <tr class="functional-requirement-link-row" data-requirement-id="${requirement.id}">
      <td colspan="8">
        <div class="requirements-fr-link-panel">
          ${acceptanceCriteriaHtml}
          <div class="requirements-fr-link-grid">
            <div class="requirements-fr-link-section">
              <p class="requirements-fr-link-label">Link existing FRS</p>
              ${linkedFunctionalRequirementsHtml}
              <div class="form-group">
                <label for="existing-fr-select-${requirement.id}">FRS</label>
                <select id="existing-fr-select-${requirement.id}">
                  <option value="">Select a functional requirement</option>
                  ${existingOptions}
                </select>
              </div>
              <button type="button" class="btn btn-primary btn-xs link-existing-fr" data-requirement-id="${requirement.id}" ${hasFunctionalRequirements ? '' : 'disabled'}>
                Link existing FRS
              </button>
              ${!hasFunctionalRequirements ? '<p class="requirements-fr-link-hint">Create a functional requirement below to get started.</p>' : ''}
            </div>
            <div class="requirements-fr-link-section">
              <p class="requirements-fr-link-label">Create a new functional requirement</p>
              <div class="form-group">
                <label for="new-fr-tracking-${requirement.id}">Tracking ID (optional)</label>
                <input type="text" id="new-fr-tracking-${requirement.id}" placeholder="Tracking ID">
              </div>
              <div class="form-group">
                <label for="new-fr-title-${requirement.id}">Title *</label>
                <input type="text" id="new-fr-title-${requirement.id}" placeholder="Functional requirement title">
              </div>
              <div class="form-group">
                <label for="new-fr-description-${requirement.id}">Description (optional)</label>
                <textarea id="new-fr-description-${requirement.id}" rows="2" placeholder="Describe how this functional requirement fulfills the user requirement"></textarea>
              </div>
              <button type="button" class="btn btn-green btn-xs create-fr-and-link" data-requirement-id="${requirement.id}">
                Create & link new FR
              </button>
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-xs cancel-fr-link" data-requirement-id="${requirement.id}">
            Close
          </button>
        </div>
      </td>
    </tr>
  `;
}

function attachRequirementSortListeners() {
  const headers = document.querySelectorAll('#requirements-list .sortable-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const column = header.getAttribute('data-sort-column');
      if (state.requirementSortColumn === column) {
        state.requirementSortDirection = state.requirementSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.requirementSortColumn = column;
        state.requirementSortDirection = 'asc';
      }
      renderRequirements();
    });
  });
}

function renderFunctionalRequirements() {
  if (!elements.functionalRequirementsList) return;
  
  const allFunctionalRequirements = storage.getAllFunctionalRequirements();
  
  // Apply filters
  const filteredFunctionalRequirements = filterFunctionalRequirements(allFunctionalRequirements);
  
  // Apply sorting
  const sortedFunctionalRequirements = sortFunctionalRequirements(filteredFunctionalRequirements);
  
  if (sortedFunctionalRequirements.length === 0) {
    elements.functionalRequirementsList.innerHTML = `
      <div class="empty-state">
        <p>No functional requirements found</p>
        <p class="empty-state-sub">${allFunctionalRequirements.length === 0 ? 'Create your first functional requirement to get started!' : 'Try adjusting your search or filters.'}</p>
      </div>
    `;
    return;
  }
  
  // Render table
  elements.functionalRequirementsList.innerHTML = renderFunctionalRequirementsTable(sortedFunctionalRequirements);
  
  // Attach event listeners for functional requirements in the view
  sortedFunctionalRequirements.forEach(functionalRequirement => {
    attachFunctionalRequirementViewListeners(functionalRequirement);
  });
  
  // Populate filter dropdowns if not already populated
  populateFunctionalRequirementFilters();
  
  // Attach sort listeners
  attachFunctionalRequirementSortListeners();
}

function attachFunctionalRequirementSortListeners() {
  const headers = document.querySelectorAll('#functional-requirements-list .sortable-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const column = header.getAttribute('data-sort-column');
      if (state.functionalRequirementSortColumn === column) {
        state.functionalRequirementSortDirection = state.functionalRequirementSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.functionalRequirementSortColumn = column;
        state.functionalRequirementSortDirection = 'asc';
      }
      renderFunctionalRequirements();
    });
  });
}

function sortFunctionalRequirements(functionalRequirements) {
  if (!state.functionalRequirementSortColumn) return functionalRequirements;
  
  const sorted = [...functionalRequirements].sort((a, b) => {
    let aVal, bVal;
    
    switch (state.functionalRequirementSortColumn) {
      case 'trackingId':
        aVal = a.trackingId || '';
        bVal = b.trackingId || '';
        break;
      case 'title':
        aVal = a.title || '';
        bVal = b.title || '';
        break;
      case 'project':
        aVal = a.project?.title || '';
        bVal = b.project?.title || '';
        break;
      case 'linkedUserReqs':
        aVal = (a.linkedUserRequirements || []).length;
        bVal = (b.linkedUserRequirements || []).length;
        break;
      case 'linkedTasks':
        const allTasks = storage.getAllTasks();
        const aLinkedTasks = allTasks.filter(t => t.linkedFunctionalRequirement === a.id);
        const bLinkedTasks = allTasks.filter(t => t.linkedFunctionalRequirement === b.id);
        aVal = aLinkedTasks.length;
        bVal = bLinkedTasks.length;
        break;
      default:
        return 0;
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return state.functionalRequirementSortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return state.functionalRequirementSortDirection === 'asc' 
        ? aVal - bVal
        : bVal - aVal;
    }
  });
  
  return sorted;
}

function filterFunctionalRequirements(functionalRequirements) {
  return functionalRequirements.filter(functionalRequirement => {
    // Search filter
    if (state.functionalRequirementSearch) {
      const searchLower = state.functionalRequirementSearch.toLowerCase();
      const matchesSearch = 
        functionalRequirement.title.toLowerCase().includes(searchLower) ||
        (functionalRequirement.description && functionalRequirement.description.toLowerCase().includes(searchLower)) ||
        (functionalRequirement.trackingId && functionalRequirement.trackingId.toLowerCase().includes(searchLower)) ||
        (functionalRequirement.project && functionalRequirement.project.title.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    
    // Project filter
    if (state.functionalRequirementFilterProject && functionalRequirement.projectId !== state.functionalRequirementFilterProject) {
      return false;
    }
    
    return true;
  });
}

function renderFunctionalRequirementsTable(functionalRequirements) {
  const rows = functionalRequirements.map(fr => {
    const project = state.projects.find(p => p.id === fr.projectId);
    const trackingIdDisplay = fr.trackingId
      ? `<strong>${escapeHtml(fr.trackingId)}</strong>`
      : '<span class="text-muted">—</span>';
    const linkedUserReqs = (fr.linkedUserRequirements || []).map(urId => {
      const ur = project ? (project.requirements || []).find(r => r.id === urId) : null;
      return ur;
    }).filter(Boolean);
    
    // Get all tasks linked to this functional requirement
    const allTasks = storage.getAllTasks();
    const linkedTasks = allTasks.filter(t => t.linkedFunctionalRequirement === fr.id);
    
    // Calculate progress from linked tasks
    const progressBarHtml = renderFunctionalRequirementProgressBar(fr, linkedTasks, false);
    
    return `
      <tr class="task-table-row" data-functional-requirement-id="${fr.id}" data-project-id="${fr.projectId}">
        <td>${trackingIdDisplay}</td>
        <td class="task-title-cell">
          <strong>${escapeHtml(fr.title)}</strong>
          ${fr.description ? `<div class="task-description-small">${escapeHtml(fr.description)}</div>` : ''}
        </td>
        <td class="task-project-cell">${escapeHtml(fr.project.title)}</td>
        <td>${linkedUserReqs.length > 0 ? linkedUserReqs.map(ur => `<span class="badge" style="background: var(--gray-100); color: var(--text-primary); border-color: var(--border); margin-right: 0.25rem;">${escapeHtml(ur.title)}</span>`).join('') : '<span class="text-muted">—</span>'}</td>
        <td>${linkedTasks.length}</td>
        <td>
          <div class="milestone-progress">
            ${progressBarHtml}
          </div>
        </td>
        <td class="task-actions-cell">
          <button class="btn btn-blue btn-xs edit-functional-requirement-view" data-functional-requirement-id="${fr.id}" data-project-id="${fr.projectId}">Edit</button>
          <button class="btn btn-red btn-xs delete-functional-requirement-view" data-functional-requirement-id="${fr.id}" data-project-id="${fr.projectId}">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
  
  const getSortIndicator = (column) => {
    if (state.functionalRequirementSortColumn !== column) return '';
    return state.functionalRequirementSortDirection === 'asc' ? ' ↑' : ' ↓';
  };
  
  const getSortClass = (column) => {
    return state.functionalRequirementSortColumn === column ? 'sortable-header sorted' : 'sortable-header';
  };
  
  return `
    <table class="tasks-table">
      <thead>
        <tr>
          <th class="${getSortClass('trackingId')}" data-sort-column="trackingId">Tracking ID${getSortIndicator('trackingId')}</th>
          <th class="${getSortClass('title')}" data-sort-column="title">Functional Requirement${getSortIndicator('title')}</th>
          <th class="${getSortClass('project')}" data-sort-column="project">Project${getSortIndicator('project')}</th>
          <th class="${getSortClass('linkedUserReqs')}" data-sort-column="linkedUserReqs">Linked User Reqs${getSortIndicator('linkedUserReqs')}</th>
          <th class="${getSortClass('linkedTasks')}" data-sort-column="linkedTasks">Linked Tasks${getSortIndicator('linkedTasks')}</th>
          <th>Progress</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderTasks() {
  if (!elements.tasksList) return;
  
  const allTasks = storage.getAllTasks();
  
  // Apply filters
  const filteredTasks = filterTasks(allTasks);
  
  // Apply sorting
  const sortedTasks = sortTasks(filteredTasks);
  
  if (sortedTasks.length === 0) {
    elements.tasksList.innerHTML = `
      <div class="empty-state">
        <p>No tasks found</p>
        <p class="empty-state-sub">${allTasks.length === 0 ? 'Create your first task to get started!' : 'Try adjusting your search or filters.'}</p>
      </div>
    `;
    return;
  }
  
  // Render table
  elements.tasksList.innerHTML = renderTasksTable(sortedTasks);
  
  // Re-attach event listeners
  sortedTasks.forEach(task => {
    attachTaskListenersForView(task);
  });
  
  // Populate filter dropdowns if not already populated
  populateTaskFilters();
  
  // Attach sort listeners
  attachTaskSortListeners();
}

function attachTaskSortListeners() {
  const headers = document.querySelectorAll('#tasks-list .sortable-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const column = header.getAttribute('data-sort-column');
      if (state.taskSortColumn === column) {
        state.taskSortDirection = state.taskSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.taskSortColumn = column;
        state.taskSortDirection = 'asc';
      }
      renderTasks();
    });
  });
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
        (task.assignedResource && task.assignedResource.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (state.taskFilterStatus && task.status !== state.taskFilterStatus) {
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

function sortTasks(tasks) {
  if (!state.taskSortColumn) return tasks;
  
  const sorted = [...tasks].sort((a, b) => {
    let aVal, bVal;
    
    switch (state.taskSortColumn) {
      case 'status':
        const statuses = storage.getStatuses();
        const aStatus = statuses.find(s => s.id === a.status);
        const bStatus = statuses.find(s => s.id === b.status);
        aVal = aStatus?.label || '';
        bVal = bStatus?.label || '';
        break;
      case 'priority':
        const priorities = storage.getPriorities();
        const aPriority = priorities.find(p => p.id === a.priority);
        const bPriority = priorities.find(p => p.id === b.priority);
        aVal = aPriority?.label || '';
        bVal = bPriority?.label || '';
        break;
      case 'title':
        aVal = a.title || '';
        bVal = b.title || '';
        break;
      case 'project':
        aVal = a.project?.title || '';
        bVal = b.project?.title || '';
        break;
      case 'effort':
        const effortLevels = storage.getEffortLevels();
        const aEffort = effortLevels.find(e => e.id === a.effortLevel);
        const bEffort = effortLevels.find(e => e.id === b.effortLevel);
        aVal = aEffort?.label || '';
        bVal = bEffort?.label || '';
        break;
      case 'assigned':
        aVal = a.assignedResource || '';
        bVal = b.assignedResource || '';
        break;
      case 'startDate':
        aVal = a.startDate ? new Date(a.startDate).getTime() : 0;
        bVal = b.startDate ? new Date(b.startDate).getTime() : 0;
        break;
      case 'completedDate':
        aVal = a.completedDate ? new Date(a.completedDate).getTime() : 0;
        bVal = b.completedDate ? new Date(b.completedDate).getTime() : 0;
        break;
      default:
        return 0;
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return state.taskSortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return state.taskSortDirection === 'asc' 
        ? aVal - bVal
        : bVal - aVal;
    }
  });
  
  return sorted;
}

function renderTasksTable(tasks) {
  const statuses = storage.getStatuses();
  const effortLevels = storage.getEffortLevels();
  
  const rows = tasks.map(task => {
    const isEditing = state.editingTasks.has(task.id);
    const isCompleted = task.status === 'completed';
    
    if (isEditing) {
      return renderTaskTableRowEdit(task, statuses, effortLevels);
    }
    
    const status = statuses.find(s => s.id === task.status);
    const statusColorStyle = status?.color ? getStatusSelectStyle(status.color) : '';
    
    const effort = effortLevels.find(e => e.id === task.effortLevel);
    const effortBadgeStyle = effort?.color ? getBadgeStyle(effort.color) : '';
    
    const statusOptions = statuses.map(s => 
      `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
    ).join('');
    
    return `
      <tr class="task-table-row ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}" data-project-id="${task.projectId}" data-milestone-id="${task.milestoneId}">
        <td>
          <select class="task-status-select-view" style="${statusColorStyle}" data-task-id="${task.id}" data-project-id="${task.projectId}" data-milestone-id="${task.milestoneId}">
            ${statusOptions}
          </select>
        </td>
        <td class="task-title-cell">
          <strong>${escapeHtml(task.title)}</strong>
          ${task.description ? `<div class="task-description-small">${escapeHtml(task.description)}</div>` : ''}
        </td>
        <td class="task-project-cell">${escapeHtml(task.project.title)}</td>
        <td>${effort ? `<span class="badge" style="${effortBadgeStyle}">${escapeHtml(effort.label)}</span>` : '<span class="text-muted">—</span>'}</td>
        <td>${task.assignedResource ? escapeHtml(task.assignedResource) : '<span class="text-muted">—</span>'}</td>
        <td class="task-dates-cell">
          ${task.startDate ? `<div class="task-date-small">Started: ${new Date(task.startDate).toLocaleDateString()}</div>` : ''}
          ${task.completedDate ? `<div class="task-date-small">Completed: ${new Date(task.completedDate).toLocaleDateString()}</div>` : ''}
          ${!task.startDate && !task.completedDate ? '<span class="text-muted">—</span>' : ''}
        </td>
        <td class="task-actions-cell">
          <button class="btn btn-blue btn-xs edit-task-view" data-task-id="${task.id}" data-project-id="${task.projectId}" data-milestone-id="${task.milestoneId}">Edit</button>
          <button class="btn btn-red btn-xs delete-task-view" data-task-id="${task.id}" data-project-id="${task.projectId}" data-milestone-id="${task.milestoneId}">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
  
  const getSortIndicator = (column) => {
    if (state.taskSortColumn !== column) return '';
    return state.taskSortDirection === 'asc' ? ' ↑' : ' ↓';
  };
  
  const getSortClass = (column) => {
    return state.taskSortColumn === column ? 'sortable-header sorted' : 'sortable-header';
  };
  
  return `
    <table class="tasks-table">
      <thead>
        <tr>
          <th class="${getSortClass('status')}" data-sort-column="status">Status${getSortIndicator('status')}</th>
          <th class="${getSortClass('title')}" data-sort-column="title">Task${getSortIndicator('title')}</th>
          <th class="${getSortClass('project')}" data-sort-column="project">Project${getSortIndicator('project')}</th>
          <th class="${getSortClass('effort')}" data-sort-column="effort">Effort${getSortIndicator('effort')}</th>
          <th class="${getSortClass('assigned')}" data-sort-column="assigned">Assigned${getSortIndicator('assigned')}</th>
          <th class="${getSortClass('startDate')}" data-sort-column="startDate">Dates${getSortIndicator('startDate')}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderTaskTableRowEdit(task, statuses, effortLevels) {
  const usersList = storage.getUsers();
  
  const statusOptions = statuses.map(s => 
    `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');
  
  const effortOptions = effortLevels.map(e => 
    `<option value="${e.id}" ${task.effortLevel === e.id ? 'selected' : ''}>${escapeHtml(e.label)}</option>`
  ).join('');
  
  const userOptions = usersList.map(u => 
    `<option value="${u.name}" ${task.assignedResource === u.name ? 'selected' : ''}>${escapeHtml(u.name)}</option>`
  ).join('');
  
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
            <select class="edit-effort" data-task-id="${task.id}">
              <option value="">None</option>
              ${effortOptions}
            </select>
            <select class="edit-resource" data-task-id="${task.id}">
              <option value="">None</option>
              ${userOptions}
            </select>
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

function restoreTaskFilterSelect(filterElement, stateKey) {
  if (!filterElement) return;
  const desiredValue = state[stateKey];
  if (!desiredValue) {
    filterElement.value = '';
    return;
  }

  const optionExists = Array.from(filterElement.options).some(option => option.value === desiredValue);
  if (optionExists) {
    filterElement.value = desiredValue;
  } else {
    filterElement.value = '';
    state[stateKey] = '';
  }
}

function populateTaskFilters() {
  const statuses = storage.getStatuses();
  const projects = storage.getAllProjects();
  const users = storage.getUsers();
  
  // Populate status filter
  const statusFilter = document.getElementById('task-filter-status');
  if (statusFilter) {
    // Clear existing options except the first one
    while (statusFilter.options.length > 1) {
      statusFilter.remove(1);
    }
    statuses.forEach(status => {
      const option = document.createElement('option');
      option.value = status.id;
      option.textContent = status.label;
      statusFilter.appendChild(option);
    });
    restoreTaskFilterSelect(statusFilter, 'taskFilterStatus');
  }
  
  // Populate project filter
  const projectFilter = document.getElementById('task-filter-project');
  if (projectFilter) {
    // Clear existing options except the first one
    while (projectFilter.options.length > 1) {
      projectFilter.remove(1);
    }
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.title;
      projectFilter.appendChild(option);
    });
    restoreTaskFilterSelect(projectFilter, 'taskFilterProject');
  }
  
  // Populate resource filter
  const resourceFilter = document.getElementById('task-filter-resource');
  if (resourceFilter) {
    // Clear existing options except the first one
    while (resourceFilter.options.length > 1) {
      resourceFilter.remove(1);
    }
    users.forEach(user => {
      const option = document.createElement('option');
      option.value = user.name;
      option.textContent = user.name;
      resourceFilter.appendChild(option);
    });
    restoreTaskFilterSelect(resourceFilter, 'taskFilterResource');
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
    
    const effortOptions = effortLevels.map(e => 
      `<option value="${e.id}" ${task.effortLevel === e.id ? 'selected' : ''}>${escapeHtml(e.label)}</option>`
    ).join('');
    
    const userOptions = users.map(u => 
      `<option value="${u.name}" ${task.assignedResource === u.name ? 'selected' : ''}>${escapeHtml(u.name)}</option>`
    ).join('');
    
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
        <div class="form-actions">
          <button class="btn btn-primary btn-sm save-task-view" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">Save</button>
          <button class="btn btn-secondary btn-sm cancel-edit-task-view" data-task-id="${task.id}">Cancel</button>
        </div>
      </div>
    `;
  }
  
  const statuses = storage.getStatuses();
  const status = statuses.find(s => s.id === task.status);
  const statusColorStyle = status?.color ? getStatusSelectStyle(status.color) : '';
  
  const statusOptions = statuses.map(s => 
    `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');
  
  return `
    <div class="task-card ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
      <div class="project-card-header">
        <div class="project-card-content" style="flex: 1; min-width: 0;">
          <select class="task-status-select-view" style="${statusColorStyle}" data-task-id="${task.id}" data-project-id="${projectId}" data-milestone-id="${milestoneId}">
            ${statusOptions}
          </select>
          <h4>${escapeHtml(task.title)}</h4>
          <p class="text-muted">Project: ${escapeHtml(task.project.title)}</p>
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
      renderFunctionalRequirements();
      renderRequirements();
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
        const fp = flatpickr(dateInput, {
          dateFormat: 'Y-m-d',
          clickOpens: true,
          allowInput: false,
        });
        // Ensure calendar opens on focus
        dateInput.addEventListener('focus', () => {
          fp.open();
        });
      }
    }, 100);
  });
  
  // Save task
  document.querySelector(`.save-task-view[data-task-id="${taskId}"]`)?.addEventListener('click', () => {
    const title = document.querySelector(`.edit-title[data-task-id="${taskId}"]`).value.trim();
    const description = document.querySelector(`.edit-description[data-task-id="${taskId}"]`).value.trim();
    const status = document.querySelector(`.edit-status[data-task-id="${taskId}"]`).value;
    const effort = document.querySelector(`.edit-effort[data-task-id="${taskId}"]`).value;
    const resource = document.querySelector(`.edit-resource[data-task-id="${taskId}"]`).value;
    
    if (!title) return;
    
    try {
      storage.updateTask(projectId, milestoneId, taskId, {
        title,
        description: description || undefined,
        status,
        effortLevel: effort || undefined,
        assignedResource: resource || undefined,
      });
      state.editingTasks.delete(taskId);
      renderTasks();
      renderFunctionalRequirements();
      renderRequirements();
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
      renderFunctionalRequirements();
      renderRequirements();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task');
    }
  });
}

// Helper functions
function renderMilestoneProgressBar(milestone, includeText = false) {
  const statuses = storage.getStatuses();
  const totalTasks = milestone.tasks ? milestone.tasks.length : 0;
  
  // Count tasks by status
  const statusCounts = {};
  statuses.forEach(status => {
    statusCounts[status.id] = milestone.tasks ? milestone.tasks.filter(t => t.status === status.id || (!t.status && status.id === 'not-started')).length : 0;
  });
  
  // Calculate percentages and build segments
  const segments = [];
  const stats = [];
  
  statuses.forEach(status => {
    const count = statusCounts[status.id] || 0;
    if (count > 0) {
      const percent = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
      segments.push(`<div class="progress-bar-segment" style="width: ${percent}%; background-color: ${status.color};"></div>`);
      stats.push(`${count} ${status.label.toLowerCase()}`);
    }
  });
  
  const statsText = stats.length > 0 ? stats.join(', ') : '0 tasks';
  const completedCount = statusCounts['completed'] || 0;
  const completedPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  
  if (includeText) {
    return `
      <div class="progress-bar-container">
        ${segments.join('')}
      </div>
      <div class="progress-text">
        <span>${statsText}</span>
        <span class="progress-percentage">${completedPercent}%</span>
      </div>
    `;
  } else {
    return `
      <div class="milestone-progress-item">
        <div class="milestone-progress-header">
          <span class="milestone-progress-title">${escapeHtml(milestone.title)}</span>
          <span class="milestone-progress-stats">${statsText}</span>
        </div>
        <div class="progress-bar-container">
          ${segments.join('')}
        </div>
      </div>
    `;
  }
}

function renderUserRequirementProgressBar(userRequirement, linkedTasks, includeText = false) {
  const statuses = storage.getStatuses();
  const totalTasks = linkedTasks ? linkedTasks.length : 0;
  
  // Count tasks by status
  const statusCounts = {};
  statuses.forEach(status => {
    statusCounts[status.id] = linkedTasks ? linkedTasks.filter(t => t.status === status.id || (!t.status && status.id === 'not-started')).length : 0;
  });
  
  // Calculate percentages and build segments
  const segments = [];
  const stats = [];
  
  statuses.forEach(status => {
    const count = statusCounts[status.id] || 0;
    if (count > 0) {
      const percent = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
      segments.push(`<div class="progress-bar-segment" style="width: ${percent}%; background-color: ${status.color};"></div>`);
      stats.push(`${count} ${status.label.toLowerCase()}`);
    }
  });
  
  const statsText = stats.length > 0 ? stats.join(', ') : '0 tasks';
  const completedCount = statusCounts['completed'] || 0;
  const completedPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  
  if (includeText) {
    return `
      <div class="progress-bar-container">
        ${segments.join('')}
      </div>
      <div class="progress-text">
        <span>${statsText}</span>
        <span class="progress-percentage">${completedPercent}%</span>
      </div>
    `;
  } else {
    return `
      <div class="milestone-progress-item">
        <div class="milestone-progress-header">
          <span class="milestone-progress-title">${escapeHtml(userRequirement.title)}</span>
          <span class="milestone-progress-stats">${statsText}</span>
        </div>
        <div class="progress-bar-container">
          ${segments.join('')}
        </div>
      </div>
    `;
  }
}

function renderFunctionalRequirementProgressBar(functionalRequirement, linkedTasks, includeText = false) {
  const statuses = storage.getStatuses();
  const totalTasks = linkedTasks ? linkedTasks.length : 0;
  
  // Count tasks by status
  const statusCounts = {};
  statuses.forEach(status => {
    statusCounts[status.id] = linkedTasks ? linkedTasks.filter(t => t.status === status.id || (!t.status && status.id === 'not-started')).length : 0;
  });
  
  // Calculate percentages and build segments
  const segments = [];
  const stats = [];
  
  statuses.forEach(status => {
    const count = statusCounts[status.id] || 0;
    if (count > 0) {
      const percent = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
      segments.push(`<div class="progress-bar-segment" style="width: ${percent}%; background-color: ${status.color};"></div>`);
      stats.push(`${count} ${status.label.toLowerCase()}`);
    }
  });
  
  const statsText = stats.length > 0 ? stats.join(', ') : '0 tasks';
  const completedCount = statusCounts['completed'] || 0;
  const completedPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  
  if (includeText) {
    return `
      <div class="progress-bar-container">
        ${segments.join('')}
      </div>
      <div class="progress-text">
        <span>${statsText}</span>
        <span class="progress-percentage">${completedPercent}%</span>
      </div>
    `;
  } else {
    return `
      <div class="milestone-progress-item">
        <div class="milestone-progress-header">
          <span class="milestone-progress-title">${escapeHtml(functionalRequirement.title)}</span>
          <span class="milestone-progress-stats">${statsText}</span>
        </div>
        <div class="progress-bar-container">
          ${segments.join('')}
        </div>
      </div>
    `;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getStatusSelectStyle(color) {
  if (!color) return '';
  // Convert hex to rgba with transparency
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `background-color: rgba(${r}, ${g}, ${b}, 0.15); border-color: rgba(${r}, ${g}, ${b}, 0.4); color: ${color};`;
}

function getBadgeStyle(color) {
  if (!color) return '';
  // Convert hex to rgba with transparency
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `background-color: rgba(${r}, ${g}, ${b}, 0.15); border-color: rgba(${r}, ${g}, ${b}, 0.4); color: ${color};`;
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

function populateUserRequirementsSelect(selectId, projectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const project = state.projects.find(p => p.id === projectId);
  if (!project) {
    select.innerHTML = '';
    return;
  }
  
  const requirements = project.requirements || [];
  select.innerHTML = requirements.map(r => 
    `<option value="${r.id}">${escapeHtml(r.title)}</option>`
  ).join('');
}

function populateFunctionalRequirementSelect(selectId, projectId, selectedValue = '') {
  const select = document.getElementById(selectId);
  if (!select) return;

  if (!projectId) {
    select.innerHTML = '<option value="">Select a project first</option>';
    return;
  }

  const project = storage.getProject(projectId);
  if (!project) {
    select.innerHTML = '<option value="">Select a project first</option>';
    return;
  }

  const functionalRequirements = project.functionalRequirements || [];
  if (functionalRequirements.length === 0) {
    select.innerHTML = '<option value="">No functional requirements available</option>';
    return;
  }

  const options = functionalRequirements.map(fr => {
    const trackingLabel = fr.trackingId ? `${escapeHtml(fr.trackingId)} - ` : '';
    return `<option value="${fr.id}" ${selectedValue === fr.id ? 'selected' : ''}>${trackingLabel}${escapeHtml(fr.title)}</option>`;
  }).join('');
  select.innerHTML = '<option value="">Select a functional requirement</option>' + options;
  if (selectedValue) {
    select.value = selectedValue;
  }
}

function getMilestoneIdFromFunctionalRequirement(projectId, functionalRequirementId) {
  if (!projectId || !functionalRequirementId) return '';
  const project = storage.getProject(projectId);
  if (!project) return '';

  const functionalRequirement = (project.functionalRequirements || []).find(fr => fr.id === functionalRequirementId);
  if (!functionalRequirement) return '';

  if (functionalRequirement.milestoneId) {
    return functionalRequirement.milestoneId;
  }

  const requirements = project.requirements || [];
  const linkedRequirements = Array.isArray(functionalRequirement.linkedUserRequirements)
    ? functionalRequirement.linkedUserRequirements
    : [];

  for (const requirementId of linkedRequirements) {
    const requirement = requirements.find(r => r.id === requirementId);
    if (requirement?.milestoneId) {
      return requirement.milestoneId;
    }
  }

  return '';
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
  const taskEffortSelect = document.getElementById('task-effort');
  const taskResourceSelect = document.getElementById('task-resource');
  
  if (taskEffortSelect) populateEffortSelect(taskEffortSelect);
  if (taskResourceSelect) populateUserSelect(taskResourceSelect);
  
  // Update new requirement form selects
  const requirementPrioritySelect = document.getElementById('requirement-priority');
  
  if (requirementPrioritySelect) populatePrioritySelect(requirementPrioritySelect);
  
  // Re-render views to update all dynamic selects
  if (currentView === 'projects') {
    renderProjects();
  } else if (currentView === 'tasks') {
    renderTasks();
    populateTaskFilters();
  } else if (currentView === 'requirements') {
    renderRequirements();
  }
}

// Attach event listeners to project cards
function attachProjectListeners(project) {
  const projectId = project.id;
  
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
    const targetDate = targetDateInput ? (targetDateInput.flatpickr ? targetDateInput.flatpickr.input.value : targetDateInput.value) : '';
    
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
  
}

function attachMilestoneViewListeners(milestone) {
  const milestoneId = milestone.id;
  const projectId = milestone.projectId;
  
  // Edit milestone
  document.querySelector(`.edit-milestone-view[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    openEditMilestoneModal(milestone);
  });
  
  // Delete milestone
  document.querySelector(`.delete-milestone-view[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${milestone.title}"?`)) return;
    
    try {
      storage.deleteMilestone(projectId, milestoneId);
      renderMilestones();
      renderProjects(); // Also update projects view if visible
    } catch (error) {
      console.error('Failed to delete milestone:', error);
      alert('Failed to delete milestone');
    }
  });
}

function populateProjectSelectForMilestone(selectId, selectedProjectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '<option value="">Select a project</option>' +
    state.projects.map(p => `<option value="${p.id}" ${p.id === selectedProjectId ? 'selected' : ''}>${escapeHtml(p.title)}</option>`).join('');
}

function attachRequirementViewListeners(requirement) {
  const requirementId = requirement.id;
  const projectId = requirement.projectId;
  
  // Edit requirement
  document.querySelector(`.edit-requirement-view[data-requirement-id="${requirementId}"]`)?.addEventListener('click', () => {
    openEditRequirementModal(requirement);
  });
  
  // Delete requirement
  document.querySelector(`.delete-requirement-view[data-requirement-id="${requirementId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${requirement.title}"?`)) return;
    
    try {
      storage.deleteRequirement(projectId, requirementId);
      renderRequirements();
      renderProjects(); // Also update projects view if visible
    } catch (error) {
      console.error('Failed to delete requirement:', error);
      alert('Failed to delete requirement');
    }
  });

  // Link requirement to functional requirement
  document.querySelector(`.link-functional-requirement[data-requirement-id="${requirementId}"]`)?.addEventListener('click', () => {
    state.activeRequirementLinkId = state.activeRequirementLinkId === requirementId ? null : requirementId;
    renderRequirements();
  });

  if (state.activeRequirementLinkId === requirementId) {
    attachFunctionalRequirementLinkFormListeners(requirement);
  }
}

function attachFunctionalRequirementLinkFormListeners(requirement) {
  const requirementId = requirement.id;

  document.querySelector(`.link-existing-fr[data-requirement-id="${requirementId}"]`)?.addEventListener('click', () => {
    handleLinkRequirementToExistingFunctionalRequirement(requirement);
  });

  document.querySelector(`.create-fr-and-link[data-requirement-id="${requirementId}"]`)?.addEventListener('click', () => {
    handleCreateFunctionalRequirementFromRequirement(requirement);
  });

  document.querySelectorAll(`.unlink-functional-requirement[data-requirement-id="${requirementId}"]`).forEach(button => {
    button.addEventListener('click', () => {
      const functionalRequirementId = button.getAttribute('data-functional-requirement-id');
      if (!functionalRequirementId) return;
      handleUnlinkFunctionalRequirementFromRequirement(requirement, functionalRequirementId);
    });
  });

  document.querySelector(`.cancel-fr-link[data-requirement-id="${requirementId}"]`)?.addEventListener('click', () => {
    state.activeRequirementLinkId = null;
    renderRequirements();
  });
}

function handleLinkRequirementToExistingFunctionalRequirement(requirement) {
  const select = document.getElementById(`existing-fr-select-${requirement.id}`);
  if (!select) return;
  const functionalRequirementId = select.value;
  if (!functionalRequirementId) {
    alert('Please select a functional requirement to link.');
    return;
  }

  const project = storage.getProject(requirement.projectId);
  const functionalRequirement = project?.functionalRequirements?.find(fr => fr.id === functionalRequirementId);
  if (!functionalRequirement) {
    alert('The selected functional requirement could not be found.');
    return;
  }

  const linkedReqs = new Set(functionalRequirement.linkedUserRequirements || []);
  if (linkedReqs.has(requirement.id)) {
    alert('This user requirement is already linked to the selected functional requirement.');
    return;
  }
  linkedReqs.add(requirement.id);

  try {
    storage.updateFunctionalRequirement(requirement.projectId, functionalRequirementId, {
      linkedUserRequirements: Array.from(linkedReqs),
    });
    refreshProjectsState();
    state.activeRequirementLinkId = requirement.id;
    renderFunctionalRequirements();
    renderRequirements();
  } catch (error) {
    console.error('Failed to link requirement to functional requirement:', error);
    alert('Failed to link to functional requirement');
  }
}

function handleUnlinkFunctionalRequirementFromRequirement(requirement, functionalRequirementId) {
  const project = storage.getProject(requirement.projectId);
  const functionalRequirement = project?.functionalRequirements?.find(fr => fr.id === functionalRequirementId);
  if (!project || !functionalRequirement) {
    alert('The linked FRS could not be found.');
    return;
  }

  const linkedReqs = new Set(functionalRequirement.linkedUserRequirements || []);
  if (!linkedReqs.has(requirement.id)) {
    return;
  }
  linkedReqs.delete(requirement.id);

  try {
    storage.updateFunctionalRequirement(project.id, functionalRequirementId, {
      linkedUserRequirements: Array.from(linkedReqs),
    });
    refreshProjectsState();
    renderFunctionalRequirements();
    renderRequirements();
  } catch (error) {
    console.error('Failed to remove linked FRS:', error);
    alert('Failed to remove linked FRS');
  }
}

function handleCreateFunctionalRequirementFromRequirement(requirement) {
  const titleInput = document.getElementById(`new-fr-title-${requirement.id}`);
  const title = titleInput ? titleInput.value.trim() : '';
  if (!title) {
    alert('Please enter a title for the functional requirement.');
    return;
  }

  const trackingInput = document.getElementById(`new-fr-tracking-${requirement.id}`);
  const descriptionInput = document.getElementById(`new-fr-description-${requirement.id}`);
  const trackingId = trackingInput ? trackingInput.value.trim() : '';
  const description = descriptionInput ? descriptionInput.value.trim() : '';

  try {
    storage.createFunctionalRequirement(requirement.projectId, {
      trackingId: trackingId || undefined,
      title,
      description: description || undefined,
      linkedUserRequirements: [requirement.id],
    });
    refreshProjectsState();
    state.activeRequirementLinkId = requirement.id;
    renderFunctionalRequirements();
    renderRequirements();
  } catch (error) {
    console.error('Failed to create functional requirement from requirement view:', error);
    alert('Failed to create functional requirement');
  }
}

function populateProjectSelectForRequirement(selectId, selectedProjectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '<option value="">Select a project</option>' +
    state.projects.map(p => `<option value="${p.id}" ${p.id === selectedProjectId ? 'selected' : ''}>${escapeHtml(p.title)}</option>`).join('');
}

function populateProjectSelectForFunctionalRequirement(selectId, selectedProjectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '<option value="">Select a project</option>' +
    state.projects.map(p => `<option value="${p.id}" ${p.id === selectedProjectId ? 'selected' : ''}>${escapeHtml(p.title)}</option>`).join('');
}

function attachFunctionalRequirementViewListeners(functionalRequirement) {
  const functionalRequirementId = functionalRequirement.id;
  const projectId = functionalRequirement.projectId;
  
  // Edit functional requirement
  document.querySelector(`.edit-functional-requirement-view[data-functional-requirement-id="${functionalRequirementId}"]`)?.addEventListener('click', () => {
    openEditFunctionalRequirementModal(functionalRequirement);
  });
  
  // Delete functional requirement
  document.querySelector(`.delete-functional-requirement-view[data-functional-requirement-id="${functionalRequirementId}"]`)?.addEventListener('click', () => {
    if (!confirm(`Are you sure you want to delete "${functionalRequirement.title}"?`)) return;
    
    try {
      storage.deleteFunctionalRequirement(projectId, functionalRequirementId);
      renderFunctionalRequirements();
      renderRequirements();
      renderProjects(); // Also update projects view if visible
    } catch (error) {
      console.error('Failed to delete functional requirement:', error);
      alert('Failed to delete functional requirement');
    }
  });
}

function attachMilestoneListeners(projectId, milestone) {
  const milestoneId = milestone.id;
  
  // Edit milestone
  document.querySelector(`.edit-milestone[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    state.editingMilestones.add(milestoneId);
    renderProjects();
    // Initialize date picker for milestone target date after rendering
    setTimeout(() => {
      const targetDateInput = document.querySelector(`.edit-target-date[data-milestone-id="${milestoneId}"]`);
      if (targetDateInput && !targetDateInput.flatpickr) {
        const fp = flatpickr(targetDateInput, {
          dateFormat: 'Y-m-d',
          clickOpens: true,
          allowInput: false,
        });
        // Ensure calendar opens on focus
        targetDateInput.addEventListener('focus', () => {
          fp.open();
        });
      }
    }, 100);
  });
  
  // Save milestone
  document.querySelector(`.save-milestone[data-milestone-id="${milestoneId}"]`)?.addEventListener('click', () => {
    const title = document.querySelector(`.edit-title[data-milestone-id="${milestoneId}"]`).value.trim();
    const description = document.querySelector(`.edit-description[data-milestone-id="${milestoneId}"]`).value.trim();
    const targetDateInput = document.querySelector(`.edit-target-date[data-milestone-id="${milestoneId}"]`);
    const targetDate = targetDateInput ? (targetDateInput.flatpickr ? targetDateInput.flatpickr.input.value : targetDateInput.value) : '';
    
    if (!title) return;
    
    try {
      storage.updateMilestone(projectId, milestoneId, { 
        title, 
        description: description || undefined,
        targetDate: targetDate || undefined
      });
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
    const dueDate = dueDateInput ? (dueDateInput.flatpickr ? dueDateInput.flatpickr.input.value : dueDateInput.value) : '';
    
    if (!title) return;
    
    try {
      storage.createTask(projectId, milestoneId, { 
        title, 
        description: description || undefined,
        dueDate: dueDate || undefined
      });
      state.showAddTask.delete(milestoneId);
      loadProjects();
      renderFunctionalRequirements();
      renderRequirements();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  });
  
  // Initialize date pickers for inline forms after rendering
  setTimeout(() => {
    // Initialize milestone target date picker
    const milestoneDateInput = document.querySelector(`.milestone-target-date-input[data-project-id="${projectId}"]`);
    if (milestoneDateInput && !milestoneDateInput.flatpickr) {
      const fp = flatpickr(milestoneDateInput, {
        dateFormat: 'Y-m-d',
        clickOpens: true,
        allowInput: false,
      });
      milestoneDateInput.addEventListener('focus', () => {
        fp.open();
      });
    }
    
    // Initialize task due date picker
    const taskDateInput = document.querySelector(`.task-due-date-input[data-milestone-id="${milestoneId}"]`);
    if (taskDateInput && !taskDateInput.flatpickr) {
      const fp = flatpickr(taskDateInput, {
        dateFormat: 'Y-m-d',
        clickOpens: true,
        allowInput: false,
      });
      taskDateInput.addEventListener('focus', () => {
        fp.open();
      });
    }
  }, 100);
  
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
      renderFunctionalRequirements();
      renderRequirements();
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
        const fp = flatpickr(dateInput, {
          dateFormat: 'Y-m-d',
          clickOpens: true,
          allowInput: false,
        });
        // Ensure calendar opens on focus
        dateInput.addEventListener('focus', () => {
          fp.open();
        });
      }
    }, 100);
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
    const dueDate = dueDateInput ? (dueDateInput.flatpickr ? dueDateInput.flatpickr.input.value : dueDateInput.value) : '';
    
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
      renderFunctionalRequirements();
      renderRequirements();
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
      renderFunctionalRequirements();
      renderRequirements();
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
      const currentColor = priority.color || '#71717a';
      return `
        <div class="metadata-item-editing" data-priority-id="${priority.id}">
          <input type="text" class="edit-priority-label" value="${escapeHtml(priority.label)}" data-priority-id="${priority.id}" placeholder="Label">
          <div class="form-group">
            <label>Color</label>
            <div class="color-input-group">
              <input type="color" class="edit-priority-color" value="${currentColor}" data-priority-id="${priority.id}">
              <input type="text" class="edit-priority-color-text color-text-input" value="${currentColor}" placeholder="#71717a" data-priority-id="${priority.id}">
            </div>
          </div>
          <div class="metadata-item-editing-actions">
            <button class="btn btn-primary btn-sm save-priority" data-priority-id="${priority.id}">Save</button>
            <button class="btn btn-secondary btn-sm cancel-edit-priority" data-priority-id="${priority.id}">Cancel</button>
          </div>
        </div>
      `;
    }
    
    const colorStyle = priority.color ? `style="background-color: ${priority.color};"` : '';
    return `
      <div class="metadata-item" data-priority-id="${priority.id}">
        <div class="metadata-item-content">
          <span class="metadata-item-color-swatch" ${colorStyle}></span>
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
      const currentColor = status.color || '#71717a';
      return `
        <div class="metadata-item-editing" data-status-id="${status.id}">
          <input type="text" class="edit-status-label" value="${escapeHtml(status.label)}" data-status-id="${status.id}" placeholder="Label">
          <div class="form-group">
            <label>Color</label>
            <div class="color-input-group">
              <input type="color" class="edit-status-color" value="${currentColor}" data-status-id="${status.id}">
              <input type="text" class="edit-status-color-text color-text-input" value="${currentColor}" placeholder="#71717a" data-status-id="${status.id}">
            </div>
          </div>
          <div class="metadata-item-editing-actions">
            <button class="btn btn-primary btn-sm save-status" data-status-id="${status.id}">Save</button>
            <button class="btn btn-secondary btn-sm cancel-edit-status" data-status-id="${status.id}">Cancel</button>
          </div>
        </div>
      `;
    }
    
    const colorStyle = status.color ? `style="background-color: ${status.color};"` : '';
    return `
      <div class="metadata-item" data-status-id="${status.id}">
        <div class="metadata-item-content">
          <span class="metadata-item-color-swatch" ${colorStyle}></span>
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
      const currentColor = effort.color || '#71717a';
      return `
        <div class="metadata-item-editing" data-effort-id="${effort.id}">
          <input type="text" class="edit-effort-label" value="${escapeHtml(effort.label)}" data-effort-id="${effort.id}" placeholder="Label">
          <div class="form-group">
            <label>Color</label>
            <div class="color-input-group">
              <input type="color" class="edit-effort-color" value="${currentColor}" data-effort-id="${effort.id}">
              <input type="text" class="edit-effort-color-text color-text-input" value="${currentColor}" placeholder="#71717a" data-effort-id="${effort.id}">
            </div>
          </div>
          <div class="metadata-item-editing-actions">
            <button class="btn btn-primary btn-sm save-effort" data-effort-id="${effort.id}">Save</button>
            <button class="btn btn-secondary btn-sm cancel-edit-effort" data-effort-id="${effort.id}">Cancel</button>
          </div>
        </div>
      `;
    }
    
    const colorStyle = effort.color ? `style="background-color: ${effort.color};"` : '';
    return `
      <div class="metadata-item" data-effort-id="${effort.id}">
        <div class="metadata-item-content">
          <span class="metadata-item-color-swatch" ${colorStyle}></span>
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
    document.getElementById('priority-color').value = '#71717a';
    document.getElementById('priority-color-text').value = '#71717a';
  });

  document.getElementById('add-priority-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = document.getElementById('priority-label').value.trim();
    const color = document.getElementById('priority-color').value || '#71717a';
    
    if (!label) return;
    
    try {
      storage.addPriority(label, color);
      document.getElementById('priority-label').value = '';
      document.getElementById('priority-color').value = '#71717a';
      document.getElementById('priority-color-text').value = '#71717a';
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
    document.getElementById('status-color').value = '#71717a';
    document.getElementById('status-color-text').value = '#71717a';
  });

  document.getElementById('add-status-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = document.getElementById('status-label').value.trim();
    const color = document.getElementById('status-color').value || '#71717a';
    
    if (!label) return;
    
    try {
      storage.addStatus(label, color);
      document.getElementById('status-label').value = '';
      document.getElementById('status-color').value = '#71717a';
      document.getElementById('status-color-text').value = '#71717a';
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
  
  // Color picker sync for add forms
  // Priority color sync
  document.getElementById('priority-color')?.addEventListener('input', (e) => {
    const textInput = document.getElementById('priority-color-text');
    if (textInput) textInput.value = e.target.value;
  });
  document.getElementById('priority-color-text')?.addEventListener('input', (e) => {
    const colorValue = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
      const colorInput = document.getElementById('priority-color');
      if (colorInput) colorInput.value = colorValue;
    }
  });
  
  // Status color sync
  document.getElementById('status-color')?.addEventListener('input', (e) => {
    const textInput = document.getElementById('status-color-text');
    if (textInput) textInput.value = e.target.value;
  });
  document.getElementById('status-color-text')?.addEventListener('input', (e) => {
    const colorValue = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
      const colorInput = document.getElementById('status-color');
      if (colorInput) colorInput.value = colorValue;
    }
  });
  
  // Effort color sync
  document.getElementById('effort-color')?.addEventListener('input', (e) => {
    const textInput = document.getElementById('effort-color-text');
    if (textInput) textInput.value = e.target.value;
  });
  document.getElementById('effort-color-text')?.addEventListener('input', (e) => {
    const colorValue = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
      const colorInput = document.getElementById('effort-color');
      if (colorInput) colorInput.value = colorValue;
    }
  });

  document.getElementById('cancel-effort-btn')?.addEventListener('click', () => {
    document.getElementById('add-effort-form').style.display = 'none';
    document.getElementById('add-effort-btn').style.display = 'block';
    document.getElementById('effort-label').value = '';
    document.getElementById('effort-color').value = '#71717a';
    document.getElementById('effort-color-text').value = '#71717a';
  });

  document.getElementById('add-effort-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = document.getElementById('effort-label').value.trim();
    const color = document.getElementById('effort-color').value || '#71717a';
    
    if (!label) return;
    
    try {
      storage.addEffortLevel(label, color);
      document.getElementById('effort-label').value = '';
      document.getElementById('effort-color').value = '#71717a';
      document.getElementById('effort-color-text').value = '#71717a';
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
    const colorInput = document.querySelector(`.edit-priority-color[data-priority-id="${priorityId}"]`);
    const color = colorInput ? colorInput.value : (priority.color || '#71717a');
    
    if (!label) return;
    
    try {
      storage.updatePriority(priorityId, { label, color });
      state.editingMetadata.delete(`priority-${priorityId}`);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to update priority:', error);
      alert('Failed to update priority');
    }
  });
  
  // Sync color picker and text input in edit mode
  document.querySelector(`.edit-priority-color[data-priority-id="${priorityId}"]`)?.addEventListener('input', (e) => {
    const textInput = document.querySelector(`.edit-priority-color-text[data-priority-id="${priorityId}"]`);
    if (textInput) textInput.value = e.target.value;
  });
  document.querySelector(`.edit-priority-color-text[data-priority-id="${priorityId}"]`)?.addEventListener('input', (e) => {
    const colorValue = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
      const colorInput = document.querySelector(`.edit-priority-color[data-priority-id="${priorityId}"]`);
      if (colorInput) colorInput.value = colorValue;
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
    const colorInput = document.querySelector(`.edit-status-color[data-status-id="${statusId}"]`);
    const color = colorInput ? colorInput.value : (status.color || '#71717a');
    
    if (!label) return;
    
    try {
      storage.updateStatus(statusId, { label, color });
      state.editingMetadata.delete(`status-${statusId}`);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    }
  });
  
  // Sync color picker and text input in edit mode
  document.querySelector(`.edit-status-color[data-status-id="${statusId}"]`)?.addEventListener('input', (e) => {
    const textInput = document.querySelector(`.edit-status-color-text[data-status-id="${statusId}"]`);
    if (textInput) textInput.value = e.target.value;
  });
  document.querySelector(`.edit-status-color-text[data-status-id="${statusId}"]`)?.addEventListener('input', (e) => {
    const colorValue = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
      const colorInput = document.querySelector(`.edit-status-color[data-status-id="${statusId}"]`);
      if (colorInput) colorInput.value = colorValue;
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
    const colorInput = document.querySelector(`.edit-effort-color[data-effort-id="${effortId}"]`);
    const color = colorInput ? colorInput.value : (effort.color || '#71717a');
    
    if (!label) return;
    
    try {
      storage.updateEffortLevel(effortId, { label, color });
      state.editingMetadata.delete(`effort-${effortId}`);
      renderSettings();
      updateAllSelects();
    } catch (error) {
      console.error('Failed to update effort level:', error);
      alert('Failed to update effort level');
    }
  });
  
  // Sync color picker and text input in edit mode
  document.querySelector(`.edit-effort-color[data-effort-id="${effortId}"]`)?.addEventListener('input', (e) => {
    const textInput = document.querySelector(`.edit-effort-color-text[data-effort-id="${effortId}"]`);
    if (textInput) textInput.value = e.target.value;
  });
  document.querySelector(`.edit-effort-color-text[data-effort-id="${effortId}"]`)?.addEventListener('input', (e) => {
    const colorValue = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
      const colorInput = document.querySelector(`.edit-effort-color[data-effort-id="${effortId}"]`);
      if (colorInput) colorInput.value = colorValue;
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

