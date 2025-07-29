let currentUser = null;

// Check auth state
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        showAdminDashboard();
    } else {
        showLoginForm();
    }
});

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        errorDiv.classList.add('hidden');
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
    }
});

// Create main folder form handler
document.getElementById('createFolderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const folderName = document.getElementById('folderName').value;
    const messageDiv = document.getElementById('folderMessage');
    
    try {
        await db.collection('folders').add({
            name: folderName,
            parentId: null, // This is a main folder
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid
        });
        
        document.getElementById('folderName').value = '';
        messageDiv.textContent = 'Main folder created successfully!';
        messageDiv.className = 'success';
        messageDiv.classList.remove('hidden');
        
        // Reload all folder dropdowns
        await loadFolders();
        await loadParentFolders();
        loadContent();
        
        setTimeout(() => messageDiv.classList.add('hidden'), 3000);
    } catch (error) {
        messageDiv.textContent = error.message;
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
    }
});

// Create subfolder form handler
document.getElementById('createSubfolderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const parentFolderId = document.getElementById('parentFolder').value;
    const subfolderName = document.getElementById('subfolderName').value;
    const messageDiv = document.getElementById('subfolderMessage');
    
    try {
        await db.collection('folders').add({
            name: subfolderName,
            parentId: parentFolderId, // This is a subfolder
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid
        });
        
        document.getElementById('subfolderName').value = '';
        document.getElementById('parentFolder').value = '';
        messageDiv.textContent = 'Subfolder created successfully!';
        messageDiv.className = 'success';
        messageDiv.classList.remove('hidden');
        
        // Reload all folder dropdowns
        await loadFolders();
        await loadParentFolders();
        loadContent();
        
        setTimeout(() => messageDiv.classList.add('hidden'), 3000);
    } catch (error) {
        messageDiv.textContent = error.message;
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
    }
});

// Bulk video upload form handler
document.getElementById('addVideoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const folderId = document.getElementById('videoFolder').value;
    const bulkData = document.getElementById('videoBulkData').value.trim();
    const messageDiv = document.getElementById('videoMessage');
    
    if (!bulkData) {
        messageDiv.textContent = 'Please enter video data in the required format!';
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
        return;
    }
    
    // Parse the bulk data
    const lines = bulkData.split('\n').filter(line => line.trim());
    const videos = [];
    const errors = [];
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;
        
        const parts = trimmedLine.split('|');
        if (parts.length !== 2) {
            errors.push(`Line ${index + 1}: Invalid format. Use "Title | URL"`);
            return;
        }
        
        const title = parts[0].trim();
        const url = parts[1].trim();
        
        if (!title || !url) {
            errors.push(`Line ${index + 1}: Title and URL cannot be empty`);
            return;
        }
        
        // Basic URL validation
        try {
            new URL(url);
            videos.push({ title, url });
        } catch {
            errors.push(`Line ${index + 1}: Invalid URL format`);
        }
    });
    
    if (errors.length > 0) {
        messageDiv.innerHTML = `<strong>Errors found:</strong><br>${errors.join('<br>')}`;
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
        return;
    }
    
    if (videos.length === 0) {
        messageDiv.textContent = 'No valid videos found to upload!';
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
        return;
    }
    
    // Show progress
    messageDiv.innerHTML = `<div class="progress-info">Uploading ${videos.length} videos... Please wait.</div>`;
    messageDiv.className = '';
    messageDiv.classList.remove('hidden');
    
    try {
        // Upload videos in batches to avoid overwhelming Firebase
        let successCount = 0;
        let failCount = 0;
        const failedVideos = [];
        
        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            
            try {
                await db.collection('videos').add({
                    folderId: folderId,
                    title: video.title,
                    url: video.url,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: currentUser.uid
                });
                
                successCount++;
                
                // Update progress
                messageDiv.innerHTML = `<div class="progress-info">Progress: ${i + 1}/${videos.length} videos processed...</div>`;
                
                // Small delay to avoid overwhelming Firebase
                if (i < videos.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
            } catch (error) {
                console.error(`Failed to upload video: ${video.title}`, error);
                failCount++;
                failedVideos.push(video.title);
            }
        }
        
        // Clear form and show results
        document.getElementById('videoBulkData').value = '';
        
        let resultMessage = `<strong>Upload Complete!</strong><br>`;
        resultMessage += `✅ Successfully uploaded: ${successCount} videos<br>`;
        
        if (failCount > 0) {
            resultMessage += `❌ Failed uploads: ${failCount} videos<br>`;
            resultMessage += `<small>Failed videos: ${failedVideos.join(', ')}</small>`;
            messageDiv.className = 'error';
        } else {
            messageDiv.className = 'success';
        }
        
        messageDiv.innerHTML = resultMessage;
        
        loadContent();
        
        setTimeout(() => messageDiv.classList.add('hidden'), 8000);
        
    } catch (error) {
        messageDiv.textContent = 'Error during bulk upload: ' + error.message;
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
    }
});

