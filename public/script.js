class PortfolioBuilder {
    constructor() {
        this.state = {
            portfolioData: {
                name: '',
                role: '',
                about: '',
                skills: [],
                projects: [],
                image: '',
                github: '',
                linkedin: '',
                theme: 'adventure',
                layout: 'centered',
                font: 'Poppins'
            },
            history: [],
            historyIndex: -1,
            autoSaveTimeout: null,
            previewUpdateTimeout: null
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFromLocalStorage();
        this.setupDragAndDrop();
        this.initializeSections();
        this.updatePreview();
        this.updateHistoryButtons();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e));
        });

        // Action buttons
        document.getElementById('save-btn').addEventListener('click', () => this.saveToLocalStorage());
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());
        document.getElementById('download-btn').addEventListener('click', () => this.downloadPortfolio());
        document.getElementById('host-btn').addEventListener('click', () => this.deployToNetlify());
        document.getElementById('refresh-preview').addEventListener('click', () => this.updatePreview());

        // Auto-save on input changes with debouncing
        document.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea, select')) {
                this.debouncedAutoSave();
                this.debouncedPreviewUpdate();
            }
        });

        // Change events for select elements
        document.addEventListener('change', (e) => {
            if (e.target.matches('select')) {
                this.debouncedAutoSave();
                this.debouncedPreviewUpdate();
            }
        });
    }

    setupDragAndDrop() {
        this.sortable = new Sortable(document.getElementById('sections-container'), {
            handle: '.section-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            animation: 150,
            onEnd: (evt) => {
                this.saveState();
                this.showToast('Sections reordered successfully!', 'success');
            }
        });
    }

    initializeSections() {
        const sections = [
            {
                id: 'basic-info',
                title: '👤 Basic Information',
                template: this.getBasicInfoTemplate()
            },
            {
                id: 'about',
                title: '📝 About Section',
                template: this.getAboutTemplate()
            },
            {
                id: 'skills',
                title: '💡 Skills',
                template: this.getSkillsTemplate()
            },
            {
                id: 'projects',
                title: '🚀 Projects',
                template: this.getProjectsTemplate()
            },
            {
                id: 'design',
                title: '🎨 Design & Layout',
                template: this.getDesignTemplate()
            },
            {
                id: 'social',
                title: '🔗 Social Links',
                template: this.getSocialTemplate()
            }
        ];

        const container = document.getElementById('sections-container');
        container.innerHTML = '';

        sections.forEach(section => {
            const sectionElement = this.createSectionElement(section);
            container.appendChild(sectionElement);
        });

        // Add animation to sections
        setTimeout(() => {
            document.querySelectorAll('.form-section-item').forEach((item, index) => {
                item.style.animationDelay = `${index * 0.1}s`;
                item.classList.add('bounce-in');
            });
        }, 100);
    }

    createSectionElement(section) {
        const template = document.getElementById('section-template');
        const clone = template.content.cloneNode(true);
        const sectionElement = clone.querySelector('.form-section-item');
        
        sectionElement.dataset.section = section.id;
        sectionElement.querySelector('.section-title').textContent = section.title;
        sectionElement.querySelector('.section-content').innerHTML = section.template;
        
        // Add remove button event listener
        sectionElement.querySelector('.btn-remove-section').addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeSection(section.id);
        });

        // Add input event listeners for this section
        this.addSectionEventListeners(sectionElement, section.id);

        return sectionElement;
    }

    addSectionEventListeners(sectionElement, sectionId) {
        const inputs = sectionElement.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            // Set initial values first
            const fieldName = input.name;
            if (this.state.portfolioData[fieldName] !== undefined) {
                if (input.type === 'file') {
                    // Skip file inputs for initial value setting
                } else {
                    input.value = this.state.portfolioData[fieldName];
                }
            }

            // Add event listener
            input.addEventListener('input', (e) => {
                this.updateField(sectionId, e.target.name, e.target.value);
            });
        });

        // Special handling for different sections
        if (sectionId === 'skills') {
            this.setupSkillsEvents(sectionElement);
        } else if (sectionId === 'projects') {
            this.setupProjectsEvents(sectionElement);
        } else if (sectionId === 'basic-info') {
            this.setupImageUpload(sectionElement);
        }
    }

    setupImageUpload(sectionElement) {
        const dropZone = sectionElement.querySelector('.image-drop-zone');
        const fileInput = sectionElement.querySelector('#image-upload');
        const preview = sectionElement.querySelector('.image-preview');
        const removeBtn = sectionElement.querySelector('.remove-image');

        if (!dropZone || !fileInput || !preview || !removeBtn) {
            console.error('Image upload elements not found');
            return;
        }

        dropZone.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageUpload(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageUpload(e.target.files[0]);
            }
        });

        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.state.portfolioData.image = '';
            preview.style.display = 'none';
            dropZone.style.display = 'flex';
            this.saveState();
            this.updatePreview();
        });

        // Show existing image if any
        if (this.state.portfolioData.image) {
            preview.src = this.state.portfolioData.image;
            preview.style.display = 'block';
            dropZone.style.display = 'none';
            removeBtn.style.display = 'block';
        } else {
            preview.style.display = 'none';
            dropZone.style.display = 'flex';
            removeBtn.style.display = 'none';
        }
    }

    async handleImageUpload(file) {
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showToast('Image size should be less than 5MB', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.state.portfolioData.image = result.imageUrl;
                
                // Update UI
                const preview = document.querySelector('.image-preview');
                const dropZone = document.querySelector('.image-drop-zone');
                const removeBtn = document.querySelector('.remove-image');
                
                if (preview && dropZone && removeBtn) {
                    preview.src = result.imageUrl;
                    preview.style.display = 'block';
                    dropZone.style.display = 'none';
                    removeBtn.style.display = 'block';
                }
                
                this.saveState();
                this.updatePreview();
                this.showToast('Image uploaded successfully!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Image upload error:', error);
            this.showToast('Failed to upload image', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    setupSkillsEvents(sectionElement) {
        const addBtn = sectionElement.querySelector('#add-skill');
        const input = sectionElement.querySelector('#skill-input');
        const container = sectionElement.querySelector('#skills-container');

        if (!addBtn || !input || !container) return;

        addBtn.addEventListener('click', () => this.addSkill(input, container));
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addSkill(input, container);
        });

        this.renderSkills(container);
    }

    setupProjectsEvents(sectionElement) {
        const addBtn = sectionElement.querySelector('#add-project');
        const titleInput = sectionElement.querySelector('#project-title');
        const linkInput = sectionElement.querySelector('#project-link');
        const container = sectionElement.querySelector('#projects-container');

        if (!addBtn || !titleInput || !linkInput || !container) return;

        addBtn.addEventListener('click', () => this.addProject(titleInput, linkInput, container));
        
        this.renderProjects(container);
    }

    addSkill(input, container) {
        const skill = input.value.trim();
        if (skill && !this.state.portfolioData.skills.includes(skill)) {
            this.state.portfolioData.skills.push(skill);
            this.renderSkills(container);
            input.value = '';
            this.saveState();
            this.debouncedPreviewUpdate();
        }
    }

    removeSkill(index) {
        this.state.portfolioData.skills.splice(index, 1);
        this.renderSkills(document.querySelector('#skills-container'));
        this.saveState();
        this.debouncedPreviewUpdate();
    }

    renderSkills(container) {
        if (!container) return;
        
        container.innerHTML = '';
        this.state.portfolioData.skills.forEach((skill, index) => {
            const skillElement = document.createElement('div');
            skillElement.className = 'skill-tag';
            skillElement.innerHTML = `
                ${skill}
                <button class="btn-icon" onclick="portfolioBuilder.removeSkill(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(skillElement);
        });
    }

    addProject(titleInput, linkInput, container) {
        const title = titleInput.value.trim();
        const link = linkInput.value.trim();

        if (title && link) {
            this.state.portfolioData.projects.push({ title, link });
            this.renderProjects(container);
            titleInput.value = '';
            linkInput.value = '';
            this.saveState();
            this.debouncedPreviewUpdate();
        }
    }

    removeProject(index) {
        this.state.portfolioData.projects.splice(index, 1);
        this.renderProjects(document.querySelector('#projects-container'));
        this.saveState();
        this.debouncedPreviewUpdate();
    }

    renderProjects(container) {
        if (!container) return;
        
        container.innerHTML = '';
        this.state.portfolioData.projects.forEach((project, index) => {
            const projectElement = document.createElement('div');
            projectElement.className = 'project-tag';
            projectElement.innerHTML = `
                <strong>${project.title}</strong>
                <button class="btn-icon" onclick="portfolioBuilder.removeProject(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(projectElement);
        });
    }

    updateField(section, field, value) {
        this.state.portfolioData[field] = value;
        this.debouncedAutoSave();
    }

    debouncedAutoSave() {
        clearTimeout(this.state.autoSaveTimeout);
        this.state.autoSaveTimeout = setTimeout(() => {
            this.saveState();
        }, 1000);
    }

    debouncedPreviewUpdate() {
        clearTimeout(this.state.previewUpdateTimeout);
        this.state.previewUpdateTimeout = setTimeout(() => {
            this.updatePreview();
        }, 500);
    }

    saveState() {
        // Add to history
        this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
        this.state.history.push(JSON.parse(JSON.stringify(this.state.portfolioData)));
        this.state.historyIndex++;
        
        this.updateHistoryButtons();
        this.saveToLocalStorage();
    }

    undo() {
        if (this.state.historyIndex > 0) {
            this.state.historyIndex--;
            this.state.portfolioData = JSON.parse(JSON.stringify(this.state.history[this.state.historyIndex]));
            this.updateForm();
            this.updatePreview();
            this.updateHistoryButtons();
            this.showToast('Undo successful', 'success');
        }
    }

    redo() {
        if (this.state.historyIndex < this.state.history.length - 1) {
            this.state.historyIndex++;
            this.state.portfolioData = JSON.parse(JSON.stringify(this.state.history[this.state.historyIndex]));
            this.updateForm();
            this.updatePreview();
            this.updateHistoryButtons();
            this.showToast('Redo successful', 'success');
        }
    }

    updateHistoryButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn && redoBtn) {
            undoBtn.disabled = this.state.historyIndex <= 0;
            redoBtn.disabled = this.state.historyIndex >= this.state.history.length - 1;
        }
    }

    updateForm() {
        // Update all form fields with current data
        Object.keys(this.state.portfolioData).forEach(key => {
            const element = document.querySelector(`[name="${key}"]`);
            if (element && element.type !== 'file') {
                element.value = this.state.portfolioData[key];
            }
        });

        // Update skills and projects
        this.renderSkills(document.querySelector('#skills-container'));
        this.renderProjects(document.querySelector('#projects-container'));

        // Update image preview
        if (this.state.portfolioData.image) {
            const preview = document.querySelector('.image-preview');
            const dropZone = document.querySelector('.image-drop-zone');
            const removeBtn = document.querySelector('.remove-image');
            
            if (preview && dropZone && removeBtn) {
                preview.src = this.state.portfolioData.image;
                preview.style.display = 'block';
                dropZone.style.display = 'none';
                removeBtn.style.display = 'block';
            }
        }
    }

    switchTab(e) {
        const tab = e.currentTarget;
        const tabId = tab.dataset.tab;

        // Update active tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        this.showToast(`Switched to ${tab.textContent.trim()}`, 'success');
    }

    removeSection(sectionId) {
        const section = document.querySelector(`[data-section="${sectionId}"]`);
        if (section) {
            section.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                section.remove();
                this.showToast('Section removed', 'warning');
            }, 300);
        }
    }

    updatePreview() {
        const previewFrame = document.getElementById('portfolio-preview');
        if (!previewFrame) return;
        
        const template = this.generatePortfolioTemplate();
        
        // Use a small delay to prevent blinking
        setTimeout(() => {
            previewFrame.srcdoc = template;
        }, 50);
    }

    generatePortfolioTemplate() {
        const data = this.state.portfolioData;
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.name || 'My Portfolio'}</title>
    <style>
        ${this.getPortfolioStyles()}
    </style>
    <link href="https://fonts.googleapis.com/css2?family=${data.font || 'Poppins'}:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    ${this.getPortfolioHTML()}
