const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to generate portfolio
app.post('/generate-portfolio', async (req, res) => {
    try {
        const portfolioData = req.body;
        
        // Generate HTML content
        const htmlContent = generatePortfolioHTML(portfolioData);
        
        // Save to public directory
        const outputPath = path.join(__dirname, 'public', 'portfolio.html');
        fs.writeFileSync(outputPath, htmlContent);
        
        // Also save to dist folder for deployment
        const distPath = path.join(__dirname, 'dist', 'portfolio.html');
        if (!fs.existsSync(path.dirname(distPath))) {
            fs.mkdirSync(path.dirname(distPath), { recursive: true });
        }
        fs.writeFileSync(distPath, htmlContent);
        
        // Save portfolio data as JSON
        const dataPath = path.join(__dirname, 'portfolio-data.json');
        fs.writeFileSync(dataPath, JSON.stringify(portfolioData, null, 2));
        
        res.json({ 
            success: true, 
            message: 'Portfolio generated successfully!',
            portfolioUrl: `${req.protocol}://${req.get('host')}/portfolio.html`
        });
        
    } catch (error) {
        console.error('Error generating portfolio:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error generating portfolio: ' + error.message 
        });
    }
});

// Deploy to Netlify endpoint (CLI BASED – FIXED)
app.post('/deploy-to-netlify', async (req, res) => {
    try {
        console.log('🚀 Starting Netlify deployment...');

        const token = process.env.NETLIFY_TOKEN;
        if (!token) {
            throw new Error('NETLIFY_TOKEN not set in Render environment');
        }

        const distDir = path.join(__dirname, 'dist');

        if (!fs.existsSync(distDir)) {
            throw new Error('dist folder not found. Generate portfolio first.');
        }

        // IMPORTANT: single-line command (Render/Linux safe)
        const command = `npx netlify deploy --dir="${distDir}" --prod --site=adventure-portfolio-builder --auth="${token}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Netlify CLI Error:', stderr || error.message);
                return res.status(500).json({
                    success: false,
                    message: stderr || error.message
                });
            }

            console.log('✅ Deployment Success');
            console.log(stdout);

            res.json({
                success: true,
                message: 'Portfolio deployed successfully!',
                output: stdout
            });
        });

    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Function to generate portfolio HTML
function generatePortfolioHTML(data) {
    const skillsList = data.skills ? data.skills.map(skill => 
        `<li>${skill}</li>`
    ).join('') : '';

    const projectsList = data.projects ? data.projects.map(project => `
        <div class="project-card">
            <h3>${project.name || 'Project Name'}</h3>
            <p>${project.description || 'Project description'}</p>
            ${project.link ? `<a href="${project.link}" target="_blank">View Project</a>` : ''}
        </div>
    `).join('') : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.name || 'My Portfolio'} - Adventure Portfolio</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .portfolio-header {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        .profile-image {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            object-fit: cover;
            border: 5px solid #667eea;
            margin-bottom: 20px;
        }
        
        h1 {
            color: #333;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .tagline {
            color: #666;
            font-size: 1.2em;
            margin-bottom: 20px;
        }
        
        .bio {
            color: #555;
            font-size: 1.1em;
            line-height: 1.8;
            margin-bottom: 30px;
        }
        
        .contact-info {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
            margin-bottom: 30px;
        }
        
        .contact-item {
            background: #667eea;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            text-decoration: none;
            transition: transform 0.3s ease;
        }
        
        .contact-item:hover {
            transform: translateY(-3px);
        }
        
        .section {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        
        .section h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        
        .skills-list {
            list-style: none;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .skills-list li {
            background: #667eea;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9em;
        }
        
        .projects-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .project-card {
            background: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            border-left: 4px solid #667eea;
        }
        
        .project-card h3 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .project-card a {
            color: #667eea;
            text-decoration: none;
            font-weight: bold;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .portfolio-header {
                padding: 20px;
            }
            
            h1 {
                font-size: 2em;
            }
            
            .contact-info {
                flex-direction: column;
                align-items: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="portfolio-header">
            ${data.profileImage ? `<img src="${data.profileImage}" alt="${data.name}" class="profile-image">` : ''}
            <h1>${data.name || 'Your Name'}</h1>
            <p class="tagline">${data.tagline || 'Your Professional Tagline'}</p>
            <p class="bio">${data.bio || 'Tell your story here...'}</p>
            
            <div class="contact-info">
                ${data.email ? `<a href="mailto:${data.email}" class="contact-item">Email</a>` : ''}
                ${data.phone ? `<a href="tel:${data.phone}" class="contact-item">Phone</a>` : ''}
                ${data.linkedin ? `<a href="${data.linkedin}" target="_blank" class="contact-item">LinkedIn</a>` : ''}
                ${data.github ? `<a href="${data.github}" target="_blank" class="contact-item">GitHub</a>` : ''}
            </div>
        </header>
        
        ${skillsList ? `
        <section class="section">
            <h2>Skills & Expertise</h2>
            <ul class="skills-list">
                ${skillsList}
            </ul>
        </section>
        ` : ''}
        
        ${projectsList ? `
        <section class="section">
            <h2>Projects</h2>
            <div class="projects-grid">
                ${projectsList}
            </div>
        </section>
        ` : ''}
    </div>
</body>
</html>`;
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Adventure Portfolio Builder server running on port ${PORT}`);
    console.log(`📱 Access the application at: http://localhost:${PORT}`);
    console.log(`🌐 REAL Netlify deployment enabled!`);
    
    // Check if Netlify token is available
    const netlifyToken = process.env.NETLIFY_TOKEN;
    if (!netlifyToken) {
        console.warn('\n⚠️  WARNING: Netlify token not found!');
        console.log('To enable Netlify deployments, set the NETLIFY_TOKEN environment variable.');
        console.log('Get your token from: https://app.netlify.com/user/applications\n');
    } else {
        console.log('✅ Netlify token detected - Deployment ready!\n');
    }
});