// Add material form handler
document.getElementById('addMaterialForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const folderId = document.getElementById('materialFolder').value;
    const title = document.getElementById('materialTitle').value;
    const type = document.getElementById('materialType').value;
    const url = document.getElementById('materialUrl').value;
    const messageDiv = document.getElementById('materialMessage');
    
    try {
        await db.collection('materials').add({
            folderId: folderId,
            title: title,
            materialType: type, // Changed from 'type' to 'materialType' to match folder.html
            url: url,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid
        });
        
        document.getElementById('materialTitle').value = '';
        document.getElementById('materialType').value = '';
        document.getElementById('materialUrl').value = '';
        messageDiv.textContent = 'Course material added successfully!';
        messageDiv.className = 'success';
        messageDiv.classList.remove('hidden');
        
        loadContent();
        
        setTimeout(() => messageDiv.classList.add('hidden'), 3000);
    } catch (error) {
        messageDiv.textContent = error.message;
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
    }
});

function showLoginForm() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('adminSection').classList.add('hidden');
}

async function showAdminDashboard() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('adminSection').classList.remove('hidden');
    
    // Load all folder data when dashboard is shown
    await loadFolders();
    await loadParentFolders();
    loadContent();
}

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

// Helper function to get full folder path
function getFolderPath(folderId, folderMap) {
    const folder = folderMap.get(folderId);
    if (!folder) return 'Unknown Folder';
    
    if (!folder.parentId) {
        return folder.name || 'Untitled Folder';
    }
    
    const parentPath = getFolderPath(folder.parentId, folderMap);
    return `${parentPath} / ${folder.name || 'Untitled'}`;
}

// Helper function to render folder options recursively
function renderFolderOptions(folders, folderMap, prefix = '') {
    let options = [];
    
    folders.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    folders.forEach(folder => {
        const displayName = prefix + (folder.name || 'Untitled Folder');
        options.push({ id: folder.id, name: displayName });
        
        // Add children recursively
        if (folder.children && folder.children.length > 0) {
            const childOptions = renderFolderOptions(folder.children, folderMap, prefix + '  ├─ ');
            options = options.concat(childOptions);
        }
    });
    
    return options;
}

async function loadParentFolders() {
    try {
        console.log('Loading parent folders...'); // Debug log
        const foldersSnapshot = await db.collection('folders').get();
        
        const parentFolderSelect = document.getElementById('parentFolder');
        
        console.log('All folders found:', foldersSnapshot.size); // Debug log
        
        // Clear existing options except first one
        parentFolderSelect.innerHTML = '<option value="">Select a parent folder...</option>';
        
        if (foldersSnapshot.empty) {
            console.log('No folders found');
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No folders available - create one first';
            option.disabled = true;
            parentFolderSelect.appendChild(option);
            return;
        }
        
        const folders = [];
        foldersSnapshot.forEach(doc => {
            const folder = doc.data();
            folders.push({ id: doc.id, ...folder });
        });
        
        // Build hierarchy
        const { folderMap, rootFolders } = buildFolderHierarchy(folders);
        
        // Render all folders (including nested ones) as potential parents
        const folderOptions = renderFolderOptions(rootFolders, folderMap);
        
        folderOptions.forEach(option => {
            console.log('Processing parent folder:', option.name); // Debug log
            
            const optionElement = document.createElement('option');
            optionElement.value = option.id;
            optionElement.textContent = option.name;
            parentFolderSelect.appendChild(optionElement);
        });
        
        console.log('Parent folder options:', parentFolderSelect.children.length);
        
    } catch (error) {
        console.error('Error loading parent folders:', error);
        const parentFolderSelect = document.getElementById('parentFolder');
        parentFolderSelect.innerHTML = '<option value="">Error loading folders</option>';
    }
}