</body>
</html>`;
    }

    getPortfolioStyles() {
        const data = this.state.portfolioData;
        
        return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: '${data.font}', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
            min-height: 100vh;
            padding: 20px;
        }
        
        .portfolio-container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            text-align: center;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 3rem 2rem;
        }
        
        .profile-img {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            object-fit: cover;
            border: 5px solid white;
            margin-bottom: 1rem;
        }
        
        h1 {
            font-size: 3rem;
            margin-bottom: 0.5rem;
        }
        
        .role {
            font-size: 1.5rem;
            opacity: 0.9;
            margin-bottom: 1rem;
        }
        
        .section {
            background: white;
            padding: 2rem;
            margin: 2rem;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .skills-container, .projects-container {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .skill, .project {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            text-decoration: none;
        }
        
        .social-links {
            display: flex;
            justify-content: center;
            gap: 2rem;
            margin-top: 1rem;
        }
        
        .social-link {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
            padding: 0.5rem 1rem;
            border: 2px solid #667eea;
            border-radius: 25px;
            transition: all 0.3s ease;
        }
        
        .social-link:hover {
            background: #667eea;
            color: white;
        }
        
        h2 {
            color: #667eea;
            margin-bottom: 1rem;
            border-bottom: 3px solid #764ba2;
            padding-bottom: 0.5rem;
        }
        `;
    }

    getPortfolioHTML() {
        const data = this.state.portfolioData;
        
        return `
        <div class="portfolio-container">
            <div class="header">
                <img src="${data.image || 'https://via.placeholder.com/150'}" alt="${data.name}" class="profile-img">
                <h1>${data.name || 'Your Name'}</h1>
                <p class="role">${data.role || 'Your Role'}</p>
            </div>
            
            <div class="section about">
                <h2>About Me</h2>
                <p>${data.about || 'Tell us about yourself...'}</p>
            </div>
            
            <div class="section skills">
                <h2>Skills</h2>
                <div class="skills-container">
                    ${data.skills.map(skill => `<span class="skill">${skill}</span>`).join('')}
                </div>
            </div>
            
            <div class="section projects">
                <h2>Projects</h2>
                <div class="projects-container">
                    ${data.projects.map(project => 
                        `<a href="${project.link}" class="project" target="_blank">${project.title}</a>`
                    ).join('')}
                </div>
            </div>
            
            <div class="section contact">
                <h2>Connect With Me</h2>
                <div class="social-links">
                    ${data.github ? `<a href="${data.github}" class="social-link" target="_blank">GitHub</a>` : ''}
                    ${data.linkedin ? `<a href="${data.linkedin}" class="social-link" target="_blank">LinkedIn</a>` : ''}
                </div>
            </div>
        </div>`;
    }

    async downloadPortfolio() {
        this.showLoading(true);
        
        try {
            const template = this.generatePortfolioTemplate();
            const blob = new Blob([template], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'portfolio.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('Portfolio downloaded successfully!', 'success');
        } catch (error) {
            this.showToast('Error downloading portfolio', 'error');
            console.error('Download error:', error);
        } finally {
            this.showLoading(false);
        }
    }

async deployToNetlify() {
    // Show confirmation dialog
    const confirmed = confirm(`🚀 Ready to deploy your portfolio?\n\nYour portfolio will be publicly accessible at a unique Netlify URL.\n\nThis may take 10-30 seconds. Continue?`);
    
    if (!confirmed) return;

    this.showLoading(true);
    
    try {
        const response = await fetch('/deploy-to-netlify', {  // CHANGED THIS LINE
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(this.state.portfolioData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            this.showToast('🎉 Portfolio deployed successfully!', 'success');
            
            // Show success message with URL
            setTimeout(() => {
                const openSite = confirm(`✅ Your portfolio is now live!\n\nURL: ${result.url}\n\nClick OK to open your live portfolio, or Cancel to stay here.`);
                if (openSite) {
                    window.open(result.url, '_blank');
                }
            }, 1000);
            
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Deployment error:', error);
        this.showToast('Error deploying portfolio: ' + error.message, 'error');
    } finally {
        this.showLoading(false);
    }
}

    saveToLocalStorage() {
        try {
            localStorage.setItem('portfolioBuilderData', JSON.stringify({
                portfolioData: this.state.portfolioData,
                history: this.state.history,
                historyIndex: this.state.historyIndex
            }));
            this.showToast('Auto-saved successfully!', 'success');
        } catch (error) {
            console.error('Save error:', error);
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('portfolioBuilderData');
            if (saved) {
                const data = JSON.parse(saved);
                this.state.portfolioData = data.portfolioData || this.state.portfolioData;
                this.state.history = data.history || [];
                this.state.historyIndex = data.historyIndex || -1;
                
                this.updateForm();
                this.showToast('Previous work loaded successfully!', 'success');
            }
        } catch (error) {
            console.error('Load error:', error);
        }
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle'
        };
        return icons[type] || 'info-circle';
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.toggle('show', show);
        }
    }

    // Template methods
    getBasicInfoTemplate() {
        return `
            <div class="form-group">
                <label for="name">Full Name</label>
                <input type="text" id="name" name="name" placeholder="Enter your full name" value="${this.state.portfolioData.name}">
            </div>
            
            <div class="form-group">
                <label for="role">Role / Job Title</label>
                <input type="text" id="role" name="role" placeholder="e.g., Frontend Developer" value="${this.state.portfolioData.role}">
            </div>
            
            <div class="form-group">
                <label>Profile Image</label>
                <div class="image-upload-container">
                    <input type="file" id="image-upload" accept="image/*" style="display: none;">
                    <div class="image-drop-zone">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Click to upload or drag & drop</p>
                        <small>PNG, JPG up to 5MB</small>
                    </div>
                    <img class="image-preview" style="display: none;">
                    <button class="btn btn-secondary remove-image" style="display: none;">
                        <i class="fas fa-trash"></i> Remove Image
                    </button>
                </div>
            </div>
        `;
    }

    getAboutTemplate() {
        return `
            <div class="form-group">
                <label for="about">About You</label>
                <textarea id="about" name="about" placeholder="Tell us about yourself, your passions, and your journey...">${this.state.portfolioData.about}</textarea>
            </div>
        `;
    }

    getSkillsTemplate() {
        return `
            <div class="form-group">
                <label>Add Skills</label>
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <input type="text" id="skill-input" placeholder="Enter a skill">
                    <button class="btn btn-primary btn-small" id="add-skill">Add</button>
                </div>
                <div id="skills-container" class="skills-container"></div>
            </div>
        `;
    }

    getProjectsTemplate() {
        return `
            <div class="form-group">
                <label>Add Projects</label>
                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px;">
                    <input type="text" id="project-title" placeholder="Project title">
                    <input type="text" id="project-link" placeholder="Project URL">
                    <button class="btn btn-primary btn-small" id="add-project">Add Project</button>
                </div>
                <div id="projects-container" class="projects-container"></div>
            </div>
        `;
    }

    getDesignTemplate() {
        return `
            <div class="form-group">
                <label for="theme">Color Theme</label>
                <select id="theme" name="theme">
                    <option value="adventure" ${this.state.portfolioData.theme === 'adventure' ? 'selected' : ''}>Adventure</option>
                    <option value="modern" ${this.state.portfolioData.theme === 'modern' ? 'selected' : ''}>Modern</option>
                    <option value="professional" ${this.state.portfolioData.theme === 'professional' ? 'selected' : ''}>Professional</option>
                    <option value="creative" ${this.state.portfolioData.theme === 'creative' ? 'selected' : ''}>Creative</option>
                    <option value="dark" ${this.state.portfolioData.theme === 'dark' ? 'selected' : ''}>Dark</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="layout">Layout Style</label>
                <select id="layout" name="layout">
                    <option value="centered" ${this.state.portfolioData.layout === 'centered' ? 'selected' : ''}>Centered</option>
                    <option value="sidebar" ${this.state.portfolioData.layout === 'sidebar' ? 'selected' : ''}>Sidebar</option>
                    <option value="minimal" ${this.state.portfolioData.layout === 'minimal' ? 'selected' : ''}>Minimal</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="font">Font Family</label>
                <select id="font" name="font">
                    <option value="Poppins" ${this.state.portfolioData.font === 'Poppins' ? 'selected' : ''}>Poppins</option>
                    <option value="Arial" ${this.state.portfolioData.font === 'Arial' ? 'selected' : ''}>Arial</option>
                    <option value="Georgia" ${this.state.portfolioData.font === 'Georgia' ? 'selected' : ''}>Georgia</option>
                    <option value="Montserrat" ${this.state.portfolioData.font === 'Montserrat' ? 'selected' : ''}>Montserrat</option>
                    <option value="Roboto" ${this.state.portfolioData.font === 'Roboto' ? 'selected' : ''}>Roboto</option>
                </select>
            </div>
        `;
    }

    getSocialTemplate() {
        return `
            <div class="form-group">
                <label for="github">GitHub Profile</label>
                <input type="text" id="github" name="github" placeholder="https://github.com/yourusername" value="${this.state.portfolioData.github}">
            </div>
            <div class="form-group">
                <label for="linkedin">LinkedIn Profile</label>
                <input type="text" id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/yourprofile" value="${this.state.portfolioData.linkedin}">
            </div>
        `;
    }
}

// Initialize the portfolio builder when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.portfolioBuilder = new PortfolioBuilder();
});