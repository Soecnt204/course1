// Helper function to build folder hierarchy
function buildFolderHierarchy(folders) {
    const folderMap = new Map();
    const rootFolders = [];
    
    // First pass: create folder map
    folders.forEach(folder => {
        folderMap.set(folder.id, { ...folder, children: [] });
    });
    
    // Second pass: build hierarchy
    folders.forEach(folder => {
        if (folder.parentId && folderMap.has(folder.parentId)) {
            folderMap.get(folder.parentId).children.push(folderMap.get(folder.id));
        } else if (!folder.parentId) {
            rootFolders.push(folderMap.get(folder.id));
        }
    });
    
    return { folderMap, rootFolders };
}

// Load and display folders
async function loadFolders() {
    try {
        const foldersSnapshot = await db.collection('folders').orderBy('name').get();
        const allFolders = [];
        
        // Build folder array
        foldersSnapshot.forEach(doc => {
            const folder = { id: doc.id, ...doc.data() };
            allFolders.push(folder);
        });
        
        // Build hierarchy
        const { folderMap, rootFolders } = buildFolderHierarchy(allFolders);
        
        renderFolderList(rootFolders, folderMap);
    } catch (error) {
        console.error('Error loading folders:', error);
        document.getElementById('content').innerHTML = '<div class="loading">Error loading folders</div>';
    }
}

function renderFolderList(rootFolders, folderMap) {
    const content = document.getElementById('content');
    
    if (rootFolders.length === 0) {
        content.innerHTML = '<div class="loading">No folders available</div>';
        return;
    }
    
    let html = `
        <table>
            <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Date Modified</th>
            </tr>
    `;
    
    // Function to render folders recursively
    function renderFoldersRecursively(folders, level = 0) {
        // Sort folders by name
        folders.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        folders.forEach(folder => {
            const date = folder.createdAt ? new Date(folder.createdAt.seconds * 1000).toLocaleString() : '2025-01-15 14:30';
            
            // Create indentation based on level
            let displayName = folder.name + '/';
            let indentStyle = '';
            
            if (level > 0) {
                // Add visual indentation for nested folders
                const indent = '  '.repeat(level) + '├─ ';
                displayName = indent + displayName;
                indentStyle = `style="padding-left: ${level * 20 + 12}px;"`;
            }
            
            html += `
                <tr class="folder-row" data-level="${level}">
                    <td ${indentStyle}><a href="/folder/?id=${folder.id}">📁 ${displayName}</a></td>
                    <td>-</td>
                    <td>${date}</td>
                </tr>
            `;
            
            // Render children recursively
            if (folder.children && folder.children.length > 0) {
                renderFoldersRecursively(folder.children, level + 1);
            }
        });
    }
    
    renderFoldersRecursively(rootFolders);
    
    html += '</table>';
    content.innerHTML = html;
    
    // Add search functionality
    setupSearch();
}

function setupSearch() {
    document.getElementById('searchBox').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('.folder-row');
        
        rows.forEach(row => {
            const folderName = row.querySelector('a').textContent.toLowerCase();
            if (folderName.includes(searchTerm)) {
                row.classList.remove('hidden');
            } else {
                row.classList.add('hidden');
            }
        });
    });
}

// Load folders on page load
document.addEventListener('DOMContentLoaded', loadFolders);