async function loadFolders() {
    try {
        console.log('Loading folders...'); // Debug log
        const foldersSnapshot = await db.collection('folders').get();
        
        const videoFolderSelect = document.getElementById('videoFolder');
        const materialFolderSelect = document.getElementById('materialFolder');
        
        console.log('Folders found:', foldersSnapshot.size); // Debug log
        
        // Clear existing options except first one
        videoFolderSelect.innerHTML = '<option value="">Select a folder...</option>';
        materialFolderSelect.innerHTML = '<option value="">Select a folder...</option>';
        
        if (foldersSnapshot.empty) {
            console.log('No folders found');
            return;
        }
        
        const folders = [];
        foldersSnapshot.forEach(doc => {
            const folder = doc.data();
            folders.push({ id: doc.id, ...folder });
        });
        
        // Build hierarchy
        const { folderMap, rootFolders } = buildFolderHierarchy(folders);
        
        // Render all folders with proper hierarchy
        const folderOptions = renderFolderOptions(rootFolders, folderMap);
        
        folderOptions.forEach(option => {
            console.log('Processing folder:', option.name); // Debug log
            
            // Add to video select
            const videoOption = document.createElement('option');
            videoOption.value = option.id;
            videoOption.textContent = option.name;
            videoFolderSelect.appendChild(videoOption);
            
            // Add to material select
            const materialOption = document.createElement('option');
            materialOption.value = option.id;
            materialOption.textContent = option.name;
            materialFolderSelect.appendChild(materialOption);
        });
        
        console.log('Video folder options:', videoFolderSelect.children.length);
        console.log('Material folder options:', materialFolderSelect.children.length);
        
    } catch (error) {
        console.error('Error loading folders:', error);
    }
}

async function loadContent() {
    try {
        const contentDiv = document.getElementById('contentList');
        contentDiv.innerHTML = 'Loading...';
        
        const foldersSnapshot = await db.collection('folders').get();
        
        if (foldersSnapshot.empty) {
            contentDiv.innerHTML = '<div>No folders or content found. Create a folder to get started.</div>';
            return;
        }
        
        const folders = [];
        foldersSnapshot.forEach(doc => {
            const folder = doc.data();
            folders.push({ id: doc.id, ...folder });
        });
        
        // Build hierarchy
        const { folderMap, rootFolders } = buildFolderHierarchy(folders);
        
        let html = '';
        
        // Render folders recursively
        async function renderFoldersRecursively(folderList, level = 0) {
            // Sort folders by name
            folderList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            
            for (const folder of folderList) {
                const indentStyle = `margin-left: ${level * 20}px;`;
                const folderClass = level === 0 ? 'folder-item' : 'folder-item subfolder-item';
                const levelText = level > 0 ? ` <small>(level ${level + 1})</small>` : '';
                
                html += `
                    <div class="${folderClass}" style="${indentStyle}">
                        <strong>📁 ${folder.name || 'Untitled Folder'}</strong>${levelText}
                        <div class="item-actions">
                            <button onclick="deleteFolder('${folder.id}')" class="btn-danger">Delete Folder</button>
                        </div>
                    </div>
                `;
                
                // Load videos for this folder
                const videosSnapshot = await db.collection('videos').where('folderId', '==', folder.id).get();
                videosSnapshot.forEach(videoDoc => {
                    const video = videoDoc.data();
                    const videoIndentStyle = `margin-left: ${(level + 1) * 20}px;`;
                    html += `
                        <div class="video-item" style="${videoIndentStyle}">
                            <strong>▶️ ${video.title || 'Untitled Video'}</strong><br>
                            <small>Video: ${video.url}</small>
                            <div class="item-actions">
                                <button onclick="deleteVideo('${videoDoc.id}')" class="btn-danger">Delete Video</button>
                            </div>
                        </div>
                    `;
                });
                
                // Load materials for this folder
                const materialsSnapshot = await db.collection('materials').where('folderId', '==', folder.id).get();
                materialsSnapshot.forEach(materialDoc => {
                    const material = materialDoc.data();
                    const icon = getFileIcon(material.materialType || material.type);
                    const type = material.materialType || material.type;
                    const materialIndentStyle = `margin-left: ${(level + 1) * 20}px;`;
                    html += `
                        <div class="material-item" style="${materialIndentStyle}">
                            <strong>${icon} ${material.title || 'Untitled Material'}</strong> <span style="color: #666;">(${type ? type.toUpperCase() : 'FILE'})</span><br>
                            <small>URL: ${material.url}</small>
                            <div class="item-actions">
                                <button onclick="deleteMaterial('${materialDoc.id}')" class="btn-danger">Delete Material</button>
                            </div>
                        </div>
                    `;
                });
                
                // Render children recursively
                if (folder.children && folder.children.length > 0) {
                    await renderFoldersRecursively(folder.children, level + 1);
                }
            }
        }
        
        await renderFoldersRecursively(rootFolders);
        
        if (html === '') {
            html = '<div>No folders or content found. Create a folder to get started.</div>';
        }
        
        contentDiv.innerHTML = html;
    } catch (error) {
        console.error('Error loading content:', error);
        document.getElementById('contentList').innerHTML = 'Error loading content';
    }
}

function getFileIcon(materialType) {
    switch (materialType) {
        case 'pdf':
            return '📄';
        case 'tool':
            return '🔧';
        case 'document':
            return '📝';
        case 'spreadsheet':
            return '📊';
        case 'presentation':
            return '📈';
        case 'archive':
            return '📦';
        default:
            return '📄';
    }
}

async function deleteFolder(folderId) {
    if (!confirm('Are you sure you want to delete this folder? This will also delete all subfolders, videos and materials inside it.')) {
        return;
    }
    
    try {
        // Function to recursively delete a folder and all its contents
        async function deleteFolderRecursively(folderIdToDelete) {
            // Delete all videos in this folder
            const videosSnapshot = await db.collection('videos').where('folderId', '==', folderIdToDelete).get();
            const videoDeletePromises = videosSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(videoDeletePromises);
            
            // Delete all materials in this folder
            const materialsSnapshot = await db.collection('materials').where('folderId', '==', folderIdToDelete).get();
            const materialDeletePromises = materialsSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(materialDeletePromises);
            
            // Delete all subfolders and their content recursively
            const subfoldersSnapshot = await db.collection('folders').where('parentId', '==', folderIdToDelete).get();
            for (const subfolderDoc of subfoldersSnapshot.docs) {
                await deleteFolderRecursively(subfolderDoc.id);
            }
            
            // Delete the folder itself
            await db.collection('folders').doc(folderIdToDelete).delete();
        }
        
        await deleteFolderRecursively(folderId);
        
        alert('Folder and all its contents deleted successfully!');
        
        // Reload all data
        await loadFolders();
        await loadParentFolders();
        loadContent();
        
    } catch (error) {
        console.error('Error deleting folder:', error);
        alert('Error deleting folder: ' + error.message);
    }
}

async function deleteVideo(videoId) {
    if (!confirm('Are you sure you want to delete this video?')) {
        return;
    }
    
    try {
        await db.collection('videos').doc(videoId).delete();
        alert('Video deleted successfully!');
        loadContent();
    } catch (error) {
        console.error('Error deleting video:', error);
        alert('Error deleting video: ' + error.message);
    }
}

async function deleteMaterial(materialId) {
    if (!confirm('Are you sure you want to delete this material?')) {
        return;
    }
    
    try {
        await db.collection('materials').doc(materialId).delete();
        alert('Material deleted successfully!');
        loadContent();
    } catch (error) {
        console.error('Error deleting material:', error);
        alert('Error deleting material: ' + error.message);
    }
}

function logout() {
    auth.signOut();
}
